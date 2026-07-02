import {
  ProjectLifecycleStatus,
  ProjectTaskStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import { PrismaProjectRepository } from "./project-repository";
import type {
  DeliverableInput,
  DeliverableReviewInput,
  MilestoneInput,
  MilestoneUpdateInput,
  ProjectAttachmentInput,
  ProjectCreateInput,
  ProjectStatusInput,
  ProjectUpdateInput,
  TaskInput,
  TaskUpdateInput,
} from "./schemas";
import type { ProjectDashboard, ProjectSearchResult, ProjectSummary, ProjectWorkspace } from "./types";

type ActorContext = { tenantId: string; userId: string };
type ProjectRecord = Awaited<ReturnType<PrismaProjectRepository["list"]>>[number];
type ProjectFullRecord = NonNullable<Awaited<ReturnType<PrismaProjectRepository["findById"]>>>;

const lifecycleTransitions: Record<ProjectLifecycleStatus, ProjectLifecycleStatus[]> = {
  [ProjectLifecycleStatus.PLANNING]: [ProjectLifecycleStatus.ACTIVE, ProjectLifecycleStatus.ARCHIVED],
  [ProjectLifecycleStatus.ACTIVE]: [ProjectLifecycleStatus.BLOCKED, ProjectLifecycleStatus.REVIEW, ProjectLifecycleStatus.COMPLETED, ProjectLifecycleStatus.ARCHIVED],
  [ProjectLifecycleStatus.BLOCKED]: [ProjectLifecycleStatus.ACTIVE, ProjectLifecycleStatus.ARCHIVED],
  [ProjectLifecycleStatus.REVIEW]: [ProjectLifecycleStatus.ACTIVE, ProjectLifecycleStatus.COMPLETED, ProjectLifecycleStatus.ARCHIVED],
  [ProjectLifecycleStatus.COMPLETED]: [ProjectLifecycleStatus.ARCHIVED],
  [ProjectLifecycleStatus.ARCHIVED]: [],
};

export class ProjectService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaProjectRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaProjectRepository(prisma);
  }

  async list(context: ActorContext) {
    await this.enforce(context, "projects.read");
    return (await this.repository.list(context.tenantId)).map(toProjectSummary);
  }

  async get(context: ActorContext, projectId: string): Promise<ProjectWorkspace> {
    await this.enforce(context, "projects.read");
    const project = await this.getOrThrow(context.tenantId, projectId);
    const metrics = this.projectMetrics(project);
    return {
      ...toProjectSummary(project),
      calendar: project.calendar as Record<string, unknown>,
      deliverables: project.deliverables.map((deliverable) => ({
        id: deliverable.id,
        requirementId: deliverable.requirementId,
        requirementVersion: deliverable.requirementVersion,
        reviewStatus: deliverable.reviewStatus,
        title: deliverable.title,
      })),
      gantt: {
        dependencies: project.milestones.flatMap((milestone) =>
          Array.isArray(milestone.dependencies)
            ? (milestone.dependencies as string[]).map((dependency) => ({ from: dependency, to: milestone.id }))
            : [],
        ),
        items: [
          ...project.milestones.map((milestone) => ({ end: milestone.dueAt, id: milestone.id, start: null, title: milestone.name, type: "milestone" })),
          ...project.tasks.map((task) => ({ end: task.dueAt, id: task.id, start: null, title: task.title, type: "task" })),
        ],
      },
      metrics,
      milestones: project.milestones.map((milestone) => ({
        dueAt: milestone.dueAt,
        id: milestone.id,
        name: milestone.name,
        progress: milestone.progress,
        status: milestone.status,
      })),
      tasks: project.tasks.map((task) => ({
        assigneeId: task.assigneeId,
        dueAt: task.dueAt,
        id: task.id,
        parentId: task.parentId,
        priority: task.priority,
        status: task.status,
        title: task.title,
      })),
      timeline: project.timeline.map((event) => ({
        id: event.id,
        occurredAt: event.occurredAt,
        summary: event.summary,
        verb: event.verb,
      })),
    };
  }

  async dashboard(context: ActorContext): Promise<ProjectDashboard> {
    await this.enforce(context, "projects.read");
    const [progress, milestones, tasks, overdue, upcoming, activity, files, team] =
      await this.repository.dashboard(context.tenantId);
    return {
      activity,
      files,
      milestones,
      overdue,
      progress: Math.round(progress._avg.progress ?? 0),
      tasks,
      team: team.length,
      upcoming,
    };
  }

  async create(context: ActorContext, input: ProjectCreateInput) {
    await this.enforce(context, "projects.manage");
    return this.repository.create({
      actorId: context.userId,
      data: stripUndefined({
        clientId: input.clientId,
        description: input.description,
        managerId: input.managerId ?? context.userId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        name: input.name,
        priority: input.priority,
        slug: await this.uniqueSlug(context.tenantId, input.name),
        startDate: input.startDate,
        targetDate: input.targetDate,
        tenantId: context.tenantId,
      }) as Prisma.ProjectUncheckedCreateInput,
    });
  }

  async update(context: ActorContext, projectId: string, input: ProjectUpdateInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.update({
      actorId: context.userId,
      data: stripUndefined({
        clientId: input.clientId,
        description: input.description,
        managerId: input.managerId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        name: input.name,
        priority: input.priority,
        progress: input.progress,
        startDate: input.startDate,
        targetDate: input.targetDate,
      }) as Prisma.ProjectUncheckedUpdateInput,
      projectId,
      tenantId: context.tenantId,
    });
  }

  async transitionStatus(context: ActorContext, projectId: string, input: ProjectStatusInput) {
    const project = await this.ensureAccess(context, projectId, "projects.manage");
    this.assertLifecycleTransition(project.status, input.status);
    return this.repository.transitionStatus({
      actorId: context.userId,
      projectId,
      status: input.status,
      tenantId: context.tenantId,
      ...(input.reason ? { reason: input.reason } : {}),
    });
  }

  async createMilestone(context: ActorContext, projectId: string, input: MilestoneInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.createMilestone({
      actorId: context.userId,
      data: stripUndefined({
        dependencies: (input.dependencies ?? []) as Prisma.InputJsonValue,
        description: input.description,
        dueAt: input.dueAt,
        name: input.name,
        progress: input.progress ?? 0,
        projectId,
        sortOrder: input.sortOrder ?? 0,
        tenantId: context.tenantId,
      }) as Prisma.ProjectMilestoneUncheckedCreateInput,
    });
  }

  async updateMilestone(context: ActorContext, projectId: string, milestoneId: string, input: MilestoneUpdateInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.updateMilestone({
      actorId: context.userId,
      data: stripUndefined({
        completedAt: input.completed ? new Date() : undefined,
        dependencies: input.dependencies as Prisma.InputJsonValue | undefined,
        description: input.description,
        dueAt: input.dueAt,
        name: input.name,
        progress: input.completed ? 100 : input.progress,
        sortOrder: input.sortOrder,
        status: input.completed ? "completed" : input.status,
      }) as Prisma.ProjectMilestoneUncheckedUpdateInput,
      milestoneId,
      projectId,
      tenantId: context.tenantId,
    });
  }

  async createTask(context: ActorContext, projectId: string, input: TaskInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.createTask({
      actorId: context.userId,
      data: stripUndefined({
        assigneeId: input.assigneeId,
        checklist: (input.checklist ?? []) as Prisma.InputJsonValue,
        description: input.description,
        dueAt: input.dueAt,
        estimatedHours: input.estimatedHours,
        milestoneId: input.milestoneId,
        parentId: input.parentId,
        priority: input.priority,
        projectId,
        tenantId: context.tenantId,
        title: input.title,
      }) as Prisma.ProjectTaskUncheckedCreateInput,
      labelNames: input.labelNames ?? [],
    });
  }

  async updateTask(context: ActorContext, projectId: string, taskId: string, input: TaskUpdateInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.updateTask({
      actorId: context.userId,
      data: stripUndefined({
        actualHours: input.actualHours,
        assigneeId: input.assigneeId,
        checklist: input.checklist as Prisma.InputJsonValue | undefined,
        description: input.description,
        dueAt: input.dueAt,
        estimatedHours: input.estimatedHours,
        milestoneId: input.milestoneId,
        parentId: input.parentId,
        priority: input.priority,
        status: input.status,
        title: input.title,
      }) as Prisma.ProjectTaskUncheckedUpdateInput,
      projectId,
      taskId,
      tenantId: context.tenantId,
      ...(input.labelNames ? { labelNames: input.labelNames } : {}),
    });
  }

  async createDeliverable(context: ActorContext, projectId: string, input: DeliverableInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.createDeliverable({
      actorId: context.userId,
      data: stripUndefined({
        description: input.description,
        dueAt: input.dueAt,
        milestoneId: input.milestoneId,
        projectId,
        requirementId: input.requirementId,
        requirementVersion: input.requirementVersion,
        tenantId: context.tenantId,
        title: input.title,
      }) as Prisma.ProjectDeliverableUncheckedCreateInput,
    });
  }

  async reviewDeliverable(context: ActorContext, projectId: string, deliverableId: string, input: DeliverableReviewInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.reviewDeliverable({
      actorId: context.userId,
      deliverableId,
      projectId,
      reviewStatus: input.reviewStatus,
      tenantId: context.tenantId,
      ...(input.clientApprovalStatus ? { clientApprovalStatus: input.clientApprovalStatus } : {}),
    });
  }

  async addAttachment(context: ActorContext, projectId: string, input: ProjectAttachmentInput) {
    await this.ensureAccess(context, projectId, "projects.manage");
    return this.repository.addAttachment(stripUndefined({
      deliverableId: input.deliverableId,
      mimeType: input.mimeType,
      name: input.name,
      projectId,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      tenantId: context.tenantId,
      uploadedById: context.userId,
    }) as Prisma.ProjectAttachmentUncheckedCreateInput);
  }

  async search(context: ActorContext, query: string): Promise<ProjectSearchResult> {
    await this.enforce(context, "projects.read");
    const [projects, tasks, deliverables] = await this.repository.search(context.tenantId, query);
    return {
      deliverables: deliverables.map((deliverable) => ({ id: deliverable.id, projectId: deliverable.projectId, title: deliverable.title })),
      projects: projects.map(toProjectSummary),
      tasks: tasks.map((task) => ({ id: task.id, projectId: task.projectId, title: task.title })),
    };
  }

  private projectMetrics(project: ProjectFullRecord): ProjectDashboard {
    const now = new Date();
    const soon = new Date(Date.now() + 14 * 24 * 60 * 60_000);
    const team = new Set(project.tasks.map((task) => task.assigneeId).filter(Boolean));
    return {
      activity: project.timeline.length,
      files: project.attachments.length,
      milestones: project.milestones.length,
      overdue: project.tasks.filter((task) => task.dueAt && task.dueAt < now && task.status !== ProjectTaskStatus.DONE).length,
      progress: project.progress,
      tasks: project.tasks.length,
      team: team.size,
      upcoming: project.tasks.filter((task) => task.dueAt && task.dueAt >= now && task.dueAt <= soon).length,
    };
  }

  private async ensureAccess(context: ActorContext, projectId: string, permission: string) {
    await this.enforce(context, permission);
    return this.getOrThrow(context.tenantId, projectId);
  }

  private async getOrThrow(tenantId: string, projectId: string) {
    const project = await this.repository.findById(tenantId, projectId);
    if (!project) throw new AppError({ code: "NOT_FOUND", message: "Project was not found.", status: 404 });
    return project;
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}`, "projects.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }

  private assertLifecycleTransition(from: ProjectLifecycleStatus, to: ProjectLifecycleStatus) {
    if (from === to) return;
    if (!lifecycleTransitions[from].includes(to)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Project cannot transition from ${from} to ${to}.`,
        status: 422,
      });
    }
  }

  private async uniqueSlug(tenantId: string, name: string) {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await this.repository.findBySlug(tenantId, candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }
}

export function toProjectSummary(project: ProjectRecord): ProjectSummary {
  return {
    clientId: project.clientId,
    id: project.id,
    name: project.name,
    priority: project.priority,
    progress: project.progress,
    slug: project.slug,
    status: project.status,
    targetDate: project.targetDate,
    updatedAt: project.updatedAt,
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

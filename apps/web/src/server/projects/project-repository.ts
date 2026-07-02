import {
  DeliverableReviewStatus,
  ProjectLifecycleStatus,
  ProjectTaskStatus,
  ProjectTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";

const projectInclude = {
  attachments: { orderBy: { createdAt: "desc" as const } },
  deliverables: { orderBy: { updatedAt: "desc" as const } },
  labels: true,
  milestones: { orderBy: [{ sortOrder: "asc" as const }, { dueAt: "asc" as const }] },
  tasks: { include: { labels: { include: { label: true } } }, orderBy: { updatedAt: "desc" as const } },
  timeline: { orderBy: { occurredAt: "desc" as const }, take: 50 },
};

export class PrismaProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string) {
    return this.prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: { tenantId, archivedAt: null },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.project.findFirst({
      include: projectInclude,
      where: { id, tenantId },
    });
  }

  findBySlug(tenantId: string, slug: string) {
    return this.prisma.project.findUnique({ where: { tenantId_slug: { slug, tenantId } } });
  }

  create(input: { actorId: string; data: Prisma.ProjectUncheckedCreateInput }) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data: input.data });
      await this.timeline(tx, {
        actorId: input.actorId,
        projectId: project.id,
        summary: `Created project ${project.name}`,
        tenantId: project.tenantId,
        verb: ProjectTimelineVerb.CREATED,
      });
      return project;
    });
  }

  update(input: {
    actorId: string;
    data: Prisma.ProjectUncheckedUpdateInput;
    projectId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({ data: input.data, where: { id: input.projectId } });
      await this.timeline(tx, {
        actorId: input.actorId,
        projectId: input.projectId,
        summary: `Updated project ${project.name}`,
        tenantId: input.tenantId,
        verb: ProjectTimelineVerb.UPDATED,
      });
      return project;
    });
  }

  transitionStatus(input: {
    actorId: string;
    projectId: string;
    reason?: string;
    status: ProjectLifecycleStatus;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        data: {
          status: input.status,
          ...(input.status === ProjectLifecycleStatus.COMPLETED ? { completedAt: new Date(), progress: 100 } : {}),
          ...(input.status === ProjectLifecycleStatus.ARCHIVED ? { archivedAt: new Date() } : {}),
        },
        where: { id: input.projectId },
      });
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: input.reason ? { reason: input.reason } : {},
        projectId: input.projectId,
        summary: `Changed project status to ${input.status}`,
        tenantId: input.tenantId,
        verb: input.status === ProjectLifecycleStatus.COMPLETED
          ? ProjectTimelineVerb.COMPLETED
          : ProjectTimelineVerb.STATUS_CHANGED,
      });
      await this.notify(tx, input.tenantId, input.projectId, project.managerId, "project_status_changed");
      return project;
    });
  }

  createMilestone(input: {
    actorId: string;
    data: Prisma.ProjectMilestoneUncheckedCreateInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const milestone = await tx.projectMilestone.create({ data: input.data });
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: { milestoneId: milestone.id },
        projectId: milestone.projectId,
        summary: `Created milestone ${milestone.name}`,
        tenantId: milestone.tenantId,
        verb: ProjectTimelineVerb.MILESTONE_CREATED,
      });
      await this.notify(tx, milestone.tenantId, milestone.projectId, null, "milestone_created");
      return milestone;
    });
  }

  updateMilestone(input: {
    actorId: string;
    data: Prisma.ProjectMilestoneUncheckedUpdateInput;
    milestoneId: string;
    projectId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const milestone = await tx.projectMilestone.update({
        data: input.data,
        where: { id: input.milestoneId },
      });
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: { milestoneId: milestone.id },
        projectId: input.projectId,
        summary: milestone.completedAt ? `Completed milestone ${milestone.name}` : `Updated milestone ${milestone.name}`,
        tenantId: input.tenantId,
        verb: milestone.completedAt
          ? ProjectTimelineVerb.MILESTONE_COMPLETED
          : ProjectTimelineVerb.MILESTONE_UPDATED,
      });
      return milestone;
    });
  }

  createTask(input: {
    actorId: string;
    data: Prisma.ProjectTaskUncheckedCreateInput;
    labelNames: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.projectTask.create({ data: input.data });
      await this.replaceTaskLabels(tx, input.data.tenantId, input.data.projectId, task.id, input.labelNames);
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: { taskId: task.id },
        projectId: task.projectId,
        summary: `Created task ${task.title}`,
        tenantId: task.tenantId,
        verb: ProjectTimelineVerb.TASK_CREATED,
      });
      await this.notify(tx, task.tenantId, task.projectId, task.assigneeId, "task_assigned");
      return task;
    });
  }

  updateTask(input: {
    actorId: string;
    data: Prisma.ProjectTaskUncheckedUpdateInput;
    labelNames?: string[];
    projectId: string;
    taskId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.projectTask.update({ data: input.data, where: { id: input.taskId } });
      if (input.labelNames) {
        await this.replaceTaskLabels(tx, input.tenantId, input.projectId, input.taskId, input.labelNames);
      }
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: { taskId: task.id },
        projectId: input.projectId,
        summary: task.status === ProjectTaskStatus.DONE ? `Completed task ${task.title}` : `Updated task ${task.title}`,
        tenantId: input.tenantId,
        verb: task.status === ProjectTaskStatus.DONE
          ? ProjectTimelineVerb.TASK_COMPLETED
          : ProjectTimelineVerb.TASK_UPDATED,
      });
      await this.notify(tx, input.tenantId, input.projectId, task.assigneeId, "task_updated");
      return task;
    });
  }

  createDeliverable(input: {
    actorId: string;
    data: Prisma.ProjectDeliverableUncheckedCreateInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const deliverable = await tx.projectDeliverable.create({ data: input.data });
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: { deliverableId: deliverable.id, requirementId: deliverable.requirementId, requirementVersion: deliverable.requirementVersion },
        projectId: deliverable.projectId,
        summary: `Created deliverable ${deliverable.title}`,
        tenantId: deliverable.tenantId,
        verb: ProjectTimelineVerb.DELIVERABLE_CREATED,
      });
      return deliverable;
    });
  }

  reviewDeliverable(input: {
    actorId: string;
    clientApprovalStatus?: string;
    deliverableId: string;
    projectId: string;
    reviewStatus: DeliverableReviewStatus;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const deliverable = await tx.projectDeliverable.update({
        data: {
          reviewStatus: input.reviewStatus,
          ...(input.clientApprovalStatus ? { clientApprovalStatus: input.clientApprovalStatus } : {}),
          ...(input.reviewStatus === DeliverableReviewStatus.APPROVED ? { completedAt: new Date() } : {}),
        },
        where: { id: input.deliverableId },
      });
      await this.timeline(tx, {
        actorId: input.actorId,
        metadata: { deliverableId: input.deliverableId, reviewStatus: input.reviewStatus },
        projectId: input.projectId,
        summary: `Reviewed deliverable ${deliverable.title}`,
        tenantId: input.tenantId,
        verb: ProjectTimelineVerb.DELIVERABLE_REVIEWED,
      });
      await this.notify(tx, input.tenantId, input.projectId, null, "deliverable_reviewed");
      return deliverable;
    });
  }

  addAttachment(input: Prisma.ProjectAttachmentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.projectAttachment.create({ data: input });
      await this.timeline(tx, {
        metadata: {
          attachmentId: attachment.id,
          ...(input.deliverableId ? { deliverableId: input.deliverableId } : {}),
        },
        projectId: input.projectId,
        summary: `Attached ${input.name}`,
        tenantId: input.tenantId,
        verb: ProjectTimelineVerb.ATTACHED,
        ...(input.uploadedById ? { actorId: input.uploadedById } : {}),
      });
      return attachment;
    });
  }

  dashboard(tenantId: string) {
    const now = new Date();
    const soon = new Date(Date.now() + 14 * 24 * 60 * 60_000);
    return Promise.all([
      this.prisma.project.aggregate({ _avg: { progress: true }, where: { tenantId, archivedAt: null } }),
      this.prisma.projectMilestone.count({ where: { tenantId } }),
      this.prisma.projectTask.count({ where: { tenantId } }),
      this.prisma.projectTask.count({ where: { tenantId, dueAt: { lt: now }, status: { not: ProjectTaskStatus.DONE } } }),
      this.prisma.projectTask.count({ where: { tenantId, dueAt: { gte: now, lte: soon } } }),
      this.prisma.projectTimelineEvent.count({ where: { tenantId } }),
      this.prisma.projectAttachment.count({ where: { tenantId } }),
      this.prisma.projectTask.findMany({ distinct: ["assigneeId"], where: { tenantId, assigneeId: { not: null } } }),
    ]);
  }

  search(tenantId: string, query: string) {
    return Promise.all([
      this.prisma.project.findMany({
        take: 20,
        where: { tenantId, name: { contains: query, mode: "insensitive" } },
      }),
      this.prisma.projectTask.findMany({
        take: 20,
        where: { tenantId, title: { contains: query, mode: "insensitive" } },
      }),
      this.prisma.projectDeliverable.findMany({
        take: 20,
        where: { tenantId, title: { contains: query, mode: "insensitive" } },
      }),
    ]);
  }

  private async replaceTaskLabels(
    tx: Prisma.TransactionClient,
    tenantId: string,
    projectId: string,
    taskId: string,
    names: string[],
  ) {
    await tx.projectTaskLabel.deleteMany({ where: { taskId } });
    for (const name of [...new Set(names.map((label) => label.trim()).filter(Boolean))]) {
      const label = await tx.projectLabel.upsert({
        create: { name, projectId, tenantId },
        update: {},
        where: { tenantId_projectId_name: { name, projectId, tenantId } },
      });
      await tx.projectTaskLabel.create({ data: { labelId: label.id, taskId } });
    }
  }

  private timeline(
    tx: Prisma.TransactionClient,
    input: {
      actorId?: string | null;
      metadata?: Prisma.InputJsonValue;
      projectId: string;
      summary: string;
      tenantId: string;
      verb: ProjectTimelineVerb;
    },
  ) {
    return tx.projectTimelineEvent.create({
      data: {
        projectId: input.projectId,
        summary: input.summary,
        tenantId: input.tenantId,
        verb: input.verb,
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }

  private notify(
    tx: Prisma.TransactionClient,
    tenantId: string,
    projectId: string,
    recipientId: string | null | undefined,
    type: string,
    payload: Prisma.InputJsonValue = {},
  ) {
    return tx.projectNotification.create({
      data: {
        payload,
        projectId,
        tenantId,
        type,
        ...(recipientId ? { recipientId } : {}),
      },
    });
  }
}

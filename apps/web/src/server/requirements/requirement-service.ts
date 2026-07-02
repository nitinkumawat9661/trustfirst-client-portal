import {
  RequirementPriority,
  RequirementStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import {
  type RequirementFormSchema,
  validateRequirementPayload,
} from "./dynamic-forms";
import { PrismaRequirementRepository } from "./requirement-repository";
import type {
  RequirementAssignmentInput,
  RequirementAttachmentInput,
  RequirementApprovalInput,
  RequirementCommentInput,
  RequirementCreateInput,
  RequirementDraftSaveInput,
  RequirementSubmitInput,
} from "./schemas";
import type {
  RequirementDashboard,
  RequirementSummary,
  RequirementWorkspace,
  VersionComparison,
} from "./types";

type ActorContext = { tenantId: string; userId: string };
type RequirementRecord = Awaited<ReturnType<PrismaRequirementRepository["list"]>>[number];

const approvalTransitions: Record<RequirementStatus, RequirementStatus[]> = {
  [RequirementStatus.DRAFT]: [RequirementStatus.PENDING],
  [RequirementStatus.PENDING]: [RequirementStatus.UNDER_REVIEW, RequirementStatus.REJECTED],
  [RequirementStatus.UNDER_REVIEW]: [
    RequirementStatus.CHANGES_REQUESTED,
    RequirementStatus.APPROVED,
    RequirementStatus.REJECTED,
  ],
  [RequirementStatus.CHANGES_REQUESTED]: [RequirementStatus.PENDING],
  [RequirementStatus.APPROVED]: [],
  [RequirementStatus.REJECTED]: [RequirementStatus.PENDING],
  [RequirementStatus.ARCHIVED]: [],
};

export class RequirementService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaRequirementRepository;

  constructor(prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaRequirementRepository(prisma);
  }

  async list(context: ActorContext) {
    await this.enforce(context, "requirements.read");
    return (await this.repository.list(context.tenantId)).map(toRequirementSummary);
  }

  async dashboard(context: ActorContext): Promise<RequirementDashboard> {
    await this.enforce(context, "requirements.read");
    const [total, drafts, pendingReview, recentlyUpdated] = await this.repository.dashboard(
      context.tenantId,
    );
    return {
      drafts,
      pendingReview,
      recentlyUpdated: recentlyUpdated.map(toRequirementSummary),
      total,
    };
  }

  async get(context: ActorContext, requirementId: string): Promise<RequirementWorkspace> {
    await this.enforce(context, "requirements.read");
    const requirement = await this.getOrThrow(context.tenantId, requirementId);
    return {
      ...toRequirementSummary(requirement),
      attachments: requirement.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        version: attachment.version,
      })),
      comments: requirement.comments.map((comment) => ({
        body: comment.body,
        id: comment.id,
        parentId: comment.parentId,
        resolvedAt: comment.resolvedAt,
      })),
      draftHistory: requirement.drafts.map((draft) => ({
        createdAt: draft.createdAt,
        id: draft.id,
        revision: draft.revision,
        source: draft.source,
      })),
      formSchema: requirement.formSchema as RequirementFormSchema,
      timeline: requirement.timeline.map((event) => ({
        id: event.id,
        occurredAt: event.occurredAt,
        summary: event.summary,
        verb: event.verb,
      })),
      versions: requirement.versions.map((version) => ({
        createdAt: version.createdAt,
        id: version.id,
        version: version.version,
      })),
    };
  }

  async create(context: ActorContext, input: RequirementCreateInput) {
    await this.enforce(context, "requirements.manage");
    return this.repository.create({
      actorId: context.userId,
      data: stripUndefined({
        clientId: input.clientId,
        dueAt: input.dueAt,
        formSchema: input.formSchema as Prisma.InputJsonValue,
        ownerId: input.ownerId ?? context.userId,
        priority: input.priority ?? RequirementPriority.MEDIUM,
        reviewerId: input.reviewerId,
        summary: input.summary,
        tenantId: context.tenantId,
        title: input.title,
      }) as Prisma.RequirementUncheckedCreateInput,
    });
  }

  async saveDraft(
    context: ActorContext,
    requirementId: string,
    input: RequirementDraftSaveInput,
  ) {
    await this.ensureAccess(context, requirementId, "requirements.manage");
    const revision = await this.repository.nextDraftRevision(requirementId);
    return this.repository.saveDraft({
      actorId: context.userId,
      data: input.data as Prisma.InputJsonValue,
      requirementId,
      revision,
      source: input.source,
      tenantId: context.tenantId,
    });
  }

  async submit(context: ActorContext, requirementId: string, input: RequirementSubmitInput) {
    const requirement = await this.ensureAccess(context, requirementId, "requirements.manage");
    const validation = validateRequirementPayload(
      requirement.formSchema as RequirementFormSchema,
      input.data,
    );

    if (!validation.valid) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        details: validation.issues,
        message: "Requirement validation failed.",
        status: 422,
      });
    }

    this.assertTransition(requirement.status, RequirementStatus.PENDING);
    return this.repository.submit({
      actorId: context.userId,
      data: input.data as Prisma.InputJsonValue,
      nextVersion: requirement.currentVersion + 1,
      requirementId,
      tenantId: context.tenantId,
    });
  }

  async transitionApproval(
    context: ActorContext,
    requirementId: string,
    input: RequirementApprovalInput,
  ) {
    const requirement = await this.ensureAccess(context, requirementId, "requirements.review");
    const nextStatus = input.status as RequirementStatus;
    this.assertTransition(requirement.status, nextStatus);
    return this.repository.transitionApproval({
      actorId: context.userId,
      requirementId,
      status: nextStatus,
      tenantId: context.tenantId,
      ...(input.reason ? { reason: input.reason } : {}),
    });
  }

  async assign(context: ActorContext, requirementId: string, input: RequirementAssignmentInput) {
    await this.ensureAccess(context, requirementId, "requirements.manage");
    return this.repository.assign({
      actorId: context.userId,
      data: stripUndefined({
        dueAt: input.dueAt,
        ownerId: input.ownerId,
        priority: input.priority,
        reviewerId: input.reviewerId,
      }) as Prisma.RequirementUncheckedUpdateInput,
      requirementId,
      tenantId: context.tenantId,
    });
  }

  async addAttachment(
    context: ActorContext,
    requirementId: string,
    input: RequirementAttachmentInput,
  ) {
    const requirement = await this.ensureAccess(context, requirementId, "requirements.manage");
    return this.repository.addAttachment({
      mimeType: input.mimeType,
      name: input.name,
      requirementId,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      tenantId: context.tenantId,
      uploadedById: context.userId,
      version: input.version ?? requirement.currentVersion,
    });
  }

  async addComment(context: ActorContext, requirementId: string, input: RequirementCommentInput) {
    await this.ensureAccess(context, requirementId, "requirements.read");
    return this.repository.addComment(
      stripUndefined({
        authorId: context.userId,
        body: input.body,
        mentions: (input.mentions ?? []) as Prisma.InputJsonValue,
        parentId: input.parentId,
        requirementId,
        tenantId: context.tenantId,
      }) as Prisma.RequirementCommentUncheckedCreateInput,
    );
  }

  async compareVersions(
    context: ActorContext,
    requirementId: string,
    fromVersion: number,
    toVersion: number,
  ): Promise<VersionComparison> {
    await this.ensureAccess(context, requirementId, "requirements.read");
    const [from, to] = await Promise.all([
      this.repository.findVersion(context.tenantId, requirementId, fromVersion),
      this.repository.findVersion(context.tenantId, requirementId, toVersion),
    ]);
    if (!from || !to) throw notFound("Requirement version was not found.");
    return compareJson(from.data as Record<string, unknown>, to.data as Record<string, unknown>, fromVersion, toVersion);
  }

  async restoreVersion(context: ActorContext, requirementId: string, version: number) {
    await this.ensureAccess(context, requirementId, "requirements.manage");
    const target = await this.repository.findVersion(context.tenantId, requirementId, version);
    if (!target) throw notFound("Requirement version was not found.");
    return this.repository.restoreVersion({
      actorId: context.userId,
      requirementId,
      tenantId: context.tenantId,
      version,
      versionData: target.data as Prisma.InputJsonValue,
    });
  }

  private async ensureAccess(context: ActorContext, requirementId: string, permission: string) {
    await this.enforce(context, permission);
    return this.getOrThrow(context.tenantId, requirementId);
  }

  private async getOrThrow(tenantId: string, requirementId: string) {
    const requirement = await this.repository.findById(tenantId, requirementId);
    if (!requirement) throw notFound("Requirement was not found.");
    return requirement;
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}`, "requirements.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }

  private assertTransition(from: RequirementStatus, to: RequirementStatus) {
    if (from === to) return;
    if (!approvalTransitions[from].includes(to)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Requirement cannot transition from ${from} to ${to}.`,
        status: 422,
      });
    }
  }
}

function toRequirementSummary(requirement: RequirementRecord): RequirementSummary {
  return {
    clientId: requirement.clientId,
    currentVersion: requirement.currentVersion,
    dueAt: requirement.dueAt,
    id: requirement.id,
    priority: requirement.priority,
    reviewerId: requirement.reviewerId,
    status: requirement.status,
    title: requirement.title,
    updatedAt: requirement.updatedAt,
  };
}

function compareJson(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
): VersionComparison {
  const fromKeys = new Set(Object.keys(from));
  const toKeys = new Set(Object.keys(to));
  return {
    added: [...toKeys].filter((key) => !fromKeys.has(key)),
    changed: [...toKeys].filter((key) => fromKeys.has(key) && from[key] !== to[key]),
    fromVersion,
    removed: [...fromKeys].filter((key) => !toKeys.has(key)),
    toVersion,
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function notFound(message: string) {
  return new AppError({ code: "NOT_FOUND", message, status: 404 });
}

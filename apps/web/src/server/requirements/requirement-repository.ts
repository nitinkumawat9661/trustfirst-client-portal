import {
  RequirementStatus,
  RequirementTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";

const requirementInclude = {
  attachments: { orderBy: { createdAt: "desc" as const } },
  comments: { orderBy: { createdAt: "desc" as const }, take: 30 },
  drafts: { orderBy: { revision: "desc" as const }, take: 20 },
  timeline: { orderBy: { occurredAt: "desc" as const }, take: 50 },
  versions: { orderBy: { version: "desc" as const } },
};

export class PrismaRequirementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string) {
    return this.prisma.requirement.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: { archivedAt: null, tenantId },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.requirement.findFirst({
      include: requirementInclude,
      where: { id, tenantId },
    });
  }

  create(input: {
    actorId: string;
    data: Prisma.RequirementUncheckedCreateInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.create({ data: input.data });
      await tx.requirementVersion.create({
        data: {
          data: input.data.draftData ?? {},
          requirementId: requirement.id,
          tenantId: requirement.tenantId,
          version: 1,
        },
      });
      await tx.requirementTimelineEvent.create({
        data: {
          actorId: input.actorId,
          requirementId: requirement.id,
          summary: `Created requirement ${requirement.title}`,
          tenantId: requirement.tenantId,
          verb: RequirementTimelineVerb.CREATED,
        },
      });
      return requirement;
    });
  }

  async nextDraftRevision(requirementId: string) {
    const latest = await this.prisma.requirementDraft.findFirst({
      orderBy: { revision: "desc" },
      select: { revision: true },
      where: { requirementId },
    });
    return (latest?.revision ?? 0) + 1;
  }

  saveDraft(input: {
    actorId: string;
    data: Prisma.InputJsonValue;
    requirementId: string;
    revision: number;
    source: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.requirementDraft.create({
        data: {
          authorId: input.actorId,
          data: input.data,
          requirementId: input.requirementId,
          revision: input.revision,
          source: input.source,
          tenantId: input.tenantId,
        },
      });
      await tx.requirement.update({
        data: { draftData: input.data },
        where: { id: input.requirementId },
      });
      await tx.requirementTimelineEvent.create({
        data: {
          actorId: input.actorId,
          metadata: { revision: input.revision, source: input.source },
          requirementId: input.requirementId,
          summary: input.source === "autosave" ? "Autosaved draft" : "Saved draft",
          tenantId: input.tenantId,
          verb: RequirementTimelineVerb.DRAFT_SAVED,
        },
      });
      await this.notify(tx, input.tenantId, input.requirementId, input.actorId, "draft_saved");
      return draft;
    });
  }

  submit(input: {
    actorId: string;
    data: Prisma.InputJsonValue;
    nextVersion: number;
    requirementId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.update({
        data: {
          currentVersion: input.nextVersion,
          status: RequirementStatus.PENDING,
          submittedAt: new Date(),
          submittedData: input.data,
        },
        where: { id: input.requirementId },
      });
      await tx.requirementVersion.create({
        data: {
          createdById: input.actorId,
          data: input.data,
          requirementId: input.requirementId,
          tenantId: input.tenantId,
          version: input.nextVersion,
        },
      });
      await tx.requirementTimelineEvent.create({
        data: {
          actorId: input.actorId,
          metadata: { version: input.nextVersion },
          requirementId: input.requirementId,
          summary: `Submitted requirement v${input.nextVersion}`,
          tenantId: input.tenantId,
          verb: RequirementTimelineVerb.SUBMITTED,
        },
      });
      await this.notify(tx, input.tenantId, input.requirementId, requirement.reviewerId, "submitted");
      return requirement;
    });
  }

  transitionApproval(input: {
    actorId: string;
    reason?: string;
    requirementId: string;
    status: RequirementStatus;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.update({
        data: {
          status: input.status,
          ...(input.status === RequirementStatus.APPROVED ? { approvedAt: new Date() } : {}),
          ...(input.status === RequirementStatus.REJECTED ? { rejectedAt: new Date() } : {}),
        },
        where: { id: input.requirementId },
      });
      const verb = approvalVerb(input.status);
      await tx.requirementTimelineEvent.create({
        data: {
          actorId: input.actorId,
          metadata: input.reason ? { reason: input.reason } : {},
          requirementId: input.requirementId,
          summary: `Requirement ${input.status.toLowerCase().replaceAll("_", " ")}`,
          tenantId: input.tenantId,
          verb,
        },
      });
      await this.notify(
        tx,
        input.tenantId,
        input.requirementId,
        requirement.ownerId,
        input.status.toLowerCase(),
      );
      return requirement;
    });
  }

  assign(input: {
    actorId: string;
    data: Prisma.RequirementUncheckedUpdateInput;
    requirementId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.update({
        data: input.data,
        where: { id: input.requirementId },
      });
      await tx.requirementTimelineEvent.create({
        data: {
          actorId: input.actorId,
          requirementId: input.requirementId,
          summary: "Updated requirement assignment",
          tenantId: input.tenantId,
          verb: RequirementTimelineVerb.ASSIGNED,
        },
      });
      return requirement;
    });
  }

  addAttachment(input: Prisma.RequirementAttachmentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.requirementAttachment.create({ data: input });
      await tx.requirementTimelineEvent.create({
        data: {
          metadata: {
            attachmentId: attachment.id,
            ...(input.version ? { version: input.version } : {}),
          },
          requirementId: input.requirementId,
          summary: `Attached ${input.name}`,
          tenantId: input.tenantId,
          verb: RequirementTimelineVerb.ATTACHED,
          ...(input.uploadedById ? { actorId: input.uploadedById } : {}),
        },
      });
      return attachment;
    });
  }

  addComment(input: Prisma.RequirementCommentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.requirementComment.create({ data: input });
      await tx.requirementTimelineEvent.create({
        data: {
          metadata: { commentId: comment.id },
          requirementId: input.requirementId,
          summary: "Added requirement comment",
          tenantId: input.tenantId,
          verb: RequirementTimelineVerb.COMMENTED,
          ...(input.authorId ? { actorId: input.authorId } : {}),
        },
      });
      await this.notify(tx, input.tenantId, input.requirementId, null, "mentioned");
      return comment;
    });
  }

  resolveComment(input: { commentId: string; resolvedById: string; tenantId: string }) {
    return this.prisma.requirementComment.update({
      data: { resolvedAt: new Date(), resolvedById: input.resolvedById },
      where: { id: input.commentId, tenantId: input.tenantId },
    });
  }

  findVersion(tenantId: string, requirementId: string, version: number) {
    return this.prisma.requirementVersion.findFirst({
      where: { requirementId, tenantId, version },
    });
  }

  restoreVersion(input: {
    actorId: string;
    requirementId: string;
    tenantId: string;
    version: number;
    versionData: Prisma.InputJsonValue;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.update({
        data: {
          currentVersion: input.version,
          draftData: input.versionData,
          submittedData: input.versionData,
        },
        where: { id: input.requirementId },
      });
      await tx.requirementTimelineEvent.create({
        data: {
          actorId: input.actorId,
          metadata: { version: input.version },
          requirementId: input.requirementId,
          summary: `Restored v${input.version}`,
          tenantId: input.tenantId,
          verb: RequirementTimelineVerb.VERSION_RESTORED,
        },
      });
      return requirement;
    });
  }

  dashboard(tenantId: string) {
    return Promise.all([
      this.prisma.requirement.count({ where: { tenantId } }),
      this.prisma.requirement.count({ where: { status: RequirementStatus.DRAFT, tenantId } }),
      this.prisma.requirement.count({
        where: {
          status: { in: [RequirementStatus.PENDING, RequirementStatus.UNDER_REVIEW] },
          tenantId,
        },
      }),
      this.prisma.requirement.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: { tenantId },
      }),
    ]);
  }

  private notify(
    tx: Prisma.TransactionClient,
    tenantId: string,
    requirementId: string,
    recipientId: string | null | undefined,
    type: string,
    payload: Prisma.InputJsonValue = {},
  ) {
    return tx.requirementNotification.create({
      data: {
        payload,
        requirementId,
        tenantId,
        type,
        ...(recipientId ? { recipientId } : {}),
      },
    });
  }
}

function approvalVerb(status: RequirementStatus) {
  if (status === RequirementStatus.UNDER_REVIEW) return RequirementTimelineVerb.REVIEW_REQUESTED;
  if (status === RequirementStatus.CHANGES_REQUESTED) {
    return RequirementTimelineVerb.CHANGES_REQUESTED;
  }
  if (status === RequirementStatus.APPROVED) return RequirementTimelineVerb.APPROVED;
  return RequirementTimelineVerb.REJECTED;
}

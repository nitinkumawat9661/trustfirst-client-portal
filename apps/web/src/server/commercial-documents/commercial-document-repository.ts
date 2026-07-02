import {
  CommercialDocumentStatus,
  CommercialDocumentTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";

const documentInclude = {
  attachments: { orderBy: { createdAt: "desc" as const } },
  comments: { orderBy: { createdAt: "desc" as const }, take: 30 },
  timeline: { orderBy: { occurredAt: "desc" as const }, take: 50 },
  versions: { orderBy: { version: "desc" as const } },
};

export class PrismaCommercialDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string) {
    return this.prisma.commercialDocument.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: { archivedAt: null, tenantId },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.commercialDocument.findFirst({
      include: documentInclude,
      where: { id, tenantId },
    });
  }

  findByNumber(tenantId: string, documentNumber: string) {
    return this.prisma.commercialDocument.findFirst({
      where: { documentNumber, tenantId },
    });
  }

  countByYear(tenantId: string, prefix: string, year: number) {
    return this.prisma.commercialDocument.count({
      where: {
        documentNumber: { startsWith: `${prefix}-${year}-` },
        tenantId,
      },
    });
  }

  create(input: {
    actorId: string;
    data: Prisma.CommercialDocumentUncheckedCreateInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.commercialDocument.create({ data: input.data });
      await tx.commercialDocumentVersion.create({
        data: {
          content: input.data.content ?? {},
          documentId: document.id,
          summary: "Initial draft",
          tenantId: document.tenantId,
          version: 1,
          createdById: input.actorId,
        },
      });
      await tx.commercialDocumentTimelineEvent.create({
        data: {
          actorId: input.actorId,
          documentId: document.id,
          summary: `Created ${document.type.toLowerCase().replaceAll("_", " ")} ${document.documentNumber}`,
          tenantId: document.tenantId,
          verb: CommercialDocumentTimelineVerb.CREATED,
        },
      });
      return document;
    });
  }

  updateDraft(input: {
    actorId: string;
    data: Prisma.CommercialDocumentUncheckedUpdateInput;
    documentId: string;
    nextVersion: number;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.commercialDocument.update({
        data: { ...input.data, currentVersion: input.nextVersion },
        where: { id: input.documentId, tenantId: input.tenantId },
      });
      await tx.commercialDocumentVersion.create({
        data: {
          content: (document.content ?? {}) as Prisma.InputJsonValue,
          createdById: input.actorId,
          documentId: document.id,
          summary: "Draft edited",
          tenantId: input.tenantId,
          version: input.nextVersion,
        },
      });
      await tx.commercialDocumentTimelineEvent.create({
        data: {
          actorId: input.actorId,
          documentId: document.id,
          metadata: { version: input.nextVersion },
          summary: `Updated draft v${input.nextVersion}`,
          tenantId: input.tenantId,
          verb: CommercialDocumentTimelineVerb.UPDATED,
        },
      });
      return document;
    });
  }

  transition(input: {
    actorId: string;
    documentId: string;
    metadata?: Prisma.InputJsonValue;
    status: CommercialDocumentStatus;
    summary: string;
    tenantId: string;
    verb: CommercialDocumentTimelineVerb;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const document = await tx.commercialDocument.update({
        data: {
          status: input.status,
          ...(input.status === CommercialDocumentStatus.PENDING_APPROVAL
            ? { submittedAt: now }
            : {}),
          ...(input.status === CommercialDocumentStatus.APPROVED
            ? { approvedAt: now, approvedById: input.actorId }
            : {}),
          ...(input.status === CommercialDocumentStatus.REJECTED
            ? { rejectedAt: now, rejectedById: input.actorId }
            : {}),
          ...(input.status === CommercialDocumentStatus.ARCHIVED
            ? { archivedAt: now }
            : {}),
        },
        where: { id: input.documentId, tenantId: input.tenantId },
      });
      await tx.commercialDocumentTimelineEvent.create({
        data: {
          actorId: input.actorId,
          documentId: input.documentId,
          metadata: input.metadata ?? {},
          summary: input.summary,
          tenantId: input.tenantId,
          verb: input.verb,
        },
      });
      return document;
    });
  }

  addComment(input: Prisma.CommercialDocumentCommentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.commercialDocumentComment.create({ data: input });
      await tx.commercialDocumentTimelineEvent.create({
        data: {
          documentId: input.documentId,
          metadata: { commentId: comment.id },
          summary: "Added document comment",
          tenantId: input.tenantId,
          verb: CommercialDocumentTimelineVerb.COMMENTED,
          ...(input.authorId ? { actorId: input.authorId } : {}),
        },
      });
      return comment;
    });
  }

  addAttachment(input: Prisma.CommercialDocumentAttachmentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.commercialDocumentAttachment.create({ data: input });
      await tx.commercialDocumentTimelineEvent.create({
        data: {
          documentId: input.documentId,
          metadata: {
            attachmentId: attachment.id,
            ...(input.version ? { version: input.version } : {}),
          },
          summary: `Attached ${input.name}`,
          tenantId: input.tenantId,
          verb: CommercialDocumentTimelineVerb.ATTACHED,
          ...(input.uploadedById ? { actorId: input.uploadedById } : {}),
        },
      });
      return attachment;
    });
  }

  search(tenantId: string, query: string) {
    return this.prisma.commercialDocument.findMany({
      orderBy: { updatedAt: "desc" },
      take: 25,
      where: {
        archivedAt: null,
        tenantId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { documentNumber: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
        ],
      },
    });
  }
}

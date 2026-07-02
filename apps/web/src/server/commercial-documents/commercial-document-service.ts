import {
  CommercialDocumentStatus,
  CommercialDocumentTimelineVerb,
  type CommercialDocumentType,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import { PrismaCommercialDocumentRepository } from "./commercial-document-repository";
import {
  implementedDocumentTypes,
  type CommercialDocumentApprovalInput,
  type CommercialDocumentAttachmentInput,
  type CommercialDocumentCommentInput,
  type CommercialDocumentCreateInput,
  type CommercialDocumentUpdateInput,
} from "./schemas";
import type {
  CommercialDocumentExportContract,
  CommercialDocumentPdfRenderContract,
  CommercialDocumentSummary,
  CommercialDocumentWorkspace,
} from "./types";

type ActorContext = { tenantId: string; userId: string };
type DocumentRecord = Awaited<
  ReturnType<PrismaCommercialDocumentRepository["list"]>
>[number];
type DocumentFullRecord = NonNullable<
  Awaited<ReturnType<PrismaCommercialDocumentRepository["findById"]>>
>;

const transitions: Record<CommercialDocumentStatus, CommercialDocumentStatus[]> = {
  [CommercialDocumentStatus.DRAFT]: [
    CommercialDocumentStatus.PENDING_APPROVAL,
    CommercialDocumentStatus.ARCHIVED,
  ],
  [CommercialDocumentStatus.PENDING_APPROVAL]: [
    CommercialDocumentStatus.APPROVED,
    CommercialDocumentStatus.REJECTED,
    CommercialDocumentStatus.ARCHIVED,
  ],
  [CommercialDocumentStatus.APPROVED]: [CommercialDocumentStatus.ARCHIVED],
  [CommercialDocumentStatus.REJECTED]: [
    CommercialDocumentStatus.DRAFT,
    CommercialDocumentStatus.ARCHIVED,
  ],
  [CommercialDocumentStatus.ARCHIVED]: [],
};

const numberPrefixes: Record<CommercialDocumentType, string> = {
  AGREEMENT: "AGR",
  ESTIMATE: "EST",
  INVOICE: "INV",
  PROPOSAL: "PRP",
  QUOTATION: "QUO",
  RECEIPT: "RCT",
  WORK_ORDER: "WOR",
};

export class CommercialDocumentService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaCommercialDocumentRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaCommercialDocumentRepository(prisma);
  }

  async list(context: ActorContext) {
    await this.enforce(context, "documents.read");
    return (await this.repository.list(context.tenantId)).map(toCommercialDocumentSummary);
  }

  async get(context: ActorContext, documentId: string): Promise<CommercialDocumentWorkspace> {
    await this.enforce(context, "documents.read");
    const document = await this.getOrThrow(context.tenantId, documentId);
    return toWorkspace(document);
  }

  async create(context: ActorContext, input: CommercialDocumentCreateInput) {
    await this.enforce(context, "documents.manage");
    await this.validateLinks(context.tenantId, input);
    const documentNumber = await this.nextDocumentNumber(context.tenantId, input.type);
    return this.repository.create({
      actorId: context.userId,
      data: stripUndefined({
        branding: (input.branding ?? {}) as Prisma.InputJsonValue,
        clientId: input.clientId,
        content: (input.content ?? {}) as Prisma.InputJsonValue,
        documentNumber,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ownerId: context.userId,
        projectId: input.projectId,
        requirementId: input.requirementId,
        summary: input.summary,
        templateKey: input.templateKey,
        tenantId: context.tenantId,
        title: input.title,
        type: input.type,
      }) as Prisma.CommercialDocumentUncheckedCreateInput,
    });
  }

  async updateDraft(
    context: ActorContext,
    documentId: string,
    input: CommercialDocumentUpdateInput,
  ) {
    const document = await this.ensureAccess(context, documentId, "documents.manage");
    if (document.status !== CommercialDocumentStatus.DRAFT) {
      throw validation("Only draft commercial documents can be edited.");
    }
    await this.validateLinks(context.tenantId, input);
    return this.repository.updateDraft({
      actorId: context.userId,
      data: stripUndefined({
        branding: input.branding as Prisma.InputJsonValue | undefined,
        clientId: input.clientId,
        content: input.content as Prisma.InputJsonValue | undefined,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        projectId: input.projectId,
        requirementId: input.requirementId,
        summary: input.summary,
        templateKey: input.templateKey,
        title: input.title,
      }) as Prisma.CommercialDocumentUncheckedUpdateInput,
      documentId,
      nextVersion: document.currentVersion + 1,
      tenantId: context.tenantId,
    });
  }

  async submitForApproval(context: ActorContext, documentId: string) {
    const document = await this.ensureAccess(context, documentId, "documents.manage");
    this.assertTransition(document.status, CommercialDocumentStatus.PENDING_APPROVAL);
    return this.repository.transition({
      actorId: context.userId,
      documentId,
      status: CommercialDocumentStatus.PENDING_APPROVAL,
      summary: `Submitted ${document.documentNumber} for approval`,
      tenantId: context.tenantId,
      verb: CommercialDocumentTimelineVerb.SUBMITTED,
    });
  }

  async approve(
    context: ActorContext,
    documentId: string,
    input: CommercialDocumentApprovalInput,
  ) {
    const document = await this.ensureAccess(context, documentId, "documents.approve");
    this.assertTransition(document.status, CommercialDocumentStatus.APPROVED);
    return this.repository.transition({
      actorId: context.userId,
      documentId,
      metadata: input.reason ? { reason: input.reason } : {},
      status: CommercialDocumentStatus.APPROVED,
      summary: `Approved ${document.documentNumber}`,
      tenantId: context.tenantId,
      verb: CommercialDocumentTimelineVerb.APPROVED,
    });
  }

  async reject(
    context: ActorContext,
    documentId: string,
    input: CommercialDocumentApprovalInput,
  ) {
    const document = await this.ensureAccess(context, documentId, "documents.approve");
    this.assertTransition(document.status, CommercialDocumentStatus.REJECTED);
    return this.repository.transition({
      actorId: context.userId,
      documentId,
      metadata: input.reason ? { reason: input.reason } : {},
      status: CommercialDocumentStatus.REJECTED,
      summary: `Rejected ${document.documentNumber}`,
      tenantId: context.tenantId,
      verb: CommercialDocumentTimelineVerb.REJECTED,
    });
  }

  async archive(context: ActorContext, documentId: string) {
    const document = await this.ensureAccess(context, documentId, "documents.manage");
    this.assertTransition(document.status, CommercialDocumentStatus.ARCHIVED);
    return this.repository.transition({
      actorId: context.userId,
      documentId,
      status: CommercialDocumentStatus.ARCHIVED,
      summary: `Archived ${document.documentNumber}`,
      tenantId: context.tenantId,
      verb: CommercialDocumentTimelineVerb.ARCHIVED,
    });
  }

  async addComment(
    context: ActorContext,
    documentId: string,
    input: CommercialDocumentCommentInput,
  ) {
    await this.ensureAccess(context, documentId, "documents.read");
    return this.repository.addComment(
      stripUndefined({
        authorId: context.userId,
        body: input.body,
        documentId,
        mentions: (input.mentions ?? []) as Prisma.InputJsonValue,
        parentId: input.parentId,
        tenantId: context.tenantId,
      }) as Prisma.CommercialDocumentCommentUncheckedCreateInput,
    );
  }

  async addAttachment(
    context: ActorContext,
    documentId: string,
    input: CommercialDocumentAttachmentInput,
  ) {
    const document = await this.ensureAccess(context, documentId, "documents.manage");
    return this.repository.addAttachment({
      documentId,
      mimeType: input.mimeType,
      name: input.name,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      tenantId: context.tenantId,
      uploadedById: context.userId,
      version: input.version ?? document.currentVersion,
    });
  }

  async search(context: ActorContext, query: string) {
    await this.enforce(context, "documents.read");
    return (await this.repository.search(context.tenantId, query)).map(toCommercialDocumentSummary);
  }

  async csvExportContract(
    context: ActorContext,
  ): Promise<CommercialDocumentExportContract> {
    const documents = await this.list(context);
    return {
      columns: ["documentNumber", "type", "status", "title", "updatedAt"],
      filename: "commercial-documents.csv",
      format: "csv",
      rows: documents.map((document) => ({
        documentNumber: document.documentNumber,
        status: document.status,
        title: document.title,
        type: document.type,
        updatedAt: document.updatedAt.toISOString(),
      })),
    };
  }

  async pdfRenderContract(
    context: ActorContext,
    documentId: string,
  ): Promise<CommercialDocumentPdfRenderContract> {
    const document = await this.get(context, documentId);
    return {
      documentId,
      engine: "pdf",
      payload: {
        branding: document.branding,
        content: document.content,
        documentNumber: document.documentNumber,
        title: document.title,
        type: document.type,
      },
      templateKey: document.templateKey,
    };
  }

  private async validateLinks(
    tenantId: string,
    input: {
      clientId?: string | undefined;
      projectId?: string | undefined;
      requirementId?: string | undefined;
    },
  ) {
    const [client, project, requirement] = await Promise.all([
      input.clientId
        ? this.prisma.clientOrganization.findFirst({
            select: { id: true },
            where: { id: input.clientId, tenantId },
          })
        : Promise.resolve(null),
      input.projectId
        ? this.prisma.project.findFirst({
            select: { id: true },
            where: { id: input.projectId, tenantId },
          })
        : Promise.resolve(null),
      input.requirementId
        ? this.prisma.requirement.findFirst({
            select: { id: true },
            where: { id: input.requirementId, tenantId },
          })
        : Promise.resolve(null),
    ]);

    if (input.clientId && !client) throw validation("Linked client was not found.");
    if (input.projectId && !project) throw validation("Linked project was not found.");
    if (input.requirementId && !requirement) {
      throw validation("Linked requirement was not found.");
    }
  }

  private async nextDocumentNumber(tenantId: string, type: CommercialDocumentType) {
    if (!implementedDocumentTypes.some((implementedType) => implementedType === type)) {
      throw validation("This commercial document type is not implemented in v1.");
    }
    const prefix = numberPrefixes[type];
    const year = new Date().getUTCFullYear();
    let sequence = (await this.repository.countByYear(tenantId, prefix, year)) + 1;
    let candidate = formatNumber(prefix, year, sequence);

    while (await this.repository.findByNumber(tenantId, candidate)) {
      sequence += 1;
      candidate = formatNumber(prefix, year, sequence);
    }

    return candidate;
  }

  private async ensureAccess(context: ActorContext, documentId: string, permission: string) {
    await this.enforce(context, permission);
    return this.getOrThrow(context.tenantId, documentId);
  }

  private async getOrThrow(tenantId: string, documentId: string) {
    const document = await this.repository.findById(tenantId, documentId);
    if (!document) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commercial document was not found.",
        status: 404,
      });
    }
    return document;
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}`, "documents.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }

  private assertTransition(
    from: CommercialDocumentStatus,
    to: CommercialDocumentStatus,
  ) {
    if (from === to) return;
    if (!transitions[from].includes(to)) {
      throw validation(`Commercial document cannot transition from ${from} to ${to}.`);
    }
  }
}

function toCommercialDocumentSummary(document: DocumentRecord): CommercialDocumentSummary {
  return {
    clientId: document.clientId,
    currentVersion: document.currentVersion,
    documentNumber: document.documentNumber,
    id: document.id,
    projectId: document.projectId,
    status: document.status,
    templateKey: document.templateKey,
    title: document.title,
    type: document.type,
    updatedAt: document.updatedAt,
  };
}

function toWorkspace(document: DocumentFullRecord): CommercialDocumentWorkspace {
  return {
    ...toCommercialDocumentSummary(document),
    attachments: document.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      version: attachment.version,
    })),
    branding: document.branding as Record<string, unknown>,
    comments: document.comments.map((comment) => ({
      body: comment.body,
      id: comment.id,
      parentId: comment.parentId,
      resolvedAt: comment.resolvedAt,
    })),
    content: document.content as Record<string, unknown>,
    metadata: document.metadata as Record<string, unknown>,
    requirementId: document.requirementId,
    summary: document.summary,
    timeline: document.timeline.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      summary: event.summary,
      verb: event.verb,
    })),
    versions: document.versions.map((version) => ({
      createdAt: version.createdAt,
      id: version.id,
      version: version.version,
    })),
  };
}

function formatNumber(prefix: string, year: number, sequence: number) {
  return `${prefix}-${year}-${sequence.toString().padStart(4, "0")}`;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

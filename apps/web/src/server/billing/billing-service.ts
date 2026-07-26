import {
  BillingTimelineVerb,
  CommercialDocumentType,
  InvoiceStatus,
  PaymentProvider,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { MANGALAM_TENANT_SLUG } from "../domain/host-routing";
import { PermissionResolverService } from "../permissions";
import { PrismaBillingRepository } from "./billing-repository";
import type {
  BillingProfileInput,
  InvoiceAttachmentInput,
  InvoiceCommentInput,
  InvoiceCreateInput,
  InvoiceStatusInput,
  InvoiceUpdateInput,
  PaymentRecordInput,
} from "./schemas";
import type {
  BillingDashboard,
  InvoiceCsvExportContract,
  InvoicePdfRenderContract,
  InvoiceSummary,
  InvoiceWorkspace,
  PaymentProviderContract,
} from "./types";

type ActorContext = { tenantId: string; userId: string };
type InvoiceRecord = Awaited<ReturnType<PrismaBillingRepository["listInvoices"]>>[number];
type InvoiceFullRecord = NonNullable<Awaited<ReturnType<PrismaBillingRepository["findInvoiceById"]>>>;

const issueableStatuses = new Set<InvoiceStatus>([InvoiceStatus.DRAFT]);
const payableStatuses = new Set<InvoiceStatus>([
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
]);

export const paymentProviderContracts: PaymentProviderContract[] = [
  { capabilities: ["create_intent", "verify_payment"], key: "razorpay", liveIntegration: false, name: "Razorpay" },
  { capabilities: ["create_intent", "verify_payment", "refund_reference"], key: "stripe", liveIntegration: false, name: "Stripe" },
  { capabilities: ["create_intent", "verify_payment"], key: "phonepe", liveIntegration: false, name: "PhonePe" },
  { capabilities: ["create_intent", "verify_payment"], key: "upi_qr", liveIntegration: false, name: "UPI QR" },
  { capabilities: ["manual_record"], key: "manual", liveIntegration: false, name: "Manual" },
];

export class BillingService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaBillingRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaBillingRepository(prisma);
  }

  async listInvoices(context: ActorContext) {
    await this.enforce(context, "billing.read");
    return (await this.repository.listInvoices(context.tenantId)).map(toInvoiceSummary);
  }

  async dashboard(context: ActorContext): Promise<BillingDashboard> {
    await this.enforce(context, "billing.read");
    const [totalInvoices, draftInvoices, overdueInvoices, amountAggregate] =
      await this.repository.dashboard(context.tenantId);
    const totalAmount = amountAggregate._sum.totalAmountCents ?? 0;
    const paidAmount = amountAggregate._sum.paidAmountCents ?? 0;
    return {
      draftInvoices,
      overdueInvoices,
      outstandingAmountCents: Math.max(totalAmount - paidAmount, 0),
      paidAmountCents: paidAmount,
      totalInvoices,
    };
  }

  async getInvoice(context: ActorContext, invoiceId: string): Promise<InvoiceWorkspace> {
    await this.enforce(context, "billing.read");
    const invoice = await this.getInvoiceOrThrow(context.tenantId, invoiceId);
    return toInvoiceWorkspace(invoice);
  }

  async upsertBillingProfile(context: ActorContext, input: BillingProfileInput) {
    await this.enforce(context, "billing.manage");
    await this.assertClient(context.tenantId, input.clientId);
    return this.repository.upsertBillingProfile(stripUndefined({
      address: (input.address ?? {}) as Prisma.InputJsonValue,
      billingEmail: input.billingEmail,
      clientId: input.clientId,
      currency: input.currency ?? "INR",
      legalName: input.legalName,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      paymentTerms: (input.paymentTerms ?? {}) as Prisma.InputJsonValue,
      taxIdentifier: input.taxIdentifier,
      tenantId: context.tenantId,
    }) as Prisma.BillingProfileUncheckedCreateInput);
  }

  async createInvoice(context: ActorContext, input: InvoiceCreateInput) {
    await this.enforce(context, "billing.manage");
    await this.validateLinks(context.tenantId, input);
    const invoiceNumber = createDraftInvoiceNumber();
    const totalAmountCents = sumLineItems(input.lineItems);
    return this.repository.createInvoice({
      actorId: context.userId,
      data: stripUndefined({
        branding: (input.branding ?? {}) as Prisma.InputJsonValue,
        clientId: input.clientId,
        commercialDocumentId: input.commercialDocumentId,
        currency: input.currency ?? "INR",
        dueAt: input.dueAt ?? dueDateFromTerms(input.paymentTerms),
        invoiceNumber,
        lineItems: input.lineItems as Prisma.InputJsonValue,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ownerId: context.userId,
        paymentTerms: (input.paymentTerms ?? {}) as Prisma.InputJsonValue,
        projectId: input.projectId,
        requirementId: input.requirementId,
        summary: input.summary,
        tenantId: context.tenantId,
        title: input.title,
        totalAmountCents,
      }) as Prisma.InvoiceUncheckedCreateInput,
    });
  }

  async updateDraft(context: ActorContext, invoiceId: string, input: InvoiceUpdateInput) {
    const invoice = await this.ensureInvoiceAccess(context, invoiceId, "billing.manage");
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw validation("Only draft invoices can be edited.");
    }
    await this.validateLinks(context.tenantId, input);
    return this.repository.updateInvoiceDraft({
      actorId: context.userId,
      data: stripUndefined({
        branding: input.branding as Prisma.InputJsonValue | undefined,
        clientId: input.clientId,
        commercialDocumentId: input.commercialDocumentId,
        currency: input.currency,
        dueAt: input.dueAt ?? dueDateFromTerms(input.paymentTerms),
        lineItems: input.lineItems as Prisma.InputJsonValue | undefined,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        paymentTerms: input.paymentTerms as Prisma.InputJsonValue | undefined,
        projectId: input.projectId,
        requirementId: input.requirementId,
        summary: input.summary,
        title: input.title,
        totalAmountCents: input.lineItems ? sumLineItems(input.lineItems) : undefined,
      }) as Prisma.InvoiceUncheckedUpdateInput,
      invoiceId,
      tenantId: context.tenantId,
    });
  }

  async transitionInvoice(context: ActorContext, invoiceId: string, input: InvoiceStatusInput) {
    const invoice = await this.ensureInvoiceAccess(context, invoiceId, "billing.manage");
    if (input.status === InvoiceStatus.ISSUED) {
      if (!issueableStatuses.has(invoice.status)) {
        throw validation("Only draft invoices can be issued.");
      }
      const numbering = await this.resolveInvoiceNumbering(context.tenantId);

      return this.repository.issueInvoice({
        actorId: context.userId,
        invoiceId,
        issuedAt: new Date(),
        prefix: numbering.prefix,
        tenantId: context.tenantId,
      });
    }
    if (input.status === InvoiceStatus.VOID) {
      if (invoice.status === InvoiceStatus.PAID) throw validation("Paid invoices cannot be voided.");
      return this.repository.transitionInvoice({
        actorId: context.userId,
        data: { status: InvoiceStatus.VOID, voidedAt: new Date() },
        invoiceId,
        summary: `Voided invoice ${invoice.invoiceNumber}`,
        tenantId: context.tenantId,
        verb: BillingTimelineVerb.INVOICE_VOIDED,
      });
    }
    return this.repository.transitionInvoice({
      actorId: context.userId,
      data: { archivedAt: new Date(), status: InvoiceStatus.ARCHIVED },
      invoiceId,
      summary: `Archived invoice ${invoice.invoiceNumber}`,
      tenantId: context.tenantId,
      verb: BillingTimelineVerb.INVOICE_ARCHIVED,
    });
  }

  async recordPayment(context: ActorContext, invoiceId: string, input: PaymentRecordInput) {
    const invoice = await this.ensureInvoiceAccess(context, invoiceId, "billing.payments.manage");
    if (input.amountCents <= 0) {
      throw validation("Payment amount must be greater than zero.");
    }
    if (!payableStatuses.has(currentStatus(invoice))) {
      throw validation("Payments can only be recorded against issued, overdue, or partially paid invoices.");
    }
    if (input.provider !== PaymentProvider.MANUAL) {
      throw validation("Live payment providers are contract-only in this foundation.");
    }
    if (input.receiptDocumentId) {
      await this.assertReceiptDocument(context.tenantId, input.receiptDocumentId);
    }
    const outstanding = outstandingAmount(invoice);
    if (input.amountCents > outstanding) {
      throw validation("Payment amount cannot exceed outstanding amount.");
    }
    const paidAmountCents = invoice.paidAmountCents + input.amountCents;
    const nextStatus =
      paidAmountCents >= invoice.totalAmountCents
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;
    const receivedAt = input.receivedAt ?? new Date();
    const receiptNumbering = input.receiptDocumentId
      ? undefined
      : await this.resolveReceiptNumbering(context.tenantId);

    return this.repository.recordPayment({
      actorId: context.userId,
      invoiceId,
      nextStatus,
      paidAmountCents,
      ...(receiptNumbering
        ? { receiptPrefix: receiptNumbering.prefix }
        : {}),
      receivedAt,
      payment: stripUndefined({
        amountCents: input.amountCents,
        invoiceId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        mode: input.mode,
        notes: input.notes,
        provider: input.provider,
        receiptDocumentId: input.receiptDocumentId,
        receivedAt,
        recordedById: context.userId,
        reference: input.reference,
        tenantId: context.tenantId,
      }) as Prisma.PaymentRecordUncheckedCreateInput,
      tenantId: context.tenantId,
    });
  }

  async addComment(context: ActorContext, invoiceId: string, input: InvoiceCommentInput) {
    await this.ensureInvoiceAccess(context, invoiceId, "billing.read");
    return this.repository.addComment(
      stripUndefined({
        authorId: context.userId,
        body: input.body,
        invoiceId,
        mentions: (input.mentions ?? []) as Prisma.InputJsonValue,
        parentId: input.parentId,
        tenantId: context.tenantId,
      }) as Prisma.InvoiceCommentUncheckedCreateInput,
    );
  }

  async addAttachment(context: ActorContext, invoiceId: string, input: InvoiceAttachmentInput) {
    await this.ensureInvoiceAccess(context, invoiceId, "billing.manage");
    return this.repository.addAttachment({
      invoiceId,
      mimeType: input.mimeType,
      name: input.name,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      tenantId: context.tenantId,
      uploadedById: context.userId,
    });
  }

  async csvExportContract(context: ActorContext): Promise<InvoiceCsvExportContract> {
    const invoices = await this.listInvoices(context);
    return {
      columns: ["invoiceNumber", "status", "title", "totalAmountCents", "paidAmountCents", "outstandingAmountCents"],
      filename: "invoices.csv",
      format: "csv",
      rows: invoices.map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        outstandingAmountCents: String(invoice.outstandingAmountCents),
        paidAmountCents: String(invoice.paidAmountCents),
        status: invoice.status,
        title: invoice.title,
        totalAmountCents: String(invoice.totalAmountCents),
      })),
    };
  }

  providerContracts() {
    return paymentProviderContracts;
  }

  private async validateLinks(
    tenantId: string,
    input: {
      clientId?: string | undefined;
      commercialDocumentId?: string | undefined;
      projectId?: string | undefined;
      requirementId?: string | undefined;
    },
  ) {
    if (input.clientId) await this.assertClient(tenantId, input.clientId);
    if (input.projectId) await this.assertExists("project", tenantId, input.projectId);
    if (input.requirementId) await this.assertExists("requirement", tenantId, input.requirementId);
    if (input.commercialDocumentId) {
      const document = await this.prisma.commercialDocument.findFirst({
        select: { id: true },
        where: { id: input.commercialDocumentId, tenantId },
      });
      if (!document) throw validation("Linked commercial document was not found.");
    }
  }

  private async assertReceiptDocument(tenantId: string, receiptDocumentId: string) {
    const receipt = await this.prisma.commercialDocument.findFirst({
      select: { id: true, type: true },
      where: { id: receiptDocumentId, tenantId },
    });
    if (!receipt || receipt.type !== CommercialDocumentType.RECEIPT) {
      throw validation("Receipt link must reference a receipt commercial document.");
    }
  }

  private async assertClient(tenantId: string, clientId: string) {
    await this.assertExists("clientOrganization", tenantId, clientId, "Linked client was not found.");
  }

  private async assertExists(
    model: "clientOrganization" | "project" | "requirement",
    tenantId: string,
    id: string,
    message = `Linked ${model} was not found.`,
  ) {
    const record =
      model === "clientOrganization"
        ? await this.prisma.clientOrganization.findFirst({ select: { id: true }, where: { id, tenantId } })
        : model === "project"
          ? await this.prisma.project.findFirst({ select: { id: true }, where: { id, tenantId } })
          : await this.prisma.requirement.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation(message);
  }


  private async resolveReceiptNumbering(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      select: { slug: true },
      where: { id: tenantId },
    });

    return {
      prefix:
        tenant?.slug === MANGALAM_TENANT_SLUG
          ? "MS/REC"
          : "REC",
    };
  }
  private async resolveInvoiceNumbering(tenantId: string) {
    const [tenant, settings] = await Promise.all([
      this.prisma.tenant.findUnique({
        select: { slug: true },
        where: { id: tenantId },
      }),
      this.prisma.hardwareBusinessSettings.findUnique({
        select: { invoicePrefix: true },
        where: { tenantId },
      }),
    ]);

    if (tenant?.slug === MANGALAM_TENANT_SLUG) {
      return { prefix: "MS/INV" };
    }

    const configuredPrefix = settings?.invoicePrefix.trim();

    return {
      prefix:
        configuredPrefix &&
        !configuredPrefix.startsWith("PENDING")
          ? configuredPrefix
          : "INV",
    };
  }
  private async ensureInvoiceAccess(context: ActorContext, invoiceId: string, permission: string) {
    await this.enforce(context, permission);
    return this.getInvoiceOrThrow(context.tenantId, invoiceId);
  }

  private async getInvoiceOrThrow(tenantId: string, invoiceId: string) {
    const invoice = await this.repository.findInvoiceById(tenantId, invoiceId);
    if (!invoice) {
      throw new AppError({ code: "NOT_FOUND", message: "Invoice was not found.", status: 404 });
    }
    return invoice;
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}`, "billing.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

export function outstandingAmount(invoice: Pick<InvoiceRecord, "paidAmountCents" | "totalAmountCents">) {
  return Math.max(invoice.totalAmountCents - invoice.paidAmountCents, 0);
}

export function currentStatus(invoice: Pick<InvoiceRecord, "dueAt" | "status">) {
  if (
    invoice.status === InvoiceStatus.ISSUED &&
    invoice.dueAt &&
    invoice.dueAt.getTime() < Date.now()
  ) {
    return InvoiceStatus.OVERDUE;
  }
  return invoice.status;
}

function toInvoiceSummary(invoice: InvoiceRecord): InvoiceSummary {
  return {
    clientId: invoice.clientId,
    dueAt: invoice.dueAt,
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    outstandingAmountCents: outstandingAmount(invoice),
    paidAmountCents: invoice.paidAmountCents,
    status: currentStatus(invoice),
    title: invoice.title,
    totalAmountCents: invoice.totalAmountCents,
    updatedAt: invoice.updatedAt,
  };
}

function toInvoiceWorkspace(invoice: InvoiceFullRecord): InvoiceWorkspace {
  const summary = toInvoiceSummary(invoice);
  return {
    ...summary,
    attachments: invoice.attachments.map((attachment) => ({ id: attachment.id, name: attachment.name })),
    comments: invoice.comments.map((comment) => ({ body: comment.body, id: comment.id, parentId: comment.parentId })),
    lineItems: Array.isArray(invoice.lineItems) ? invoice.lineItems : [],
    payments: invoice.payments.map((payment) => ({
      amountCents: payment.amountCents,
      id: payment.id,
      mode: payment.mode,
      provider: payment.provider,
      receivedAt: payment.receivedAt,
    })),
    pdfContract: invoicePdfRenderContract(invoice),
    timeline: invoice.timeline.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      summary: event.summary,
      verb: event.verb,
    })),
  };
}

function invoicePdfRenderContract(invoice: InvoiceFullRecord): InvoicePdfRenderContract {
  return {
    engine: "pdf",
    invoiceId: invoice.id,
    payload: {
      branding: invoice.branding,
      currency: invoice.currency,
      invoiceNumber: invoice.invoiceNumber,
      lineItems: invoice.lineItems,
      paidAmountCents: invoice.paidAmountCents,
      title: invoice.title,
      totalAmountCents: invoice.totalAmountCents,
    },
    templateKey: "invoice-standard-v1",
  };
}

function sumLineItems(lineItems: Array<{ totalAmountCents: number }>) {
  return lineItems.reduce((total, item) => total + item.totalAmountCents, 0);
}

function dueDateFromTerms(paymentTerms?: { daysUntilDue?: number | undefined }) {
  if (paymentTerms?.daysUntilDue === undefined) return undefined;
  return new Date(Date.now() + paymentTerms.daysUntilDue * 24 * 60 * 60_000);
}

function createDraftInvoiceNumber() {
  return `DRAFT-${crypto.randomUUID()}`;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

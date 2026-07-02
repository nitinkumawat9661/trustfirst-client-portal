import {
  AuditAction,
  BillingTimelineVerb,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";

const invoiceInclude = {
  attachments: { orderBy: { createdAt: "desc" as const } },
  comments: { orderBy: { createdAt: "desc" as const }, take: 30 },
  payments: { orderBy: { receivedAt: "desc" as const } },
  timeline: { orderBy: { occurredAt: "desc" as const }, take: 50 },
};

export class PrismaBillingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listInvoices(tenantId: string) {
    return this.prisma.invoice.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: { archivedAt: null, tenantId },
    });
  }

  findInvoiceById(tenantId: string, id: string) {
    return this.prisma.invoice.findFirst({
      include: invoiceInclude,
      where: { id, tenantId },
    });
  }

  countInvoiceNumber(tenantId: string, year: number) {
    return this.prisma.invoice.count({
      where: { invoiceNumber: { startsWith: `INV-${year}-` }, tenantId },
    });
  }

  findInvoiceByNumber(tenantId: string, invoiceNumber: string) {
    return this.prisma.invoice.findFirst({ where: { invoiceNumber, tenantId } });
  }

  upsertBillingProfile(input: Prisma.BillingProfileUncheckedCreateInput) {
    return this.prisma.billingProfile.upsert({
      create: input,
      update: stripUndefined({
        address: input.address,
        billingEmail: input.billingEmail,
        currency: input.currency,
        legalName: input.legalName,
        metadata: input.metadata,
        paymentTerms: input.paymentTerms,
        taxIdentifier: input.taxIdentifier,
      }) as Prisma.BillingProfileUncheckedUpdateInput,
      where: { tenantId_clientId: { clientId: input.clientId, tenantId: input.tenantId } },
    });
  }

  createInvoice(input: {
    actorId: string;
    data: Prisma.InvoiceUncheckedCreateInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({ data: input.data });
      await tx.billingTimelineEvent.create({
        data: {
          actorId: input.actorId,
          invoiceId: invoice.id,
          summary: `Created invoice ${invoice.invoiceNumber}`,
          tenantId: invoice.tenantId,
          verb: BillingTimelineVerb.INVOICE_CREATED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.BILLING_INVOICE_CREATED,
          actorId: input.actorId,
          targetId: invoice.id,
          targetType: "Invoice",
          tenantId: invoice.tenantId,
        },
      });
      return invoice;
    });
  }

  updateInvoiceDraft(input: {
    actorId: string;
    data: Prisma.InvoiceUncheckedUpdateInput;
    invoiceId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        data: input.data,
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      await tx.billingTimelineEvent.create({
        data: {
          actorId: input.actorId,
          invoiceId: input.invoiceId,
          summary: `Updated invoice ${invoice.invoiceNumber}`,
          tenantId: input.tenantId,
          verb: BillingTimelineVerb.INVOICE_UPDATED,
        },
      });
      return invoice;
    });
  }

  transitionInvoice(input: {
    actorId: string;
    data: Prisma.InvoiceUncheckedUpdateInput;
    invoiceId: string;
    summary: string;
    tenantId: string;
    verb: BillingTimelineVerb;
    auditAction?: AuditAction;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        data: input.data,
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      await tx.billingTimelineEvent.create({
        data: {
          actorId: input.actorId,
          invoiceId: input.invoiceId,
          summary: input.summary,
          tenantId: input.tenantId,
          verb: input.verb,
        },
      });
      if (input.auditAction) {
        await tx.auditEvent.create({
          data: {
            action: input.auditAction,
            actorId: input.actorId,
            targetId: invoice.id,
            targetType: "Invoice",
            tenantId: input.tenantId,
          },
        });
      }
      return invoice;
    });
  }

  recordPayment(input: {
    actorId: string;
    invoiceId: string;
    nextStatus: InvoiceStatus;
    paidAmountCents: number;
    payment: Prisma.PaymentRecordUncheckedCreateInput;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRecord.create({ data: input.payment });
      const invoice = await tx.invoice.update({
        data: {
          paidAmountCents: input.paidAmountCents,
          paidAt: input.nextStatus === InvoiceStatus.PAID ? input.payment.receivedAt : null,
          status: input.nextStatus,
        },
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      await tx.billingTimelineEvent.create({
        data: {
          actorId: input.actorId,
          invoiceId: input.invoiceId,
          metadata: { amountCents: payment.amountCents, paymentId: payment.id },
          summary: `Recorded payment for ${invoice.invoiceNumber}`,
          tenantId: input.tenantId,
          verb: BillingTimelineVerb.PAYMENT_RECORDED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.BILLING_PAYMENT_RECORDED,
          actorId: input.actorId,
          metadata: { amountCents: payment.amountCents },
          targetId: input.invoiceId,
          targetType: "Invoice",
          tenantId: input.tenantId,
        },
      });
      return { invoice, payment };
    });
  }

  addComment(input: Prisma.InvoiceCommentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.invoiceComment.create({ data: input });
      await tx.billingTimelineEvent.create({
        data: {
          invoiceId: input.invoiceId,
          metadata: { commentId: comment.id },
          summary: "Added invoice comment",
          tenantId: input.tenantId,
          verb: BillingTimelineVerb.COMMENTED,
          ...(input.authorId ? { actorId: input.authorId } : {}),
        },
      });
      return comment;
    });
  }

  addAttachment(input: Prisma.InvoiceAttachmentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.invoiceAttachment.create({ data: input });
      await tx.billingTimelineEvent.create({
        data: {
          invoiceId: input.invoiceId,
          metadata: { attachmentId: attachment.id },
          summary: `Attached ${input.name}`,
          tenantId: input.tenantId,
          verb: BillingTimelineVerb.ATTACHED,
          ...(input.uploadedById ? { actorId: input.uploadedById } : {}),
        },
      });
      return attachment;
    });
  }

  dashboard(tenantId: string) {
    return Promise.all([
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.DRAFT, tenantId } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE, tenantId } }),
      this.prisma.invoice.aggregate({ _sum: { paidAmountCents: true, totalAmountCents: true }, where: { tenantId } }),
    ]);
  }
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

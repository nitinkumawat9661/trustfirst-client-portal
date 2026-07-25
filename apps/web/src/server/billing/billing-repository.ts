import {
  AuditAction,
  BillingTimelineVerb,
  CommercialDocumentStatus,
  CommercialDocumentTimelineVerb,
  CommercialDocumentType,
  DocumentSequenceKind,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { allocateDocumentNumber } from "./document-sequence";

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

  issueInvoice(input: {
    actorId: string;
    financialYear?: string;
    invoiceId: string;
    issuedAt: Date;
    prefix: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await allocateDocumentNumber(tx, {
        ...(input.financialYear
          ? { financialYear: input.financialYear }
          : {}),
        kind: DocumentSequenceKind.INVOICE,
        occurredAt: input.issuedAt,
        prefix: input.prefix,
        tenantId: input.tenantId,
      });

      const invoice = await tx.invoice.update({
        data: {
          invoiceNumber,
          issuedAt: input.issuedAt,
          status: InvoiceStatus.ISSUED,
        },
        where: {
          id: input.invoiceId,
          status: InvoiceStatus.DRAFT,
          tenantId: input.tenantId,
        },
      });

      await tx.billingTimelineEvent.create({
        data: {
          actorId: input.actorId,
          invoiceId: invoice.id,
          metadata: { invoiceNumber },
          summary: `Issued invoice ${invoiceNumber}`,
          tenantId: input.tenantId,
          verb: BillingTimelineVerb.INVOICE_ISSUED,
        },
      });

      await tx.auditEvent.create({
        data: {
          action: AuditAction.BILLING_INVOICE_ISSUED,
          actorId: input.actorId,
          metadata: { invoiceNumber },
          targetId: invoice.id,
          targetType: "Invoice",
          tenantId: input.tenantId,
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
    receiptPrefix?: string;
    receivedAt: Date;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const sourceInvoice = await tx.invoice.findFirst({
        select: {
          branding: true,
          clientId: true,
          currency: true,
          invoiceNumber: true,
          projectId: true,
          requirementId: true,
          title: true,
        },
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
        },
      });

      if (!sourceInvoice) {
        throw new Error("Invoice was not found while recording payment.");
      }

      let receipt = null;
      let receiptDocumentId = input.payment.receiptDocumentId ?? null;

      if (!receiptDocumentId) {
        if (!input.receiptPrefix) {
          throw new Error("Receipt number prefix is required.");
        }

        const receiptNumber = await allocateDocumentNumber(tx, {
          kind: DocumentSequenceKind.RECEIPT,
          occurredAt: input.receivedAt,
          prefix: input.receiptPrefix,
          tenantId: input.tenantId,
        });

        const receiptContent = {
          amountCents: input.payment.amountCents,
          currency: sourceInvoice.currency,
          invoiceNumber: sourceInvoice.invoiceNumber,
          mode: input.payment.mode,
          notes: input.payment.notes ?? null,
          provider: input.payment.provider,
          receivedAt: input.receivedAt.toISOString(),
          reference: input.payment.reference ?? null,
        } as Prisma.InputJsonValue;

        receipt = await tx.commercialDocument.create({
          data: {
            approvedAt: input.receivedAt,
            approvedById: input.actorId,
            branding: sourceInvoice.branding as Prisma.InputJsonValue,
            clientId: sourceInvoice.clientId,
            content: receiptContent,
            documentNumber: receiptNumber,
            metadata: {
              billingInvoiceId: input.invoiceId,
              generatedAutomatically: true,
            },
            ownerId: input.actorId,
            projectId: sourceInvoice.projectId,
            requirementId: sourceInvoice.requirementId,
            status: CommercialDocumentStatus.APPROVED,
            summary: `Payment received against ${sourceInvoice.invoiceNumber}`,
            templateKey: "billing-payment-receipt-v1",
            tenantId: input.tenantId,
            title: `Receipt for ${sourceInvoice.invoiceNumber}`,
            type: CommercialDocumentType.RECEIPT,
          },
        });

        receiptDocumentId = receipt.id;

        await tx.commercialDocumentVersion.create({
          data: {
            content: receiptContent,
            createdById: input.actorId,
            documentId: receipt.id,
            summary: "Automatic payment receipt",
            tenantId: input.tenantId,
            version: 1,
          },
        });

        await tx.commercialDocumentTimelineEvent.createMany({
          data: [
            {
              actorId: input.actorId,
              documentId: receipt.id,
              summary: `Created receipt ${receiptNumber}`,
              tenantId: input.tenantId,
              verb: CommercialDocumentTimelineVerb.CREATED,
            },
            {
              actorId: input.actorId,
              documentId: receipt.id,
              summary: `Approved receipt ${receiptNumber}`,
              tenantId: input.tenantId,
              verb: CommercialDocumentTimelineVerb.APPROVED,
            },
          ],
        });
      }

      const payment = await tx.paymentRecord.create({
        data: {
          ...input.payment,
          receiptDocumentId,
        },
      });

      const invoice = await tx.invoice.update({
        data: {
          paidAmountCents: input.paidAmountCents,
          paidAt:
            input.nextStatus === InvoiceStatus.PAID
              ? input.receivedAt
              : null,
          status: input.nextStatus,
        },
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
        },
      });

      await tx.billingTimelineEvent.create({
        data: {
          actorId: input.actorId,
          invoiceId: input.invoiceId,
          metadata: {
            amountCents: payment.amountCents,
            paymentId: payment.id,
            receiptDocumentId,
          },
          summary: `Recorded payment for ${invoice.invoiceNumber}`,
          tenantId: input.tenantId,
          verb: BillingTimelineVerb.PAYMENT_RECORDED,
        },
      });

      await tx.auditEvent.create({
        data: {
          action: AuditAction.BILLING_PAYMENT_RECORDED,
          actorId: input.actorId,
          metadata: {
            amountCents: payment.amountCents,
            receiptDocumentId,
          },
          targetId: input.invoiceId,
          targetType: "Invoice",
          tenantId: input.tenantId,
        },
      });

      return { invoice, payment, receipt };
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

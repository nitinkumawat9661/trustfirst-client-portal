import {
  AuditAction,
  HardwareInventoryMovementType,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  HardwareTradeTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";

const tradeInclude = {
  billingInvoice: true,
  customer: true,
  items: {
    include: {
      product: {
        include: {
          unit: true,
        },
      },
    },
  },
  supplier: true,
  timeline: { orderBy: { occurredAt: "desc" as const }, take: 30 },
};

type HardwareTradeDocumentWithRelations = Prisma.HardwareTradeDocumentGetPayload<{
  include: typeof tradeInclude;
}>;

export class PrismaHardwareTradeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string, types?: HardwareTradeDocumentType[]) {
    return this.prisma.hardwareTradeDocument.findMany({
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      where: { archivedAt: null, tenantId, ...(types ? { type: { in: types } } : {}) },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.hardwareTradeDocument.findFirst({
      include: tradeInclude,
      where: { id, tenantId },
    });
  }

  async countByPrefix(tenantId: string, prefix: string, year: number) {
    const documentPrefix = `${prefix}-${year}-`;
    const delegate = this.prisma.hardwareTradeDocument as typeof this.prisma.hardwareTradeDocument & {
      count?: typeof this.prisma.hardwareTradeDocument.count;
      findMany?: typeof this.prisma.hardwareTradeDocument.findMany;
    };

    let documentMaximum = typeof delegate.count === "function"
      ? await delegate.count({ where: { documentNumber: { startsWith: documentPrefix }, tenantId } })
      : 0;

    if (typeof delegate.findMany === "function") {
      const documents = await delegate.findMany({
        select: { documentNumber: true },
        where: { documentNumber: { startsWith: documentPrefix }, tenantId },
      });
      documentMaximum = documents.reduce((maximum, document) => {
        const value = Number(document.documentNumber.slice(documentPrefix.length));
        return Number.isSafeInteger(value) ? Math.max(maximum, value) : maximum;
      }, documentMaximum);
    }

    if (typeof this.prisma.$queryRaw !== "function") return documentMaximum;
    const leaseRows = await this.prisma.$queryRaw<Array<{ maximum: number }>>`
      SELECT COALESCE(MAX("endValue"), 0)::int AS "maximum"
      FROM "OfflineDocumentLease"
      WHERE "tenantId" = ${tenantId}
        AND "series" = ${prefix}
        AND "financialYear" = ${String(year)}
    `;
    return Math.max(documentMaximum, leaseRows[0]?.maximum ?? 0);
  }

  findByNumber(tenantId: string, documentNumber: string) {
    return this.prisma.hardwareTradeDocument.findFirst({ where: { documentNumber, tenantId } });
  }

  create(input: {
    actorId: string;
    data: Prisma.HardwareTradeDocumentUncheckedCreateInput;
    items: Prisma.HardwareTradeDocumentItemUncheckedCreateWithoutDocumentInput[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.hardwareTradeDocument.create({
        data: {
          ...input.data,
          items: { create: input.items },
        },
        include: tradeInclude,
      });
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: input.actorId,
          documentId: document.id,
          summary: `Created ${document.documentNumber}`,
          tenantId: document.tenantId,
          verb: HardwareTradeTimelineVerb.CREATED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_CATALOG_UPDATED,
          actorId: input.actorId,
          metadata: { tradeAction: "created" },
          targetId: document.id,
          targetType: "HardwareTradeDocument",
          tenantId: document.tenantId,
        },
      });
      return document;
    });
  }

  confirm(input: {
    actorId: string;
    afterConfirm?: (
      tx: Prisma.TransactionClient,
      document: HardwareTradeDocumentWithRelations,
    ) => Promise<void>;
    documentId: string;
    movements: Prisma.HardwareInventoryMovementUncheckedCreateInput[];
    paymentStatus?: string | undefined;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.hardwareTradeDocument.update({
        data: {
          confirmedAt: new Date(),
          ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
          status: HardwareTradeDocumentStatus.CONFIRMED,
        },
        include: tradeInclude,
        where: { id: input.documentId, tenantId: input.tenantId },
      });
      for (const movement of input.movements) {
        await tx.hardwareInventoryMovement.create({ data: movement });
      }
      if (input.afterConfirm) {
        await input.afterConfirm(tx, document);
      }
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: input.actorId,
          documentId: input.documentId,
          metadata: { movements: input.movements.length },
          summary: `Confirmed ${document.documentNumber}`,
          tenantId: input.tenantId,
          verb: document.type === HardwareTradeDocumentType.SALE_RETURN || document.type === HardwareTradeDocumentType.PURCHASE_RETURN
            ? HardwareTradeTimelineVerb.RETURNED
            : HardwareTradeTimelineVerb.CONFIRMED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_STOCK_MOVED,
          actorId: input.actorId,
          metadata: { movements: input.movements.length, tradeAction: "confirmed" },
          targetId: document.id,
          targetType: "HardwareTradeDocument",
          tenantId: input.tenantId,
        },
      });
      return document;
    });
  }

  linkInvoice(input: {
    actorId: string;
    billingInvoiceId: string;
    documentId: string;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.hardwareTradeDocument.update({
        data: { billingInvoiceId: input.billingInvoiceId, paymentStatus: "linked" },
        include: tradeInclude,
        where: { id: input.documentId, tenantId: input.tenantId },
      });
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: input.actorId,
          documentId: input.documentId,
          metadata: { billingInvoiceId: input.billingInvoiceId },
          summary: `Drafted billing invoice for ${document.documentNumber}`,
          tenantId: input.tenantId,
          verb: HardwareTradeTimelineVerb.INVOICE_DRAFTED,
        },
      });
      return document;
    });
  }
}

export function movementTypeForDocument(type: HardwareTradeDocumentType) {
  if (
    type === HardwareTradeDocumentType.PURCHASE_ENTRY ||
    type === HardwareTradeDocumentType.SUPPLIER_BILL ||
    type === HardwareTradeDocumentType.SALE_RETURN
  ) {
    return HardwareInventoryMovementType.STOCK_IN;
  }
  return HardwareInventoryMovementType.STOCK_OUT;
}

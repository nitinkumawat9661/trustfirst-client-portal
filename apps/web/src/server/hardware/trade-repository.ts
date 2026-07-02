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
  items: true,
  timeline: { orderBy: { occurredAt: "desc" as const }, take: 30 },
};

export class PrismaHardwareTradeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string, types?: HardwareTradeDocumentType[]) {
    return this.prisma.hardwareTradeDocument.findMany({
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

  countByPrefix(tenantId: string, prefix: string, year: number) {
    return this.prisma.hardwareTradeDocument.count({
      where: { documentNumber: { startsWith: `${prefix}-${year}-` }, tenantId },
    });
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
    documentId: string;
    movements: Prisma.HardwareInventoryMovementUncheckedCreateInput[];
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.hardwareTradeDocument.update({
        data: { confirmedAt: new Date(), status: HardwareTradeDocumentStatus.CONFIRMED },
        include: tradeInclude,
        where: { id: input.documentId, tenantId: input.tenantId },
      });
      for (const movement of input.movements) {
        await tx.hardwareInventoryMovement.create({ data: movement });
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

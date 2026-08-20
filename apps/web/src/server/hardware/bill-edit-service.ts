import {
  AuditAction,
  BillingTimelineVerb,
  FinancialTransactionStatus,
  FinancialTransactionType,
  HardwareInventoryMovementType,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  HardwareTradeTimelineVerb,
  InvoiceStatus,
  PaymentProvider,
  type PaymentMode,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import {
  postCustomerPayment,
  postFinancialReversal,
  postPurchasePayable,
  postPurchaseReturnCredit,
  postSaleReceivable,
  postSaleReturnCredit,
  postSupplierPayment,
} from "../financial/financial-service";
import { PermissionResolverService } from "../permissions";
import { AppError } from "../domain/errors";
import { calculateTradeTotals } from "./trade-calculations";
import type { HardwareBillUpdateInput } from "./trade-schemas";
import type { HardwareBillAuditEntry, HardwareBillEditData } from "./trade-types";

type ActorContext = { tenantId: string; userId: string };

const editableTypes = new Set<HardwareTradeDocumentType>([
  HardwareTradeDocumentType.SALES_ORDER,
  HardwareTradeDocumentType.SALES_QUOTATION,
  HardwareTradeDocumentType.PURCHASE_ENTRY,
  HardwareTradeDocumentType.SUPPLIER_BILL,
]);

const purchaseTypes = new Set<HardwareTradeDocumentType>([
  HardwareTradeDocumentType.PURCHASE_ENTRY,
  HardwareTradeDocumentType.SUPPLIER_BILL,
]);

const activeBillFinancialTypes: FinancialTransactionType[] = [
  FinancialTransactionType.SALE_RECEIVABLE,
  FinancialTransactionType.CUSTOMER_PAYMENT,
  FinancialTransactionType.CUSTOMER_REFUND_PENDING,
  FinancialTransactionType.SALE_RETURN_CREDIT,
  FinancialTransactionType.PURCHASE_PAYABLE,
  FinancialTransactionType.SUPPLIER_PAYMENT,
  FinancialTransactionType.PURCHASE_RETURN_CREDIT,
];

export class HardwareBillEditService {
  private readonly permissions: PermissionResolverService;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
  }

  async billForEdit(context: ActorContext, documentId: string): Promise<HardwareBillEditData> {
    const document = await this.documentForEdit(context, documentId);
    const purchase = purchaseTypes.has(document.type);
    await this.enforce(context, purchase ? "hardware.purchase.manage" : "hardware.sales.manage");
    if (document.status !== HardwareTradeDocumentStatus.CONFIRMED) {
      throw validation("Only confirmed bills can be corrected through the audited editor.");
    }
    const effects = await this.loadEffects(this.prisma, context.tenantId, document);
    const metadata = asRecord(document.metadata);
    const movement = effects.stockMovements.at(-1);
    return {
      alreadyPaidAmountCents: paidEffectAmount(effects.financialTransactions),
      customerAddress: readString(metadata.customerAddress) ?? "",
      customerId: purchase ? document.supplierId ?? "" : document.customerId ?? "",
      customerName: purchase ? document.supplier?.name ?? "" : document.customer?.name ?? "",
      documentDate: readString(metadata.documentDate) ?? document.createdAt.toISOString().slice(0, 10),
      documentNumber: document.documentNumber,
      id: document.id,
      invoiceDiscountCents: readNumber(metadata.invoiceDiscountCents) ?? 0,
      invoiceNumber: document.billingInvoice?.invoiceNumber ?? null,
      items: document.items.map((item) => {
        const itemMetadata = asRecord(item.metadata);
        const grossCents = item.quantity * item.unitAmountCents;
        return {
          discountPercent: readNumber(itemMetadata.discountPercent)
            ?? (grossCents > 0 ? Math.round((item.discountCents / grossCents) * 10_000) / 100 : 0),
          gstRate: item.taxRateBps / 100,
          hsnCode: readString(itemMetadata.hsnCode) ?? "",
          productId: item.productId,
          productName: item.description,
          quantity: item.quantity,
          unitCode: readString(itemMetadata.unitCode) ?? item.product.unit?.code ?? "",
          unitRateCents: item.unitAmountCents,
        };
      }),
      locationId: readString(metadata.stockLocationId) ?? movement?.locationId ?? "",
      notes: readString(metadata.notes) ?? document.billingInvoice?.summary ?? "",
      paidAmountCents: paidEffectAmount(effects.financialTransactions),
      paymentMode: paymentModeForEffects(effects.financialTransactions) ?? readString(metadata.paymentMode) ?? "CASH",
      referenceNumber: readString(metadata.referenceNumber) ?? "",
      roundOffCents: document.roundOffCents,
      status: document.status,
      taxMode: metadata.taxMode === "inter-state" ? "inter-state" : "intra-state",
      type: document.type as HardwareBillEditData["type"],
    };
  }

  async auditHistory(context: ActorContext, documentId: string): Promise<HardwareBillAuditEntry[]> {
    const document = await this.documentForEdit(context, documentId);
    await this.enforce(
      context,
      purchaseTypes.has(document.type) ? "hardware.purchase.read" : "hardware.sales.read",
    );
    const events = await this.prisma.auditEvent.findMany({
      include: { actor: { select: { email: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      where: { targetId: document.id, targetType: "HardwareTradeDocument", tenantId: context.tenantId },
    });
    return events.flatMap((event) => {
      const metadata = asRecord(event.metadata);
      if (metadata.tradeAction !== "bill_edited") return [];
      return [{
        actorName: event.actor?.name ?? event.actor?.email ?? event.actorId ?? "Unknown user",
        after: asRecord(metadata.after),
        before: asRecord(metadata.before),
        id: event.id,
        occurredAt: event.occurredAt,
        reason: readString(metadata.reason) ?? "No reason recorded",
        repostIds: readStringArray(metadata.repostIds),
        reversalIds: readStringArray(metadata.reversalIds),
      }];
    });
  }

  async billForAudit(context: ActorContext, documentId: string) {
    const document = await this.documentForEdit(context, documentId);
    await this.enforce(
      context,
      purchaseTypes.has(document.type) ? "hardware.purchase.read" : "hardware.sales.read",
    );
    return { documentNumber: document.documentNumber, id: document.id };
  }

  async updateBill(context: ActorContext, documentId: string, input: HardwareBillUpdateInput) {
    const existing = await this.documentForEdit(context, documentId);
    if (existing.type !== input.type) throw validation("Bill type cannot be changed.");
    const purchase = purchaseTypes.has(existing.type);
    await this.enforce(context, purchase ? "hardware.purchase.manage" : "hardware.sales.manage");
    if (existing.status !== HardwareTradeDocumentStatus.CONFIRMED) {
      throw validation("Only confirmed bills can be corrected through the audited editor.");
    }
    if (readString(asRecord(existing.metadata).lastEditIdempotencyKey) === input.idempotencyKey) {
      return { documentNumber: existing.documentNumber, id: existing.id };
    }
    await this.validateLinks(context.tenantId, input, purchase);
    const products = await this.prisma.hardwareProduct.findMany({
      include: { unit: true },
      where: { id: { in: [...new Set(input.items.map((item) => item.productId))] }, tenantId: context.tenantId },
    });
    if (products.length !== new Set(input.items.map((item) => item.productId)).size) {
      throw validation("One or more products were not found.");
    }
    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = input.items.map((item) => ({ ...item, taxRateBps: item.taxRateBps ?? 0 }));
    const itemTotals = calculateTradeTotals(normalizedItems, input.roundOffCents ?? 0);
    const invoiceDiscountCents = purchase ? 0 : input.invoiceDiscountCents;
    const totalCents = Math.max(itemTotals.totalCents - invoiceDiscountCents, 0);
    const now = new Date();
    const version = `edit-${input.idempotencyKey}`;

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.hardwareTradeDocument.findFirst({
        include: documentInclude,
        where: { id: documentId, tenantId: context.tenantId },
      });
      if (!current) throw validation("Bill was not found.");
      if (current.type !== input.type) throw validation("Bill type cannot be changed.");
      if (current.status !== HardwareTradeDocumentStatus.CONFIRMED) {
        throw validation("Only confirmed bills can be corrected through the audited editor.");
      }
      if (readString(asRecord(current.metadata).lastEditIdempotencyKey) === input.idempotencyKey) {
        return { documentNumber: current.documentNumber, id: current.id };
      }
      const effects = await this.loadEffects(tx, context.tenantId, current);
      await assertStockWillRemainNonNegative(tx, context.tenantId, current.type, effects.stockMovements, input.locationId, normalizedItems);

      const before = jsonSnapshot({
        document: current,
        financialTransactions: effects.financialTransactions,
        paymentRecords: effects.paymentRecords,
        stockMovements: effects.stockMovements,
      });
      const reversalIds: string[] = [];
      const repostIds: string[] = [];

      for (const movement of effects.stockMovements) {
        const reversal = await tx.hardwareInventoryMovement.create({
          data: {
            customerId: current.customerId,
            locationId: movement.locationId,
            metadata: { billEditVersion: version, reason: input.reason, reversedMovementId: movement.id },
            productId: movement.productId,
            quantity: movement.quantity,
            referenceId: current.id,
            referenceType: "BILL_EDIT_REVERSAL",
            supplierId: current.supplierId,
            tenantId: context.tenantId,
            type: movement.type === HardwareInventoryMovementType.STOCK_OUT
              ? HardwareInventoryMovementType.STOCK_IN
              : HardwareInventoryMovementType.STOCK_OUT,
            unitCostCents: movement.unitCostCents,
            unitPriceCents: movement.unitPriceCents,
          },
        });
        reversalIds.push(reversal.id);
      }

      for (const transaction of effects.financialTransactions) {
        const reversal = await postFinancialReversal(tx, {
          amountCents: transaction.amountCents,
          createdById: context.userId,
          hardwareDocumentId: current.id,
          idempotencyKey: `${version}:reverse:${transaction.id}`,
          invoiceId: current.billingInvoiceId,
          notes: input.reason,
          occurredAt: now,
          original: transaction,
          partyId: transaction.partyId,
          reason: input.reason,
          sourceId: current.id,
          sourceNumber: current.documentNumber,
          sourceType: "HardwareTradeDocument",
          tenantId: context.tenantId,
        });
        reversalIds.push(reversal.id);
      }

      for (const payment of effects.paymentRecords) {
        await tx.paymentRecord.update({
          data: { metadata: { ...asRecord(payment.metadata), billEditReversedAt: now.toISOString(), billEditVersion: version, reason: input.reason } },
          where: { id: payment.id },
        });
        reversalIds.push(payment.id);
      }

      const oldPaidAmountCents = paidEffectAmount(effects.financialTransactions);
      const { allocatedPaymentCents, correctedPaidAmountCents, creditCents } = calculateBillPaymentCorrection({
        alreadyPaidAmountCents: oldPaidAmountCents,
        correctedTotalCents: totalCents,
        requestedPaidAmountCents: input.paidAmountCents,
      });
      const paymentStatus = creditCents > 0
        ? "credit"
        : allocatedPaymentCents >= totalCents
          ? "paid"
          : allocatedPaymentCents > 0
            ? "partial"
            : "unpaid";
      const metadata = {
        ...asRecord(current.metadata),
        ...asRecord(input.metadata),
        invoiceDiscountCents,
        lastEditIdempotencyKey: input.idempotencyKey,
        lastEditReason: input.reason,
        paidAmountCents: correctedPaidAmountCents,
        paymentMode: input.paymentMode ?? null,
        stockLocationId: input.locationId,
        stockMovementVersion: version,
      } as Prisma.InputJsonValue;

      await tx.hardwareTradeDocumentItem.deleteMany({ where: { documentId: current.id, tenantId: context.tenantId } });
      await tx.hardwareTradeDocument.update({
        data: {
          customerId: purchase ? null : input.customerId ?? null,
          discountCents: itemTotals.discountCents + invoiceDiscountCents,
          items: { create: normalizedItems.map((item) => itemCreateData(context.tenantId, item, productMap)) },
          metadata,
          paymentStatus,
          roundOffCents: itemTotals.roundOffCents,
          subtotalCents: itemTotals.subtotalCents,
          supplierId: purchase ? input.supplierId ?? null : null,
          taxCents: itemTotals.taxCents,
          totalCents,
        },
        include: documentInclude,
        where: { id: current.id, tenantId: context.tenantId },
      });

      for (const item of normalizedItems) {
        const movement = await tx.hardwareInventoryMovement.create({
          data: {
            customerId: purchase ? null : input.customerId ?? null,
            locationId: input.locationId,
            metadata: { billEditVersion: version, stockMovementVersion: version, tradeDocumentId: current.id },
            productId: item.productId,
            quantity: item.quantity,
            referenceId: current.id,
            referenceType: current.type,
            supplierId: purchase ? input.supplierId ?? null : null,
            tenantId: context.tenantId,
            type: purchase ? HardwareInventoryMovementType.STOCK_IN : HardwareInventoryMovementType.STOCK_OUT,
            unitCostCents: purchase ? item.unitAmountCents : null,
            unitPriceCents: purchase ? null : item.unitAmountCents,
          },
        });
        repostIds.push(movement.id);
      }

      const receivableOrPayable = totalCents > 0
        ? purchase
          ? await postPurchasePayable(tx, postingInput(context, current, input, totalCents, version, now))
          : await postSaleReceivable(tx, postingInput(context, current, input, totalCents, version, now))
        : null;
      if (receivableOrPayable) repostIds.push(receivableOrPayable.id);

      if (allocatedPaymentCents > 0) {
        if (!receivableOrPayable) throw validation("A payment cannot be allocated to a zero-total bill.");
        const mode = input.paymentMode ?? paymentModeForEffects(effects.financialTransactions);
        if (!mode) throw validation("Payment mode is required when the bill has a paid amount.");
        const paymentRecord = !purchase && current.billingInvoiceId
          ? await tx.paymentRecord.create({
              data: {
                amountCents: allocatedPaymentCents,
                invoiceId: current.billingInvoiceId,
                metadata: { billEditVersion: version, source: "bill-edit" },
                mode,
                provider: PaymentProvider.MANUAL,
                receivedAt: now,
                recordedById: context.userId,
                tenantId: context.tenantId,
              },
            })
          : null;
        if (paymentRecord) repostIds.push(paymentRecord.id);
        const payment = purchase
          ? await postSupplierPayment(tx, paymentPostingInput(context, current, input, allocatedPaymentCents, version, now, receivableOrPayable.id, mode))
          : await postCustomerPayment(tx, paymentPostingInput(context, current, input, allocatedPaymentCents, version, now, receivableOrPayable.id, mode, paymentRecord?.id));
        repostIds.push(payment.id);
      }

      if (creditCents > 0) {
        const credit = purchase
          ? await postPurchaseReturnCredit(tx, {
              ...postingInput(context, current, input, creditCents, `${version}:supplier-credit`, now),
              settlementType: "supplier_credit",
            })
          : await postSaleReturnCredit(tx, {
              ...postingInput(context, current, input, creditCents, `${version}:customer-credit`, now),
              refundType: "customer_credit",
            });
        repostIds.push(credit.id);
      }

      if (current.billingInvoiceId && !purchase) {
        const invoiceStatus = allocatedPaymentCents >= totalCents ? InvoiceStatus.PAID : allocatedPaymentCents > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;
        await tx.invoice.update({
          data: {
            clientId: input.customerId ?? null,
            lineItems: normalizedItems.map((item) => invoiceLineData(item, productMap)) as Prisma.InputJsonValue,
            metadata,
            paidAmountCents: allocatedPaymentCents,
            paidAt: invoiceStatus === InvoiceStatus.PAID ? now : null,
            status: invoiceStatus,
            summary: readString(asRecord(input.metadata).notes) ?? null,
            totalAmountCents: totalCents,
          },
          where: { id: current.billingInvoiceId, tenantId: context.tenantId },
        });
        await tx.billingTimelineEvent.create({
          data: {
            actorId: context.userId,
            invoiceId: current.billingInvoiceId,
            metadata: { billEditVersion: version, reason: input.reason, repostIds, reversalIds },
            summary: `Corrected bill ${current.documentNumber} without renumbering`,
            tenantId: context.tenantId,
            verb: BillingTimelineVerb.INVOICE_UPDATED,
          },
        });
      }

      const finalDocument = await tx.hardwareTradeDocument.findFirst({
        include: documentInclude,
        where: { id: current.id, tenantId: context.tenantId },
      });
      if (!finalDocument) throw validation("Corrected bill could not be reloaded for audit.");
      const finalEffects = await this.loadEffects(tx, context.tenantId, finalDocument);
      const after = jsonSnapshot({
        document: finalDocument,
        financialTransactions: finalEffects.financialTransactions,
        paymentRecords: finalEffects.paymentRecords,
        stockMovements: finalEffects.stockMovements,
      });
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: context.userId,
          documentId: current.id,
          metadata: { billEditVersion: version, reason: input.reason, repostIds, reversalIds },
          summary: `Edited ${displayName(current.type)} ${current.documentNumber}`,
          tenantId: context.tenantId,
          verb: HardwareTradeTimelineVerb.UPDATED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_STOCK_MOVED,
          actorId: context.userId,
          metadata: { after, before, reason: input.reason, repostIds, reversalIds, tradeAction: "bill_edited" } as Prisma.InputJsonValue,
          targetId: current.id,
          targetType: "HardwareTradeDocument",
          tenantId: context.tenantId,
        },
      });
      return { documentNumber: current.documentNumber, id: current.id };
    }, { isolationLevel: "Serializable" });
  }

  private async documentForEdit(context: ActorContext, documentId: string) {
    const document = await this.prisma.hardwareTradeDocument.findFirst({
      include: documentInclude,
      where: { id: documentId, tenantId: context.tenantId },
    });
    if (!document) throw validation("Bill was not found.");
    if (!editableTypes.has(document.type)) throw validation("This document type is not an editable bill.");
    return document;
  }

  private loadEffects(client: PrismaClient | Prisma.TransactionClient, tenantId: string, document: BillDocument) {
    const version = readString(asRecord(document.metadata).stockMovementVersion);
    return Promise.all([
      client.financialTransaction.findMany({
        orderBy: { occurredAt: "asc" },
        where: {
          hardwareDocumentId: document.id,
          status: FinancialTransactionStatus.POSTED,
          tenantId,
          type: { in: activeBillFinancialTypes },
        },
      }),
      document.billingInvoiceId
        ? client.paymentRecord.findMany({
            orderBy: { receivedAt: "asc" },
            where: { invoiceId: document.billingInvoiceId, tenantId },
          }).then((records) => records.filter((record) => !readString(asRecord(record.metadata).billEditReversedAt)))
        : Promise.resolve([]),
      client.hardwareInventoryMovement.findMany({
        orderBy: { createdAt: "asc" },
        where: {
          referenceId: document.id,
          referenceType: document.type,
          tenantId,
          ...(version ? { metadata: { equals: version, path: ["stockMovementVersion"] } } : {}),
        },
      }),
    ]).then(([financialTransactions, paymentRecords, stockMovements]) => ({ financialTransactions, paymentRecords, stockMovements }));
  }

  private async validateLinks(tenantId: string, input: HardwareBillUpdateInput, purchase: boolean) {
    const partyId = purchase ? input.supplierId : input.customerId;
    const [location, party] = await Promise.all([
      this.prisma.hardwareStockLocation.findFirst({ where: { id: input.locationId, tenantId } }),
      partyId ? this.prisma.clientOrganization.findFirst({
        select: { customFields: true, id: true },
        where: { archivedAt: null, deletedAt: null, id: partyId, tenantId },
      }) : Promise.resolve(null),
    ]);
    if (!location) throw validation("Stock location was not found.");
    const partyFields = asRecord(party?.customFields);
    const roles = Array.isArray(partyFields.hardwarePartyRoles)
      ? partyFields.hardwarePartyRoles.filter((role) => role === "customer" || role === "supplier")
      : [];
    const legacyRole = readString(partyFields.hardwarePartyRole);
    const requiredRole = purchase ? "supplier" : "customer";
    if (partyId && (!party || (!roles.includes(requiredRole) && legacyRole !== requiredRole))) {
      throw validation(purchase ? "Supplier was not found or classified as a supplier." : "Customer was not found or classified as a customer.");
    }
    if (purchase && !partyId) throw validation("Supplier is required.");
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}.${string}`, "hardware.plugin.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

const documentInclude = {
  billingInvoice: true,
  customer: true,
  items: { include: { product: { include: { unit: true } } } },
  supplier: true,
} as const;

type BillDocument = Prisma.HardwareTradeDocumentGetPayload<{ include: typeof documentInclude }>;

async function assertStockWillRemainNonNegative(
  tx: Prisma.TransactionClient,
  tenantId: string,
  type: HardwareTradeDocumentType,
  previous: Array<{ locationId: string; productId: string; quantity: number; type: HardwareInventoryMovementType }>,
  nextLocationId: string,
  nextItems: Array<{ productId: string; quantity: number }>,
) {
  const purchase = purchaseTypes.has(type);
  const keys = new Set(previous.map((movement) => `${movement.locationId}:${movement.productId}`));
  nextItems.forEach((item) => keys.add(`${nextLocationId}:${item.productId}`));
  for (const key of keys) {
    const separator = key.indexOf(":");
    const locationId = key.slice(0, separator);
    const productId = key.slice(separator + 1);
    const movements = await tx.hardwareInventoryMovement.findMany({ where: { locationId, productId, tenantId } });
    const current = movements.reduce((stock, movement) => stock + (movement.type === HardwareInventoryMovementType.STOCK_IN ? movement.quantity : -movement.quantity), 0);
    const reverseDelta = previous
      .filter((movement) => movement.locationId === locationId && movement.productId === productId)
      .reduce((delta, movement) => delta + (movement.type === HardwareInventoryMovementType.STOCK_OUT ? movement.quantity : -movement.quantity), 0);
    const repostQuantity = locationId === nextLocationId
      ? nextItems.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0)
      : 0;
    const finalStock = current + reverseDelta + (purchase ? repostQuantity : -repostQuantity);
    if (finalStock < 0) throw validation("Edited bill would create negative stock at the selected location.");
  }
}

function itemCreateData(
  tenantId: string,
  item: HardwareBillUpdateInput["items"][number],
  products: Map<string, { id: string; name: string; metadata: Prisma.JsonValue }>,
) {
  const product = products.get(item.productId);
  if (!product) throw validation("Product was not found.");
  const line = calculateTradeTotals([{ ...item, taxRateBps: item.taxRateBps ?? 0 }]);
  const itemMetadata = asRecord(item.metadata);
  return {
    description: product.name,
    discountCents: item.discountCents ?? 0,
    lineTotalCents: line.totalCents,
    metadata: { ...itemMetadata, hsnCode: readString(itemMetadata.hsnCode) ?? readString(asRecord(product.metadata).hsnCode) } as Prisma.InputJsonValue,
    productId: item.productId,
    quantity: item.quantity,
    taxCents: line.taxCents,
    taxRateBps: item.taxRateBps ?? 0,
    tenantId,
    unitAmountCents: item.unitAmountCents,
  };
}

function invoiceLineData(
  item: HardwareBillUpdateInput["items"][number],
  products: Map<string, { id: string; name: string; metadata: Prisma.JsonValue }>,
) {
  const product = products.get(item.productId);
  const line = calculateTradeTotals([{ ...item, taxRateBps: item.taxRateBps ?? 0 }]);
  const metadata = asRecord(item.metadata);
  return {
    description: product?.name ?? "Item",
    discountCents: item.discountCents ?? 0,
    hsnCode: readString(metadata.hsnCode) ?? readString(asRecord(product?.metadata).hsnCode),
    productId: item.productId,
    quantity: item.quantity,
    taxCents: line.taxCents,
    taxRateBps: item.taxRateBps ?? 0,
    totalAmountCents: line.totalCents,
    unitAmountCents: item.unitAmountCents,
  };
}

function postingInput(
  context: ActorContext,
  document: BillDocument,
  input: HardwareBillUpdateInput,
  amountCents: number,
  version: string,
  occurredAt: Date,
) {
  const purchase = purchaseTypes.has(document.type);
  return {
    amountCents,
    createdById: context.userId,
    hardwareDocumentId: document.id,
    idempotencyKey: `${version}:${purchase ? "payable" : "receivable"}`,
    invoiceId: document.billingInvoiceId,
    notes: readString(asRecord(input.metadata).notes) ?? null,
    occurredAt,
    partyId: purchase ? input.supplierId ?? null : input.customerId ?? null,
    sourceId: document.id,
    sourceNumber: document.documentNumber,
    sourceType: "HardwareTradeDocument",
    tenantId: context.tenantId,
  };
}

function paymentPostingInput(
  context: ActorContext,
  document: BillDocument,
  input: HardwareBillUpdateInput,
  amountCents: number,
  version: string,
  occurredAt: Date,
  allocationTargetTransactionId: string,
  mode: PaymentMode,
  paymentRecordId?: string,
) {
  const purchase = purchaseTypes.has(document.type);
  return {
    allocationTargetTransactionId,
    amountCents,
    createdById: context.userId,
    hardwareDocumentId: document.id,
    idempotencyKey: `${version}:${purchase ? "supplier-payment" : "customer-payment"}`,
    invoiceId: document.billingInvoiceId,
    mode,
    notes: readString(asRecord(input.metadata).notes) ?? null,
    occurredAt,
    partyId: purchase ? input.supplierId ?? null : input.customerId ?? null,
    sourceId: paymentRecordId ?? document.id,
    sourceNumber: document.billingInvoice?.invoiceNumber ?? document.documentNumber,
    sourceType: paymentRecordId ? "PaymentRecord" : "HardwareTradeDocument",
    tenantId: context.tenantId,
  };
}

function paidEffectAmount(transactions: Array<{ amountCents: number; type: FinancialTransactionType }>) {
  const paymentTypes = new Set<FinancialTransactionType>([
    FinancialTransactionType.CUSTOMER_PAYMENT,
    FinancialTransactionType.SUPPLIER_PAYMENT,
    FinancialTransactionType.CUSTOMER_REFUND_PENDING,
    FinancialTransactionType.SALE_RETURN_CREDIT,
    FinancialTransactionType.PURCHASE_RETURN_CREDIT,
  ]);
  return transactions.filter((entry) => paymentTypes.has(entry.type)).reduce((sum, entry) => sum + entry.amountCents, 0);
}

export function calculateBillPaymentCorrection(input: {
  alreadyPaidAmountCents: number;
  correctedTotalCents: number;
  requestedPaidAmountCents: number;
}) {
  const correctedPaidAmountCents = Math.max(
    input.requestedPaidAmountCents,
    input.alreadyPaidAmountCents,
  );
  return {
    allocatedPaymentCents: Math.min(correctedPaidAmountCents, input.correctedTotalCents),
    correctedPaidAmountCents,
    creditCents: Math.max(correctedPaidAmountCents - input.correctedTotalCents, 0),
  };
}

function paymentModeForEffects(transactions: Array<{ paymentMode: PaymentMode | null; type: FinancialTransactionType }>) {
  return transactions.find((entry) =>
    entry.type === FinancialTransactionType.CUSTOMER_PAYMENT || entry.type === FinancialTransactionType.SUPPLIER_PAYMENT,
  )?.paymentMode ?? null;
}

function displayName(type: HardwareTradeDocumentType) {
  if (type === HardwareTradeDocumentType.SALES_QUOTATION) return "Estimate Bill";
  if (purchaseTypes.has(type)) return "Purchase Bill";
  return "Sales Bill";
}

function jsonSnapshot(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

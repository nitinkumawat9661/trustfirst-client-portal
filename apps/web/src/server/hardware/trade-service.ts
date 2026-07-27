import {
  AuditAction,
  BillingTimelineVerb,
  DocumentSequenceKind,
  HardwareInventoryMovementType,
  HardwareTradeDocumentType,
  HardwareTradeDocumentStatus,
  HardwareTradeTimelineVerb,
  InvoiceStatus,
  PaymentMode,
  PaymentProvider,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { allocateDocumentNumber } from "../billing/document-sequence";
import { AppError } from "../domain/errors";
import {
  postCustomerPayment,
  postPurchasePayable,
  postSaleCancellationFinancials,
  postSaleReceivable,
  postSaleReturnCredit,
  postSupplierPayment,
} from "../financial/financial-service";
import { MANGALAM_TENANT_SLUG } from "../domain/host-routing";
import { PermissionResolverService } from "../permissions";
import { currentIndiaBusinessDay } from "./business-time";
import { stockForProduct } from "./hardware-service";
import { calculateTradeTotals } from "./trade-calculations";
import { movementTypeForDocument, PrismaHardwareTradeRepository } from "./trade-repository";
import type {
  HardwareSaleReturnInput,
  HardwareTradeCancelInput,
  HardwareTradeDocumentInput,
  HardwareTradeStatusInput,
  QuickPosSaleInput,
} from "./trade-schemas";
import type { HardwarePrintContract, HardwarePrintProjection, HardwareReportSummary, HardwareTradeSummary, HardwareWhatsAppShareContract } from "./trade-types";

type ActorContext = { tenantId: string; userId: string };
type TradeRecord = Awaited<ReturnType<PrismaHardwareTradeRepository["list"]>>[number];
type TradeFullRecord = NonNullable<Awaited<ReturnType<PrismaHardwareTradeRepository["findById"]>>>;

const prefixes: Record<HardwareTradeDocumentType, string> = {
  PURCHASE_ENTRY: "HPE",
  PURCHASE_ORDER: "HPO",
  PURCHASE_RETURN: "HPR",
  SALES_ORDER: "HSO",
  SALES_QUOTATION: "HSQ",
  SALE_RETURN: "HSR",
  SUPPLIER_BILL: "HSB",
};

const salesTypes = new Set<HardwareTradeDocumentType>([
  HardwareTradeDocumentType.SALES_ORDER,
  HardwareTradeDocumentType.SALES_QUOTATION,
]);

const purchaseTypes = new Set<HardwareTradeDocumentType>([
  HardwareTradeDocumentType.PURCHASE_ORDER,
  HardwareTradeDocumentType.PURCHASE_ENTRY,
  HardwareTradeDocumentType.SUPPLIER_BILL,
]);

const outstandingInvoiceStatuses = new Set<InvoiceStatus>([
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
]);

export class HardwareTradeService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaHardwareTradeRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaHardwareTradeRepository(prisma);
  }

  async listSales(context: ActorContext) {
    await this.enforce(context, "hardware.sales.read");
    return (await this.repository.list(context.tenantId, [
      HardwareTradeDocumentType.SALES_ORDER,
      HardwareTradeDocumentType.SALE_RETURN,
    ])).map(toSummary);
  }

  async listQuotations(context: ActorContext) {
    await this.enforce(context, "hardware.sales.read");
    return (await this.repository.list(context.tenantId, [
      HardwareTradeDocumentType.SALES_QUOTATION,
    ])).map(toSummary);
  }

  async listPurchases(context: ActorContext) {
    await this.enforce(context, "hardware.purchase.read");
    return (await this.repository.list(context.tenantId, [
      HardwareTradeDocumentType.PURCHASE_ORDER,
      HardwareTradeDocumentType.PURCHASE_ENTRY,
      HardwareTradeDocumentType.SUPPLIER_BILL,
      HardwareTradeDocumentType.PURCHASE_RETURN,
    ])).map(toSummary);
  }

  async create(context: ActorContext, input: HardwareTradeDocumentInput) {
    await this.enforce(context, managePermission(input.type));
    await this.validateTradeLinks(context.tenantId, input);
    await this.assertUniqueSupplierReference(context.tenantId, input);
    const products = await this.loadProducts(context.tenantId, input.items.map((item) => item.productId));
    const normalizedItems = input.items.map((item) => {
      const product = products.get(item.productId);
      if (!product) throw validation("Product was not found.");
      return { ...item, taxRateBps: item.taxRateBps ?? taxRateFromConfig(product.gstTaxConfig) };
    });
    const totals = calculateTradeTotals(normalizedItems, input.roundOffCents ?? 0);
    const documentNumber = await this.nextNumber(context.tenantId, input.type);
    return this.repository.create({
      actorId: context.userId,
      data: stripUndefined({
        billingInvoiceId: input.billingInvoiceId,
        currency: input.currency ?? "INR",
        customerId: input.customerId,
        discountCents: totals.discountCents,
        documentNumber,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        paymentStatus: input.billingInvoiceId ? "linked" : "unlinked",
        projectId: input.projectId,
        requirementId: input.requirementId,
        roundOffCents: totals.roundOffCents,
        subtotalCents: totals.subtotalCents,
        supplierId: input.supplierId,
        taxCents: totals.taxCents,
        tenantId: context.tenantId,
        totalCents: totals.totalCents,
        type: input.type,
      }) as Prisma.HardwareTradeDocumentUncheckedCreateInput,
      items: normalizedItems.map((item) => {
        const product = products.get(item.productId);
        if (!product) throw validation("Product was not found.");
        const line = calculateTradeTotals([item]);
        return {
          description: product.name,
          discountCents: item.discountCents ?? 0,
          lineTotalCents: line.totalCents,
          metadata: (item.metadata ?? {}) as Prisma.InputJsonValue,
          productId: item.productId,
          quantity: item.quantity,
          taxCents: line.taxCents,
          taxRateBps: item.taxRateBps ?? taxRateFromConfig(product.gstTaxConfig),
          tenantId: context.tenantId,
          unitAmountCents: item.unitAmountCents,
        };
      }),
    });
  }

  async confirm(context: ActorContext, documentId: string, input: HardwareTradeStatusInput) {
    const document = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, managePermission(document.type));
    if (document.status !== "DRAFT") throw validation("Only draft hardware documents can be confirmed.");
    const nonStockDocument =
      document.type === HardwareTradeDocumentType.SALES_QUOTATION ||
      document.type === HardwareTradeDocumentType.PURCHASE_ORDER;
    if (!nonStockDocument && !input.locationId) {
      throw validation("A stock location is required to confirm this document.");
    }
    if (input.locationId) {
      await this.ensureLocation(context.tenantId, input.locationId);
      await this.ensureStockAvailable(context.tenantId, document, input.locationId);
    }
    const stockItems = document.items.filter((item) => !isStockSetupPending(item.product?.metadata));
    return this.repository.confirm({
      actorId: context.userId,
      afterConfirm: async (tx, confirmedDocument) => {
        if (
          confirmedDocument.type !== HardwareTradeDocumentType.PURCHASE_ENTRY &&
          confirmedDocument.type !== HardwareTradeDocumentType.SUPPLIER_BILL
        ) {
          return;
        }

        const now = new Date();
        const payable = await postPurchasePayable(tx, {
          amountCents: confirmedDocument.totalCents,
          createdById: context.userId,
          hardwareDocumentId: confirmedDocument.id,
          idempotencyKey: `${confirmedDocument.id}:purchase-payable`,
          notes: readString(asRecord(confirmedDocument.metadata).notes) ?? null,
          occurredAt: now,
          partyId: confirmedDocument.supplierId,
          sourceId: confirmedDocument.id,
          sourceNumber: confirmedDocument.documentNumber,
          sourceType: "HardwareTradeDocument",
          tenantId: context.tenantId,
        });
        const paymentMode = paymentModeFromMetadata(confirmedDocument.metadata);
        if (paymentMode) {
          await postSupplierPayment(tx, {
            allocationTargetTransactionId: payable.id,
            amountCents: confirmedDocument.totalCents,
            createdById: context.userId,
            hardwareDocumentId: confirmedDocument.id,
            idempotencyKey: `${confirmedDocument.id}:supplier-payment`,
            mode: paymentMode,
            notes: readString(asRecord(confirmedDocument.metadata).referenceNumber) ?? null,
            occurredAt: now,
            partyId: confirmedDocument.supplierId,
            sourceId: confirmedDocument.id,
            sourceNumber: confirmedDocument.documentNumber,
            sourceType: "HardwareTradeDocument",
            tenantId: context.tenantId,
          });
        }
      },
      documentId,
      movements: nonStockDocument ? [] : stockItems.map((item) =>
        stripUndefined({
          customerId: document.customerId,
          locationId: input.locationId,
          metadata: { tradeDocumentId: document.id } as Prisma.InputJsonValue,
          productId: item.productId,
          quantity: item.quantity,
          referenceId: document.id,
          referenceType: document.type,
          supplierId: document.supplierId,
          tenantId: context.tenantId,
          type: movementTypeForDocument(document.type),
          unitCostCents: purchaseTypes.has(document.type) ? item.unitAmountCents : undefined,
          unitPriceCents: salesTypes.has(document.type) || document.type === HardwareTradeDocumentType.SALE_RETURN ? item.unitAmountCents : undefined,
        }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
      ),
      tenantId: context.tenantId,
    });
  }

  async postQuickPosSale(context: ActorContext, input: QuickPosSaleInput) {
    await this.enforce(context, "hardware.sales.manage");
    await this.ensureLocation(context.tenantId, input.locationId);
    if (input.customerId) {
      await this.ensureParty(context.tenantId, input.customerId, "customer", "Customer link was not found or is not classified as a customer.");
    }

    const existing = await this.prisma.hardwareTradeDocument.findFirst({
      include: { billingInvoice: true, customer: true, items: true, supplier: true },
      where: {
        metadata: { equals: input.idempotencyKey, path: ["idempotencyKey"] },
        tenantId: context.tenantId,
        type: HardwareTradeDocumentType.SALES_ORDER,
      },
    });
    if (existing) {
      return {
        documentId: existing.id,
        documentNumber: existing.documentNumber,
        invoiceId: existing.billingInvoiceId,
        invoiceNumber: existing.billingInvoice?.invoiceNumber ?? null,
        paymentStatus: existing.paymentStatus,
        totalCents: existing.totalCents,
      };
    }

    const products = await this.loadProducts(context.tenantId, input.items.map((item) => item.productId));
    const normalizedItems = input.items.map((item) => {
      const product = products.get(item.productId);
      if (!product) throw validation("Product was not found.");
      return { ...item, taxRateBps: item.taxRateBps ?? taxRateFromConfig(product.gstTaxConfig) };
    });
    const itemTotals = calculateTradeTotals(normalizedItems, input.roundOffCents ?? 0);
    const invoiceDiscountCents = input.invoiceDiscountCents ?? 0;
    const totalCents = Math.max(itemTotals.totalCents - invoiceDiscountCents, 0);
    if (input.clientTotalCents !== totalCents) {
      throw validation("Bill total changed on the server. Review the bill and submit again.");
    }
    if (input.paidAmountCents > totalCents) {
      throw validation("Paid amount cannot exceed bill total.");
    }

    const trackedItems = normalizedItems.filter((item) => !isStockSetupPending(products.get(item.productId)?.metadata));
    for (const item of trackedItems) {
      const movements = await this.prisma.hardwareInventoryMovement.findMany({
        where: { locationId: input.locationId, productId: item.productId, tenantId: context.tenantId },
      });
      if (item.quantity > stockForProduct(movements)) {
        throw validation("Confirmed sale cannot deduct more stock than available.");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ select: { slug: true }, where: { id: context.tenantId } });
      const invoicePrefix = tenant?.slug === MANGALAM_TENANT_SLUG ? "MS/INV" : "INV";
      const invoiceNumber = await allocateDocumentNumber(tx, {
        kind: DocumentSequenceKind.INVOICE,
        prefix: invoicePrefix,
        tenantId: context.tenantId,
      });
      const tradeNumber = await this.nextNumber(context.tenantId, HardwareTradeDocumentType.SALES_ORDER);
      const nextInvoiceStatus =
        input.paidAmountCents >= totalCents
          ? InvoiceStatus.PAID
          : input.paidAmountCents > 0
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.ISSUED;
      const now = new Date();
      const invoice = await tx.invoice.create({
        data: stripUndefined({
          clientId: input.customerId,
          currency: "INR",
          invoiceNumber,
          issuedAt: now,
          lineItems: normalizedItems.map((item) => {
            const product = products.get(item.productId);
            const line = calculateTradeTotals([item]);
            return {
              description: product?.name ?? "Item",
              discountCents: item.discountCents ?? 0,
              productId: item.productId,
              quantity: item.quantity,
              taxCents: line.taxCents,
              taxRateBps: item.taxRateBps ?? 0,
              totalAmountCents: line.totalCents,
              unitAmountCents: item.unitAmountCents,
            };
          }) as Prisma.InputJsonValue,
          metadata: {
            idempotencyKey: input.idempotencyKey,
            invoiceDiscountCents,
            notes: input.notes ?? null,
            source: "quick-pos",
            taxMode: input.taxMode,
          },
          ownerId: context.userId,
          paidAmountCents: input.paidAmountCents,
          paidAt: nextInvoiceStatus === InvoiceStatus.PAID ? now : null,
          status: nextInvoiceStatus,
          summary: input.notes ?? null,
          tenantId: context.tenantId,
          title: `Counter sale ${invoiceNumber}`,
          totalAmountCents: totalCents,
        }) as Prisma.InvoiceUncheckedCreateInput,
      });
      const document = await tx.hardwareTradeDocument.create({
        data: stripUndefined({
          billingInvoiceId: invoice.id,
          confirmedAt: now,
          currency: "INR",
          customerId: input.customerId,
          discountCents: itemTotals.discountCents + invoiceDiscountCents,
          documentNumber: tradeNumber,
          items: {
            create: normalizedItems.map((item) => {
              const product = products.get(item.productId);
              const line = calculateTradeTotals([item]);
              return {
                description: product?.name ?? "Item",
                discountCents: item.discountCents ?? 0,
                lineTotalCents: line.totalCents,
                metadata: (item.metadata ?? {}) as Prisma.InputJsonValue,
                productId: item.productId,
                quantity: item.quantity,
                taxCents: line.taxCents,
                taxRateBps: item.taxRateBps ?? 0,
                tenantId: context.tenantId,
                unitAmountCents: item.unitAmountCents,
              };
            }),
          },
          metadata: {
            idempotencyKey: input.idempotencyKey,
            invoiceDiscountCents,
            notes: input.notes ?? null,
            posFlow: "quick-pos",
            taxMode: input.taxMode,
            walkInCustomer: !input.customerId,
          },
          paymentStatus: nextInvoiceStatus === InvoiceStatus.PAID ? "paid" : nextInvoiceStatus === InvoiceStatus.PARTIALLY_PAID ? "partial" : "unpaid",
          roundOffCents: itemTotals.roundOffCents,
          status: HardwareTradeDocumentStatus.CONFIRMED,
          subtotalCents: itemTotals.subtotalCents,
          taxCents: itemTotals.taxCents,
          tenantId: context.tenantId,
          totalCents,
          type: HardwareTradeDocumentType.SALES_ORDER,
        }) as Prisma.HardwareTradeDocumentUncheckedCreateInput,
      });
      const saleReceivable = await postSaleReceivable(tx, {
        amountCents: totalCents,
        createdById: context.userId,
        hardwareDocumentId: document.id,
        idempotencyKey: `${input.idempotencyKey}:sale-receivable`,
        invoiceId: invoice.id,
        notes: input.notes ?? null,
        occurredAt: now,
        partyId: input.customerId ?? null,
        sourceId: document.id,
        sourceNumber: document.documentNumber,
        sourceType: "HardwareTradeDocument",
        tenantId: context.tenantId,
      });
      for (const item of trackedItems) {
        await tx.hardwareInventoryMovement.create({
          data: stripUndefined({
            customerId: input.customerId,
            locationId: input.locationId,
            metadata: { idempotencyKey: input.idempotencyKey, tradeDocumentId: document.id },
            productId: item.productId,
            quantity: item.quantity,
            referenceId: document.id,
            referenceType: document.type,
            tenantId: context.tenantId,
            type: movementTypeForDocument(document.type),
            unitPriceCents: item.unitAmountCents,
          }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
        });
      }
      let payment = null;
      if (input.paidAmountCents > 0) {
        payment = await tx.paymentRecord.create({
          data: {
            amountCents: input.paidAmountCents,
            invoiceId: invoice.id,
            metadata: { idempotencyKey: input.idempotencyKey, source: "quick-pos" },
            mode: input.paymentMode ?? "CASH",
            provider: PaymentProvider.MANUAL,
            receivedAt: now,
            recordedById: context.userId,
            tenantId: context.tenantId,
          },
        });
        await postCustomerPayment(tx, {
          allocationTargetTransactionId: saleReceivable.id,
          amountCents: input.paidAmountCents,
          createdById: context.userId,
          hardwareDocumentId: document.id,
          idempotencyKey: `${input.idempotencyKey}:customer-payment`,
          invoiceId: invoice.id,
          mode: input.paymentMode ?? "CASH",
          notes: input.notes ?? null,
          occurredAt: now,
          partyId: input.customerId ?? null,
          sourceId: payment.id,
          sourceNumber: invoice.invoiceNumber,
          sourceType: "PaymentRecord",
          tenantId: context.tenantId,
        });
      }
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: context.userId,
          documentId: document.id,
          metadata: { idempotencyKey: input.idempotencyKey, movements: trackedItems.length },
          summary: `Posted counter sale ${tradeNumber}`,
          tenantId: context.tenantId,
          verb: HardwareTradeTimelineVerb.CONFIRMED,
        },
      });
      await tx.billingTimelineEvent.createMany({
        data: [
          {
            actorId: context.userId,
            invoiceId: invoice.id,
            metadata: { idempotencyKey: input.idempotencyKey },
            summary: `Issued invoice ${invoiceNumber}`,
            tenantId: context.tenantId,
            verb: BillingTimelineVerb.INVOICE_ISSUED,
          },
          ...(payment
            ? [{
                actorId: context.userId,
                invoiceId: invoice.id,
                metadata: { amountCents: payment.amountCents, paymentId: payment.id },
                summary: `Recorded payment for ${invoiceNumber}`,
                tenantId: context.tenantId,
                verb: BillingTimelineVerb.PAYMENT_RECORDED,
              }]
            : []),
        ],
      });
      await tx.auditEvent.createMany({
        data: [
          {
            action: AuditAction.BILLING_INVOICE_ISSUED,
            actorId: context.userId,
            metadata: { idempotencyKey: input.idempotencyKey, invoiceNumber },
            targetId: invoice.id,
            targetType: "Invoice",
            tenantId: context.tenantId,
          },
          {
            action: AuditAction.HARDWARE_STOCK_MOVED,
            actorId: context.userId,
            metadata: { idempotencyKey: input.idempotencyKey, movements: trackedItems.length },
            targetId: document.id,
            targetType: "HardwareTradeDocument",
            tenantId: context.tenantId,
          },
        ],
      });
      return {
        documentId: document.id,
        documentNumber: document.documentNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: document.paymentStatus,
        totalCents: document.totalCents,
      };
    });
  }

  async cancelSale(context: ActorContext, documentId: string, input: HardwareTradeCancelInput) {
    const document = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, "hardware.sales.manage");
    await this.ensureLocation(context.tenantId, input.locationId);
    if (document.type !== HardwareTradeDocumentType.SALES_ORDER) {
      throw validation("Only a sale can be cancelled through this workflow.");
    }
    if (document.status === HardwareTradeDocumentStatus.CANCELLED) {
      return toSummary(document);
    }
    if (document.status !== HardwareTradeDocumentStatus.CONFIRMED) {
      throw validation("Only confirmed sales can be cancelled.");
    }

    const existingReturn = await this.prisma.hardwareTradeDocument.findFirst({
      select: { documentNumber: true },
      where: {
        metadata: { equals: document.id, path: ["originalSaleId"] },
        status: HardwareTradeDocumentStatus.CONFIRMED,
        tenantId: context.tenantId,
        type: HardwareTradeDocumentType.SALE_RETURN,
      },
    });
    if (existingReturn) {
      throw validation(`Sale cannot be cancelled after return ${existingReturn.documentNumber} has been recorded.`);
    }

    const existingCancellation = await this.prisma.hardwareInventoryMovement.findFirst({
      select: { id: true },
      where: {
        referenceId: document.id,
        referenceType: "SALE_CANCELLATION",
        tenantId: context.tenantId,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const cancellationMetadata = {
        actorId: context.userId,
        cancelledAt: now.toISOString(),
        idempotencyKey: input.idempotencyKey,
        locationId: input.locationId,
        reason: input.reason,
      };
      await tx.hardwareTradeDocument.update({
        data: {
          metadata: {
            ...asRecord(document.metadata),
            cancellation: cancellationMetadata,
          } as Prisma.InputJsonValue,
          paymentStatus: "void",
          status: HardwareTradeDocumentStatus.CANCELLED,
        },
        where: { id: document.id, tenantId: context.tenantId },
      });
      if (!existingCancellation) {
        for (const item of document.items.filter((candidate) => !isStockSetupPending(candidate.product?.metadata))) {
          await tx.hardwareInventoryMovement.create({
            data: stripUndefined({
              customerId: document.customerId,
              locationId: input.locationId,
              metadata: {
                cancelledDocumentNumber: document.documentNumber,
                idempotencyKey: input.idempotencyKey,
                reason: input.reason,
              },
              productId: item.productId,
              quantity: item.quantity,
              referenceId: document.id,
              referenceType: "SALE_CANCELLATION",
              tenantId: context.tenantId,
              type: HardwareInventoryMovementType.STOCK_IN,
              unitPriceCents: item.unitAmountCents,
            }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
          });
        }
      }
      if (document.billingInvoiceId && document.billingInvoice) {
        await tx.invoice.update({
          data: {
            metadata: {
              ...asRecord(document.billingInvoice.metadata),
              cancelledHardwareSaleId: document.id,
              cancellation: cancellationMetadata,
            } as Prisma.InputJsonValue,
            status: InvoiceStatus.VOID,
            voidedAt: now,
          },
          where: { id: document.billingInvoiceId, tenantId: context.tenantId },
        });
        await tx.billingTimelineEvent.create({
          data: {
            actorId: context.userId,
            invoiceId: document.billingInvoiceId,
            metadata: cancellationMetadata,
            summary: `Voided invoice for cancelled sale ${document.documentNumber}`,
            tenantId: context.tenantId,
            verb: BillingTimelineVerb.INVOICE_VOIDED,
          },
        });
        const payments = await tx.paymentRecord.findMany({
          where: { invoiceId: document.billingInvoiceId, tenantId: context.tenantId },
        });
        for (const payment of payments) {
          await tx.paymentRecord.update({
            data: {
              metadata: {
                ...asRecord(payment.metadata),
                cancellation: {
                  ...cancellationMetadata,
                  refundStatus: "pending_explicit_refund_or_customer_credit",
                },
              } as Prisma.InputJsonValue,
            },
            where: { id: payment.id },
          });
        }
        await postSaleCancellationFinancials(tx, {
          amountCents: document.billingInvoice.totalAmountCents,
          createdById: context.userId,
          hardwareDocumentId: document.id,
          idempotencyKey: `${input.idempotencyKey}:sale-cancellation`,
          invoiceId: document.billingInvoiceId,
          notes: input.reason,
          occurredAt: now,
          paidAmountCents: document.billingInvoice.paidAmountCents,
          partyId: document.customerId,
          reason: input.reason,
          sourceId: document.id,
          sourceNumber: document.documentNumber,
          sourceType: "HardwareTradeDocument",
          tenantId: context.tenantId,
          totalAmountCents: document.billingInvoice.totalAmountCents,
        });
      }
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: context.userId,
          documentId: document.id,
          metadata: cancellationMetadata,
          summary: `Cancelled ${document.documentNumber}`,
          tenantId: context.tenantId,
          verb: HardwareTradeTimelineVerb.CANCELLED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_STOCK_MOVED,
          actorId: context.userId,
          metadata: { ...cancellationMetadata, tradeAction: "sale_cancelled" },
          targetId: document.id,
          targetType: "HardwareTradeDocument",
          tenantId: context.tenantId,
        },
      });
    });

    return toSummary(await this.getOrThrow(context.tenantId, documentId));
  }

  async createSaleReturn(context: ActorContext, documentId: string, input: HardwareSaleReturnInput) {
    const document = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, "hardware.sales.manage");
    await this.ensureLocation(context.tenantId, input.locationId);
    if (document.type !== HardwareTradeDocumentType.SALES_ORDER) {
      throw validation("Only a sale can receive a sale return.");
    }
    if (document.status !== HardwareTradeDocumentStatus.CONFIRMED) {
      throw validation("Only confirmed sales can receive a sale return.");
    }

    const existingIdempotentReturn = await this.prisma.hardwareTradeDocument.findFirst({
      include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
      where: {
        metadata: { equals: input.idempotencyKey, path: ["idempotencyKey"] },
        tenantId: context.tenantId,
        type: HardwareTradeDocumentType.SALE_RETURN,
      },
    });
    if (existingIdempotentReturn) return toSummary(existingIdempotentReturn);

    const previousReturns = await this.prisma.hardwareTradeDocument.findMany({
      include: { items: true },
      where: {
        metadata: { equals: document.id, path: ["originalSaleId"] },
        status: HardwareTradeDocumentStatus.CONFIRMED,
        tenantId: context.tenantId,
        type: HardwareTradeDocumentType.SALE_RETURN,
      },
    });
    const alreadyReturned = new Map<string, number>();
    for (const returnDocument of previousReturns) {
      for (const item of returnDocument.items) {
        const originalItemId = readString(asRecord(item.metadata).originalItemId);
        if (originalItemId) alreadyReturned.set(originalItemId, (alreadyReturned.get(originalItemId) ?? 0) + item.quantity);
      }
    }

    const originalItems = new Map(document.items.map((item) => [item.id, item]));
    const inputQuantities = new Map<string, number>();
    for (const item of input.items) {
      inputQuantities.set(item.originalItemId, (inputQuantities.get(item.originalItemId) ?? 0) + item.quantity);
    }
    const returnItems = [...inputQuantities].map(([originalItemId, quantity]) => {
      const original = originalItems.get(originalItemId);
      if (!original) throw validation("Returned item was not found on the original sale.");
      const available = original.quantity - (alreadyReturned.get(originalItemId) ?? 0);
      if (quantity > available) {
        throw validation(`Return quantity for ${original.description} exceeds sold quantity.`);
      }
      const ratio = quantity / original.quantity;
      const discountCents = Math.round(original.discountCents * ratio);
      const lineInput = {
        discountCents,
        productId: original.productId,
        quantity,
        taxRateBps: original.taxRateBps,
        unitAmountCents: original.unitAmountCents,
      };
      const line = calculateTradeTotals([lineInput]);
      return {
        description: original.description,
        discountCents,
        lineTotalCents: line.totalCents,
        metadata: {
          ...asRecord(original.metadata),
          originalDocumentNumber: document.documentNumber,
          originalItemId,
          originalSaleId: document.id,
          refundType: input.refundType,
        } as Prisma.InputJsonValue,
        productId: original.productId,
        quantity,
        taxCents: line.taxCents,
        taxRateBps: original.taxRateBps,
        tenantId: context.tenantId,
        unitAmountCents: original.unitAmountCents,
      };
    });
    const totals = calculateTradeTotals(returnItems.map((item) => ({
      discountCents: item.discountCents,
      productId: item.productId,
      quantity: item.quantity,
      taxRateBps: item.taxRateBps,
      unitAmountCents: item.unitAmountCents,
    })));
    const documentNumber = await this.nextNumber(context.tenantId, HardwareTradeDocumentType.SALE_RETURN);

    const created = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const returnMetadata = {
        idempotencyKey: input.idempotencyKey,
        originalInvoiceId: document.billingInvoiceId,
        originalSaleId: document.id,
        originalSaleNumber: document.documentNumber,
        reason: input.reason,
        refundReference: input.refundReference ?? null,
        refundMode: input.refundMode ?? null,
        refundType: input.refundType,
      };
      const returnDocument = await tx.hardwareTradeDocument.create({
        data: {
          confirmedAt: now,
          currency: document.currency,
          customerId: document.customerId,
          discountCents: totals.discountCents,
          documentNumber,
          items: { create: returnItems },
          metadata: returnMetadata as Prisma.InputJsonValue,
          paymentStatus: input.refundType === "customer_credit" ? "credit" : "refund_pending",
          roundOffCents: 0,
          status: HardwareTradeDocumentStatus.CONFIRMED,
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          tenantId: context.tenantId,
          totalCents: totals.totalCents,
          type: HardwareTradeDocumentType.SALE_RETURN,
        } as Prisma.HardwareTradeDocumentUncheckedCreateInput,
      });
      await postSaleReturnCredit(tx, {
        amountCents: totals.totalCents,
        createdById: context.userId,
        hardwareDocumentId: returnDocument.id,
        idempotencyKey: `${input.idempotencyKey}:sale-return-credit`,
        invoiceId: document.billingInvoiceId,
        notes: input.reason,
        occurredAt: now,
        partyId: document.customerId,
        refundType: input.refundType,
        sourceId: returnDocument.id,
        sourceNumber: returnDocument.documentNumber,
        sourceType: "HardwareTradeDocument",
        tenantId: context.tenantId,
      });
      for (const item of returnItems.filter((candidate) => !isStockSetupPending(originalItems.get(readString(asRecord(candidate.metadata).originalItemId) ?? "")?.product?.metadata))) {
        await tx.hardwareInventoryMovement.create({
          data: stripUndefined({
            customerId: document.customerId,
            locationId: input.locationId,
            metadata: {
              idempotencyKey: input.idempotencyKey,
              originalDocumentNumber: document.documentNumber,
              originalSaleId: document.id,
              refundType: input.refundType,
            },
            productId: item.productId,
            quantity: item.quantity,
            referenceId: returnDocument.id,
            referenceType: HardwareTradeDocumentType.SALE_RETURN,
            tenantId: context.tenantId,
            type: HardwareInventoryMovementType.STOCK_IN,
            unitPriceCents: item.unitAmountCents,
          }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
        });
      }
      await tx.hardwareTradeDocument.update({
        data: {
          metadata: {
            ...asRecord(document.metadata),
            returnSummary: {
              lastReturnAt: now.toISOString(),
              lastReturnDocumentId: returnDocument.id,
              lastReturnNumber: documentNumber,
              returnedCents: previousReturns.reduce((sum, candidate) => sum + candidate.totalCents, 0) + totals.totalCents,
            },
          } as Prisma.InputJsonValue,
        },
        where: { id: document.id, tenantId: context.tenantId },
      });
      if (document.billingInvoiceId && document.billingInvoice) {
        await tx.invoice.update({
          data: {
            metadata: {
              ...asRecord(document.billingInvoice.metadata),
              hardwareReturnSummary: {
                lastReturnAt: now.toISOString(),
                lastReturnDocumentId: returnDocument.id,
                lastReturnNumber: documentNumber,
                returnedCents: previousReturns.reduce((sum, candidate) => sum + candidate.totalCents, 0) + totals.totalCents,
              },
            } as Prisma.InputJsonValue,
          },
          where: { id: document.billingInvoiceId, tenantId: context.tenantId },
        });
      }
      await tx.hardwareTradeTimelineEvent.create({
        data: {
          actorId: context.userId,
          documentId: returnDocument.id,
          metadata: returnMetadata as Prisma.InputJsonValue,
          summary: `Recorded sale return ${documentNumber} against ${document.documentNumber}`,
          tenantId: context.tenantId,
          verb: HardwareTradeTimelineVerb.RETURNED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_STOCK_MOVED,
          actorId: context.userId,
          metadata: { ...returnMetadata, movements: returnItems.length, tradeAction: "sale_returned" },
          targetId: returnDocument.id,
          targetType: "HardwareTradeDocument",
          tenantId: context.tenantId,
        },
      });
      return returnDocument;
    });

    return toSummary(await this.getOrThrow(context.tenantId, created.id));
  }

  async draftSaleInvoice(context: ActorContext, documentId: string) {
    const document = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, "hardware.sales.manage");
    if (document.type !== HardwareTradeDocumentType.SALES_ORDER) {
      throw validation("Only a sales order can create an invoice draft.");
    }
    if (!document.customerId) throw validation("Sale invoice draft requires a customer link.");
    const invoiceNumber = `DRAFT-${document.documentNumber}`;
    const existingInvoice = await this.prisma.invoice.findFirst({
      select: { id: true },
      where: { invoiceNumber, tenantId: context.tenantId },
    });
    if (existingInvoice) throw validation("Draft invoice already exists for this hardware document.");
    if (document.status !== "CONFIRMED") {
      throw validation("Confirm the sale and its stock movement before creating an invoice draft.");
    }
    const invoice = await this.prisma.invoice.create({
      data: {
        clientId: document.customerId,
        currency: document.currency,
        invoiceNumber,
        lineItems: document.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          totalAmountCents: item.lineTotalCents,
          unitAmountCents: item.unitAmountCents,
        })) as Prisma.InputJsonValue,
        metadata: { hardwareTradeDocumentId: document.id },
        tenantId: context.tenantId,
        title: `Invoice draft for ${document.documentNumber}`,
        totalAmountCents: document.totalCents,
      },
    });
    return this.repository.linkInvoice({
      actorId: context.userId,
      billingInvoiceId: invoice.id,
      documentId,
      tenantId: context.tenantId,
    });
  }

  async convertQuotationToSale(context: ActorContext, documentId: string) {
    const quotation = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, "hardware.sales.manage");
    if (quotation.type !== HardwareTradeDocumentType.SALES_QUOTATION) {
      throw validation("Only sales quotations can be converted to sales orders.");
    }
    if (quotation.status !== "CONFIRMED") {
      throw validation("Finalize the quotation before converting it to a sale.");
    }
    const existingSale = await this.prisma.hardwareTradeDocument.findFirst({
      select: { documentNumber: true },
      where: {
        metadata: { equals: quotation.id, path: ["sourceQuotationId"] },
        tenantId: context.tenantId,
        type: HardwareTradeDocumentType.SALES_ORDER,
      },
    });
    if (existingSale) {
      throw validation(`Quotation was already converted to ${existingSale.documentNumber}.`);
    }
    const quotationMetadata = asRecord(quotation.metadata);
    const input: HardwareTradeDocumentInput = {
      currency: quotation.currency,
      customerId: quotation.customerId ?? undefined,
      items: quotation.items.map((item) => ({
        discountCents: item.discountCents,
        metadata: asRecord(item.metadata),
        productId: item.productId,
        quantity: item.quantity,
        taxRateBps: item.taxRateBps,
        unitAmountCents: item.unitAmountCents,
      })),
      metadata: {
        ...quotationMetadata,
        sourceQuotationId: quotation.id,
        sourceQuotationNumber: quotation.documentNumber,
      },
      roundOffCents: quotation.roundOffCents,
      type: HardwareTradeDocumentType.SALES_ORDER,
    };
    return this.create(context, input);
  }

  async reports(context: ActorContext): Promise<HardwareReportSummary> {
    await this.enforce(context, "hardware.sales.read");
    const businessDay = currentIndiaBusinessDay();
    const [documents, products, movements, invoices] = await Promise.all([
      this.prisma.hardwareTradeDocument.findMany({ where: { tenantId: context.tenantId } }),
      this.prisma.hardwareProduct.findMany({ where: { archivedAt: null, tenantId: context.tenantId } }),
      this.prisma.hardwareInventoryMovement.findMany({ where: { tenantId: context.tenantId } }),
      this.prisma.invoice.findMany({ where: { tenantId: context.tenantId } }),
    ]);
    return {
      dailySalesCents: documents
        .filter((document) =>
          document.type === HardwareTradeDocumentType.SALES_ORDER &&
          document.status === "CONFIRMED" &&
          document.createdAt >= businessDay.gte &&
          document.createdAt < businessDay.lt,
        )
        .reduce((total, document) => total + document.totalCents, 0),
      lowStockProducts: products.filter((product) => {
        const stock = stockForProduct(movements.filter((movement) => movement.productId === product.id));
        return stock <= product.lowStockThreshold;
      }).length,
      outstandingCustomersCents: invoices
        .filter((invoice) => outstandingInvoiceStatuses.has(invoice.status))
        .reduce((total, invoice) => total + Math.max(invoice.totalAmountCents - invoice.paidAmountCents, 0), 0),
      outstandingSuppliersCents: documents
        .filter((document) =>
          document.type === HardwareTradeDocumentType.SUPPLIER_BILL &&
          document.status === "CONFIRMED" &&
          document.paymentStatus !== "paid",
        )
        .reduce((total, document) => total + document.totalCents, 0),
      purchaseGstCents: documents
        .filter((document) =>
          (document.type === HardwareTradeDocumentType.PURCHASE_ENTRY ||
            document.type === HardwareTradeDocumentType.SUPPLIER_BILL) &&
          document.status === "CONFIRMED",
        )
        .reduce((total, document) => total + document.taxCents, 0),
      purchaseSummaryCents: documents
        .filter((document) =>
          (document.type === HardwareTradeDocumentType.PURCHASE_ENTRY ||
            document.type === HardwareTradeDocumentType.SUPPLIER_BILL) &&
          document.status === "CONFIRMED",
        )
        .reduce((total, document) => total + document.totalCents, 0),
      salesGstCents: documents
        .filter((document) =>
          document.type === HardwareTradeDocumentType.SALES_ORDER &&
          document.status === "CONFIRMED",
        )
        .reduce((total, document) => total + document.taxCents, 0),
      stockMovements: movements.length,
    };
  }

  printContract(documentId: string): HardwarePrintContract {
    return { documentId, format: "a4", renderer: "pdf", templateKey: "hardware-trade-a4-v1" };
  }

  async printProjection(context: ActorContext, documentId: string): Promise<HardwarePrintProjection> {
    const document = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, readPermission(document.type));
    const [settings, customer, tenant] = await Promise.all([
      this.prisma.hardwareBusinessSettings.findUnique({ where: { tenantId: context.tenantId } }),
      document.customerId || document.supplierId
        ? this.prisma.clientOrganization.findFirst({
            include: {
              contacts: {
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                select: { phone: true },
                take: 1,
              },
            },
            where: { id: document.customerId ?? document.supplierId ?? "", tenantId: context.tenantId },
          })
        : Promise.resolve(null),
      this.prisma.tenant.findUnique({
        select: { branding: true },
        where: { id: context.tenantId },
      }),
    ]);
    const branding = asRecord(tenant?.branding);
    const officialIdentity = asRecord(branding.officialIdentity);
    const logo = asRecord(branding.logo);
    const identityLocked = officialIdentity.status === "LOCKED";
    const summary = toSummary(document);
    const documentMetadata = asRecord(document.metadata);
    const taxMode = documentMetadata.taxMode === "inter-state" ? "inter-state" : "intra-state";
    return {
      customer: customer ? {
        address: readString(asRecord(customer.customFields).address),
        gstin: readString(asRecord(customer.customFields).gstin),
        name: customer.name,
        phone: customer.contacts?.[0]?.phone ?? readString(asRecord(customer.customFields).phone),
      } : null,
      document: { ...summary, totalsInWords: amountInWords(document.totalCents) },
      firm: {
        address: (settings?.address ?? {}) as Record<string, unknown>,
        email: settings?.email ?? null,
        firmName: settings?.firmName ?? "Configured Firm",
        gstin: settings?.gstin ?? null,
        legalName: identityLocked && typeof officialIdentity.legalName === "string" ? officialIdentity.legalName : null,
        logoUrl: identityLocked && typeof logo.assetKey === "string" ? "/api/tenants/branding/logo" : null,
        logoPlaceholder: settings?.logoPlaceholder ?? null,
        phone: settings?.phone ?? null,
        proprietorName:
          identityLocked && typeof officialIdentity.proprietorName === "string"
            ? officialIdentity.proprietorName
            : null,
        tagline: identityLocked && typeof branding.tagline === "string" ? branding.tagline : null,
        termsFooter: settings?.termsFooter ?? null,
      },
      gstSummary: gstSummary(document.items),
      items: document.items.map((item) => {
        const itemMetadata = asRecord(item.metadata);
        const productMetadata = asRecord(item.product?.metadata);
        const taxableCents = Math.max(item.quantity * item.unitAmountCents - item.discountCents, 0);
        const cgstCents = taxMode === "intra-state" ? Math.floor(item.taxCents / 2) : 0;
        const sgstCents = taxMode === "intra-state" ? item.taxCents - cgstCents : 0;
        return {
          cgstCents,
          description: item.description,
          discountCents: item.discountCents,
          discountPercent: readNumber(itemMetadata.discountPercent),
          hsnCode: readString(itemMetadata.hsnCode) ?? readString(productMetadata.hsnCode),
          igstCents: taxMode === "inter-state" ? item.taxCents : 0,
          lineTotalCents: item.lineTotalCents,
          quantity: item.quantity,
          sgstCents,
          taxCents: item.taxCents,
          taxRateBps: item.taxRateBps,
          taxableCents,
          unitAmountCents: item.unitAmountCents,
          unitCode: readString(itemMetadata.unitCode) ?? item.product?.unit?.code ?? null,
        };
      }),
      printContract: this.printContract(documentId),
      signatureLabel: "Authorised signature",
    };
  }

  whatsAppShareContract(documentNumber: string): HardwareWhatsAppShareContract {
    return {
      channel: "whatsapp",
      liveIntegration: false,
      messageTemplate: `Share hardware document ${documentNumber}`,
    };
  }

  private async validateTradeLinks(tenantId: string, input: HardwareTradeDocumentInput) {
    if (input.customerId) {
      await this.ensureParty(tenantId, input.customerId, "customer", "Customer link was not found or is not classified as a customer.");
    }
    if (input.supplierId) {
      await this.ensureParty(tenantId, input.supplierId, "supplier", "Supplier link was not found or is not classified as a supplier.");
    }
    if (input.projectId) await this.ensureProject(tenantId, input.projectId);
    if (input.requirementId) await this.ensureRequirement(tenantId, input.requirementId);
    if (input.billingInvoiceId) await this.ensureInvoice(tenantId, input.billingInvoiceId);
  }

  private async ensureStockAvailable(tenantId: string, document: TradeFullRecord, locationId: string) {
    const stockOutTypes = new Set<HardwareTradeDocumentType>([
      HardwareTradeDocumentType.SALES_ORDER,
      HardwareTradeDocumentType.PURCHASE_RETURN,
    ]);
    if (!stockOutTypes.has(document.type)) return;
    for (const item of document.items) {
      if (isStockSetupPending(item.product?.metadata)) continue;
      const movements = await this.prisma.hardwareInventoryMovement.findMany({
        where: { locationId, productId: item.productId, tenantId },
      });
      if (item.quantity > stockForProduct(movements)) {
        throw validation("Confirmed sale or return cannot deduct more stock than available.");
      }
    }
  }

  private async loadProducts(tenantId: string, productIds: string[]) {
    const products = await this.prisma.hardwareProduct.findMany({
      where: { id: { in: productIds }, tenantId },
    });
    return new Map(products.map((product) => [product.id, product]));
  }

  private async nextNumber(tenantId: string, type: HardwareTradeDocumentType) {
    const prefix = prefixes[type];
    const year = new Date().getUTCFullYear();
    let sequence = (await this.repository.countByPrefix(tenantId, prefix, year)) + 1;
    let candidate = `${prefix}-${year}-${sequence.toString().padStart(4, "0")}`;
    while (await this.repository.findByNumber(tenantId, candidate)) {
      sequence += 1;
      candidate = `${prefix}-${year}-${sequence.toString().padStart(4, "0")}`;
    }
    return candidate;
  }

  private async getOrThrow(tenantId: string, documentId: string) {
    const document = await this.repository.findById(tenantId, documentId);
    if (!document) throw validation("Hardware document was not found.");
    return document;
  }

  private async assertUniqueSupplierReference(tenantId: string, input: HardwareTradeDocumentInput) {
    if (
      !input.supplierId ||
      (input.type !== HardwareTradeDocumentType.PURCHASE_ENTRY &&
        input.type !== HardwareTradeDocumentType.SUPPLIER_BILL)
    ) {
      return;
    }
    const referenceNumber = readString(asRecord(input.metadata).referenceNumber);
    if (!referenceNumber) return;
    const duplicate = await this.prisma.hardwareTradeDocument.findFirst({
      select: { documentNumber: true },
      where: {
        metadata: { equals: referenceNumber, path: ["referenceNumber"] },
        supplierId: input.supplierId,
        tenantId,
        type: { in: [HardwareTradeDocumentType.PURCHASE_ENTRY, HardwareTradeDocumentType.SUPPLIER_BILL] },
      },
    });
    if (duplicate) {
      throw validation(`Supplier invoice/reference already exists on ${duplicate.documentNumber}.`);
    }
  }

  private async ensureParty(
    tenantId: string,
    id: string,
    role: "customer" | "supplier",
    message: string,
  ) {
    const record = await this.prisma.clientOrganization.findFirst({
      select: { customFields: true },
      where: { archivedAt: null, deletedAt: null, id, tenantId },
    });
    if (!record || asRecord(record.customFields).hardwarePartyRole !== role) {
      throw validation(message);
    }
  }

  private async ensureProject(tenantId: string, id: string) {
    const record = await this.prisma.project.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation("Project link was not found.");
  }

  private async ensureRequirement(tenantId: string, id: string) {
    const record = await this.prisma.requirement.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation("Requirement link was not found.");
  }

  private async ensureInvoice(tenantId: string, id: string) {
    const record = await this.prisma.invoice.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation("Billing invoice link was not found.");
  }

  private async ensureLocation(tenantId: string, id: string) {
    const record = await this.prisma.hardwareStockLocation.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation("Stock location was not found.");
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}.${string}`, "hardware.plugin.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

function isStockSetupPending(value: unknown) {
  return asRecord(value).stockSetupStatus === "PENDING";
}

function gstSummary(items: TradeFullRecord["items"]) {
  const grouped = new Map<number, { taxableCents: number; taxCents: number; taxRateBps: number }>();
  for (const item of items) {
    const existing = grouped.get(item.taxRateBps) ?? { taxableCents: 0, taxCents: 0, taxRateBps: item.taxRateBps };
    existing.taxableCents += Math.max(item.quantity * item.unitAmountCents - item.discountCents, 0);
    existing.taxCents += item.taxCents;
    grouped.set(item.taxRateBps, existing);
  }
  return [...grouped.values()];
}

function amountInWords(amountCents: number) {
  const rupees = Math.floor(Math.abs(amountCents) / 100);
  const paise = Math.abs(amountCents) % 100;
  const sign = amountCents < 0 ? "Minus " : "";
  const rupeeWords = indianNumberWords(rupees);
  const paiseWords = paise ? ` and ${twoDigitWords(paise)} Paise` : "";
  return `${sign}${rupeeWords} Rupees${paiseWords} only`;
}

function toSummary(document: TradeRecord): HardwareTradeSummary {
  return {
    billingInvoiceId: document.billingInvoiceId,
    createdAt: document.createdAt,
    customerId: document.customerId,
    customerName: document.customer?.name ?? null,
    discountCents: document.discountCents,
    documentNumber: document.documentNumber,
    id: document.id,
    metadata: asRecord(document.metadata),
    paymentStatus: document.paymentStatus,
    roundOffCents: document.roundOffCents,
    status: document.status,
    subtotalCents: document.subtotalCents,
    supplierId: document.supplierId,
    supplierName: document.supplier?.name ?? null,
    taxCents: document.taxCents,
    totalCents: document.totalCents,
    type: document.type,
    updatedAt: document.updatedAt,
  };
}

function managePermission(type: HardwareTradeDocumentType) {
  return salesTypes.has(type) || type === HardwareTradeDocumentType.SALE_RETURN
    ? "hardware.sales.manage"
    : "hardware.purchase.manage";
}

function readPermission(type: HardwareTradeDocumentType) {
  return salesTypes.has(type) || type === HardwareTradeDocumentType.SALE_RETURN
    ? "hardware.sales.read"
    : "hardware.purchase.read";
}

function taxRateFromConfig(config: Prisma.JsonValue) {
  if (typeof config === "object" && config && !Array.isArray(config) && "rateBps" in config) {
    const rate = (config as { rateBps?: unknown }).rateBps;
    if (rate === undefined) return 0;
    if (typeof rate !== "number" || !Number.isInteger(rate) || rate < 0 || rate > 10_000) {
      throw validation("GST rate must be between 0 and 10000 basis points.");
    }
    return rate;
  }
  return 0;
}

function paymentModeFromMetadata(metadata: Prisma.JsonValue) {
  const value = readString(asRecord(metadata).paymentMode);
  if (!value || value === "Credit") return null;
  if (value === "Bank Transfer") return PaymentMode.BANK_TRANSFER;
  if (value === "Cash") return PaymentMode.CASH;
  if (value === "UPI") return PaymentMode.UPI;
  if (value === "Cheque") return PaymentMode.CHEQUE;
  if (value === "Card") return PaymentMode.CARD;
  return PaymentMode.OTHER;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function indianNumberWords(value: number) {
  if (value === 0) return "Zero";
  if (value > 999_999_999) return value.toLocaleString("en-IN");
  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1_000);
  const remainder = value % 1_000;
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (remainder) parts.push(threeDigitWords(remainder));
  return parts.join(" ");
}

function threeDigitWords(value: number) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return [
    hundreds ? `${smallNumberWords[hundreds]} Hundred` : "",
    remainder ? twoDigitWords(remainder) : "",
  ].filter(Boolean).join(" ");
}

function twoDigitWords(value: number) {
  if (value < 20) return smallNumberWords[value];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return `${tensWords[tens]}${units ? ` ${smallNumberWords[units]}` : ""}`;
}

const smallNumberWords = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

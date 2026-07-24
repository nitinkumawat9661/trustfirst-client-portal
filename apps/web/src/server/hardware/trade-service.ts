import {
  HardwareTradeDocumentType,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import { stockForProduct } from "./hardware-service";
import { calculateTradeTotals } from "./trade-calculations";
import { movementTypeForDocument, PrismaHardwareTradeRepository } from "./trade-repository";
import type { HardwareTradeDocumentInput, HardwareTradeStatusInput } from "./trade-schemas";
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
      HardwareTradeDocumentType.SALES_QUOTATION,
      HardwareTradeDocumentType.SALE_RETURN,
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
    await this.ensureLocation(context.tenantId, input.locationId);
    if (document.type === HardwareTradeDocumentType.SALES_QUOTATION || document.type === HardwareTradeDocumentType.PURCHASE_ORDER) {
      throw validation("Quotation and purchase order confirmation does not move stock.");
    }
    await this.ensureStockAvailable(context.tenantId, document, input.locationId);
    return this.repository.confirm({
      actorId: context.userId,
      documentId,
      movements: document.items.map((item) =>
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

  async draftSaleInvoice(context: ActorContext, documentId: string) {
    const document = await this.getOrThrow(context.tenantId, documentId);
    await this.enforce(context, "hardware.sales.manage");
    if (!document.customerId) throw validation("Sale invoice draft requires a customer link.");
    const invoiceNumber = `DRAFT-${document.documentNumber}`;
    const existingInvoice = await this.prisma.invoice.findFirst({
      select: { id: true },
      where: { invoiceNumber, tenantId: context.tenantId },
    });
    if (existingInvoice) throw validation("Draft invoice already exists for this hardware document.");
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
    const input: HardwareTradeDocumentInput = {
      currency: quotation.currency,
      customerId: quotation.customerId ?? undefined,
      items: quotation.items.map((item) => ({
        discountCents: item.discountCents,
        productId: item.productId,
        quantity: item.quantity,
        taxRateBps: item.taxRateBps,
        unitAmountCents: item.unitAmountCents,
      })),
      roundOffCents: quotation.roundOffCents,
      type: HardwareTradeDocumentType.SALES_ORDER,
    };
    return this.create(context, input);
  }

  async reports(context: ActorContext): Promise<HardwareReportSummary> {
    await this.enforce(context, "hardware.sales.read");
    const [documents, products, movements, invoices] = await Promise.all([
      this.prisma.hardwareTradeDocument.findMany({ where: { tenantId: context.tenantId } }),
      this.prisma.hardwareProduct.findMany({ where: { archivedAt: null, tenantId: context.tenantId } }),
      this.prisma.hardwareInventoryMovement.findMany({ where: { tenantId: context.tenantId } }),
      this.prisma.invoice.findMany({ where: { tenantId: context.tenantId } }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    return {
      dailySalesCents: documents
        .filter((document) => document.type === HardwareTradeDocumentType.SALES_ORDER && document.createdAt.toISOString().startsWith(today))
        .reduce((total, document) => total + document.totalCents, 0),
      lowStockProducts: products.filter((product) => {
        const stock = stockForProduct(movements.filter((movement) => movement.productId === product.id));
        return stock <= product.lowStockThreshold;
      }).length,
      outstandingCustomersCents: invoices
        .filter((invoice) => invoice.status !== InvoiceStatus.PAID)
        .reduce((total, invoice) => total + Math.max(invoice.totalAmountCents - invoice.paidAmountCents, 0), 0),
      outstandingSuppliersCents: documents
        .filter((document) => document.type === HardwareTradeDocumentType.SUPPLIER_BILL && document.paymentStatus !== "paid")
        .reduce((total, document) => total + document.totalCents, 0),
      purchaseSummaryCents: documents
        .filter((document) => document.type === HardwareTradeDocumentType.PURCHASE_ENTRY || document.type === HardwareTradeDocumentType.SUPPLIER_BILL)
        .reduce((total, document) => total + document.totalCents, 0),
      stockMovements: movements.length,
    };
  }

  printContract(documentId: string): HardwarePrintContract {
    return { documentId, format: "a4", renderer: "pdf", templateKey: "hardware-trade-a4-v1" };
  }

  async printProjection(context: ActorContext, documentId: string): Promise<HardwarePrintProjection> {
    await this.enforce(context, "hardware.sales.read");
    const document = await this.getOrThrow(context.tenantId, documentId);
    const [settings, customer, tenant] = await Promise.all([
      this.prisma.hardwareBusinessSettings.findUnique({ where: { tenantId: context.tenantId } }),
      document.customerId
        ? this.prisma.clientOrganization.findFirst({
            select: { name: true },
            where: { id: document.customerId, tenantId: context.tenantId },
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
    return {
      customer,
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
      items: document.items.map((item) => ({
        description: item.description,
        discountCents: item.discountCents,
        lineTotalCents: item.lineTotalCents,
        quantity: item.quantity,
        taxCents: item.taxCents,
        taxRateBps: item.taxRateBps,
        unitAmountCents: item.unitAmountCents,
      })),
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
    if (input.customerId) await this.ensureClient(tenantId, input.customerId, "Customer link was not found.");
    if (input.supplierId) await this.ensureClient(tenantId, input.supplierId, "Supplier link was not found.");
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

  private async ensureClient(tenantId: string, id: string, message: string) {
    const record = await this.prisma.clientOrganization.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation(message);
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
  const rupees = Math.round(amountCents / 100);
  if (rupees === 0) return "Zero only";
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  if (rupees < 10) return `${units[rupees]} only`;
  return `${rupees} only`;
}

function toSummary(document: TradeRecord): HardwareTradeSummary {
  return {
    customerId: document.customerId,
    discountCents: document.discountCents,
    documentNumber: document.documentNumber,
    id: document.id,
    paymentStatus: document.paymentStatus,
    roundOffCents: document.roundOffCents,
    status: document.status,
    subtotalCents: document.subtotalCents,
    supplierId: document.supplierId,
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

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

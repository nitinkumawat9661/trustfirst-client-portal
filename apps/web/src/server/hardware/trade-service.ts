import {
  HardwareTradeDocumentType,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import { currentIndiaBusinessDay } from "./business-time";
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

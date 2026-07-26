import {
  ClientLifecycleStage,
  HardwareInventoryMovementType,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import { currentIndiaBusinessDay } from "./business-time";
import { PrismaHardwareRepository } from "./hardware-repository";
import { hardwareErpPluginManifest } from "./plugin-manifest";
import type {
  HardwareBrandInput,
  HardwareBusinessSettingsInput,
  HardwareImportExecuteInput,
  HardwareCategoryInput,
  HardwareImportPreviewInput,
  HardwareLocationInput,
  HardwareMovementInput,
  HardwareProductInput,
  QuickHardwarePartyInput,
  QuickHardwareProductInput,
  HardwareUnitInput,
} from "./schemas";
import type {
  HardwareCsvExportContract,
  HardwareReminder,
  HardwareImportPreview,
  HardwareMovementSummary,
  HardwarePartyRole,
  HardwarePartySummary,
  HardwareProductSummary,
  InventoryDashboard,
  PartyLedger,
} from "./types";
import type { HardwareDemoReadiness, HardwareImportSummary, HardwareOperationalDashboard } from "./types";
import { genericHardwareDemoData } from "./demo-data";

type ActorContext = { tenantId: string; userId: string };
type ProductRecord = Awaited<ReturnType<PrismaHardwareRepository["listProducts"]>>[number];
type MovementRecord = {
  productId: string;
  quantity: number;
  type: HardwareInventoryMovementType;
};

export class HardwareService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaHardwareRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaHardwareRepository(prisma);
  }

  manifest() {
    return hardwareErpPluginManifest;
  }

  async listProducts(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    const products = await this.repository.listProducts(context.tenantId);
    const movements = await this.repository.allMovements(context.tenantId);
    return products.map((product) => toProductSummary(product, movements));
  }

  async createCategory(context: ActorContext, input: HardwareCategoryInput) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.repository.createCategory(stripUndefined({
      description: input.description,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      name: input.name,
      slug: slugify(input.name),
      tenantId: context.tenantId,
    }) as Prisma.HardwareProductCategoryUncheckedCreateInput);
  }

  async listCategories(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    return this.repository.listCategories(context.tenantId);
  }

  async createBrand(context: ActorContext, input: HardwareBrandInput) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.repository.createBrand({
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      name: input.name,
      slug: slugify(input.name),
      tenantId: context.tenantId,
    });
  }

  async listBrands(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    return this.repository.listBrands(context.tenantId);
  }

  async createUnit(context: ActorContext, input: HardwareUnitInput) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.repository.createUnit({
      code: input.code.toUpperCase(),
      name: input.name,
      precision: input.precision ?? 0,
      tenantId: context.tenantId,
    });
  }

  async listUnits(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    return this.repository.listUnits(context.tenantId);
  }

  async createLocation(context: ActorContext, input: HardwareLocationInput) {
    await this.enforce(context, "hardware.inventory.manage");
    return this.repository.createLocation({
      address: (input.address ?? {}) as Prisma.InputJsonValue,
      code: input.code.toUpperCase(),
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      name: input.name,
      tenantId: context.tenantId,
    });
  }

  async getSettings(context: ActorContext) {
    await this.enforce(context, "hardware.settings.read");
    return this.repository.getSettings(context.tenantId);
  }

  async saveSettings(context: ActorContext, input: HardwareBusinessSettingsInput) {
    await this.enforce(context, "hardware.settings.manage");
    if (input.defaultStockLocationId) {
      await this.assertExists(
        "hardwareStockLocation",
        context.tenantId,
        input.defaultStockLocationId,
        "Default stock location was not found.",
      );
    }
    return this.repository.upsertSettings(stripUndefined({
      address: (input.address ?? {}) as Prisma.InputJsonValue,
      defaultGstMode: input.defaultGstMode ?? "exclusive",
      defaultStockLocationId: input.defaultStockLocationId,
      email: input.email,
      financialYear: input.financialYear,
      firmName: input.firmName,
      gstin: input.gstin,
      invoicePrefix: input.invoicePrefix ?? "INV",
      logoPlaceholder: input.logoPlaceholder,
      phone: input.phone,
      roundOffEnabled: input.roundOffEnabled ?? true,
      tenantId: context.tenantId,
      termsFooter: input.termsFooter,
    }) as Prisma.HardwareBusinessSettingsUncheckedCreateInput);
  }

  async listLocations(context: ActorContext) {
    await this.enforce(context, "hardware.inventory.read");
    return this.repository.listLocations(context.tenantId);
  }

  async listMovements(context: ActorContext): Promise<HardwareMovementSummary[]> {
    await this.enforce(context, "hardware.inventory.read");
    return (await this.repository.allMovements(context.tenantId)).map((movement) => ({
      id: movement.id,
      locationName: movement.location.name,
      occurredAt: movement.occurredAt,
      productId: movement.productId,
      productName: movement.product.name,
      quantity: movement.quantity,
      type: movement.type,
    }));
  }

  async listParties(context: ActorContext, role: HardwarePartyRole): Promise<HardwarePartySummary[]> {
    await this.enforce(context, role === "supplier" ? "hardware.purchase.read" : "hardware.sales.read");
    const parties = await this.prisma.clientOrganization.findMany({
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { email: true, phone: true },
          take: 1,
        },
        invoices: {
          select: { paidAmountCents: true, totalAmountCents: true },
          where: { archivedAt: null, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
        },
        supplierHardwareDocuments: {
          select: { paymentStatus: true, totalCents: true },
          where: { archivedAt: null, status: "CONFIRMED", type: "SUPPLIER_BILL" },
        },
      },
      orderBy: { name: "asc" },
      where: { archivedAt: null, deletedAt: null, tenantId: context.tenantId },
    });

    return parties.flatMap((party) => {
      const customFields = asRecord(party.customFields);
      if (customFields.hardwarePartyRole !== role) return [];
      const openingBalanceCents = readInteger(customFields.openingBalanceCents) ?? 0;
      const calculatedBalance =
        role === "supplier"
          ? party.supplierHardwareDocuments
              .filter((document) => document.paymentStatus !== "paid")
              .reduce((total, document) => total + document.totalCents, 0)
          : party.invoices.reduce(
              (total, invoice) => total + Math.max(invoice.totalAmountCents - invoice.paidAmountCents, 0),
              0,
            );
      const currentBalanceCents = openingBalanceCents + calculatedBalance;
      const contact = party.contacts[0];
      return [{
        balanceSide:
          currentBalanceCents === 0
            ? null
            : role === "supplier"
              ? currentBalanceCents > 0 ? "CR" as const : "DR" as const
              : currentBalanceCents > 0 ? "DR" as const : "CR" as const,
        contact: contact?.phone ?? contact?.email ?? readText(customFields.phone) ?? null,
        currentBalanceCents,
        gstin: readText(customFields.gstin) ?? null,
        id: party.id,
        name: party.name,
        openingBalanceCents,
        role,
      }];
    });
  }

  async createProduct(context: ActorContext, input: HardwareProductInput) {
    await this.enforce(context, "hardware.catalog.manage");
    const sku = input.sku?.trim() || await this.nextProductSku(context.tenantId, input.name);
    if (await this.repository.findProductBySku(context.tenantId, sku)) {
      throw validation("Product SKU already exists for this tenant.");
    }
    if (input.barcode && await this.repository.findProductByBarcode(context.tenantId, input.barcode)) {
      throw validation("Product barcode already exists for this tenant.");
    }
    validateGstTaxConfig(input.gstTaxConfig);
    await this.validateOptionalLinks(context.tenantId, input);
    return this.repository.createProduct({
      actorId: context.userId,
      data: stripUndefined({
        barcode: input.barcode,
        brandId: input.brandId,
        categoryId: input.categoryId,
        description: input.description,
        gstTaxConfig: (input.gstTaxConfig ?? {}) as Prisma.InputJsonValue,
        lowStockThreshold: input.lowStockThreshold ?? 0,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        name: input.name,
        purchaseCostCents: input.purchaseCostCents ?? 0,
        salesPriceCents: input.salesPriceCents ?? 0,
        sku,
        tenantId: context.tenantId,
        unitId: input.unitId,
      }) as Prisma.HardwareProductUncheckedCreateInput,
    });
  }

  async quickCreateProduct(context: ActorContext, input: QuickHardwareProductInput) {
    await this.enforce(context, "hardware.catalog.manage");
    validateGstTaxConfig(input.gstRateBps === undefined ? undefined : { rateBps: input.gstRateBps });
    await this.validateOptionalLinks(context.tenantId, {
      brandId: input.brandId,
      categoryId: input.categoryId,
      name: input.name,
      unitId: input.unitId,
    });
    const existing = await this.repository.findProductByExactName(context.tenantId, input.name);
    if (existing) {
      throw validation("A product with this name already exists. Select the existing product instead.");
    }
    const sku = input.sku?.trim() || await this.nextProductSku(context.tenantId, input.name);
    if (await this.repository.findProductBySku(context.tenantId, sku)) {
      throw validation("Product SKU already exists for this tenant.");
    }
    if (input.barcode && await this.repository.findProductByBarcode(context.tenantId, input.barcode)) {
      throw validation("Product barcode already exists for this tenant.");
    }
    if (input.openingStock) {
      await this.assertExists("hardwareStockLocation", context.tenantId, input.openingStock.locationId, "Stock location was not found.");
    }
    const unitId = input.unitId ?? (await this.ensureDefaultUnit(context.tenantId)).id;
    const product = await this.repository.createProduct({
      actorId: context.userId,
      data: stripUndefined({
        barcode: input.barcode,
        brandId: input.brandId,
        categoryId: input.categoryId,
        gstTaxConfig: input.gstRateBps === undefined ? {} : { rateBps: input.gstRateBps },
        metadata: {
          hsnCode: input.hsnCode,
          stockSetupStatus: input.openingStock ? "TRACKED" : "PENDING",
          stockSetupPendingAt: input.openingStock ? undefined : new Date().toISOString(),
        } as Prisma.InputJsonValue,
        lowStockThreshold: input.lowStockThreshold ?? 0,
        name: input.name,
        purchaseCostCents: input.purchaseCostCents ?? 0,
        salesPriceCents: input.salesPriceCents ?? 0,
        sku,
        tenantId: context.tenantId,
        unitId,
      }) as Prisma.HardwareProductUncheckedCreateInput,
    });
    if (input.openingStock && input.openingStock.quantity > 0) {
      await this.recordMovement(context, {
        locationId: input.openingStock.locationId,
        metadata: { stockSetup: "opening" },
        notes: "Opening stock setup",
        productId: product.id,
        quantity: input.openingStock.quantity,
        referenceType: "stock_setup",
        type: HardwareInventoryMovementType.STOCK_IN,
        unitPriceCents: input.salesPriceCents,
      });
    }
    const movements = input.openingStock ? await this.repository.movementsForProduct(context.tenantId, product.id) : [];
    return toProductSummary({ ...product, brand: null, category: null, unit: null }, movements);
  }

  async quickCreateParty(context: ActorContext, input: QuickHardwarePartyInput): Promise<HardwarePartySummary> {
    await this.enforce(context, input.role === "supplier" ? "hardware.purchase.manage" : "hardware.sales.manage");
    const normalizedName = normalizeComparable(input.name);
    const normalizedMobile = normalizeMobile(input.mobile);
    const existing = await this.prisma.clientOrganization.findMany({
      include: { contacts: { select: { phone: true } } },
      where: { archivedAt: null, deletedAt: null, tenantId: context.tenantId },
    });
    const duplicate = existing.find((party) => {
      const customFields = asRecord(party.customFields);
      if (customFields.hardwarePartyRole !== input.role) return false;
      const sameName = normalizeComparable(party.name) === normalizedName;
      const existingMobile = normalizeMobile(party.contacts[0]?.phone ?? readText(customFields.phone));
      const sameMobile = normalizedMobile && existingMobile === normalizedMobile;
      return sameName || Boolean(sameMobile);
    });
    if (duplicate) {
      throw validation(`${input.role === "supplier" ? "Supplier" : "Customer"} already exists. Select the existing record.`);
    }
    const openingBalanceCents = input.openingBalanceCents ?? 0;
    const signedOpening =
      openingBalanceCents === 0
        ? 0
        : input.balanceDirection === "CR"
          ? -openingBalanceCents
          : openingBalanceCents;
    const party = await this.prisma.clientOrganization.create({
      data: {
        customFields: stripUndefined({
          address: input.address,
          gstin: input.gstin,
          hardwarePartyRole: input.role,
          openingBalanceCents: signedOpening,
          openingBalanceDirection: input.balanceDirection,
          phone: normalizedMobile,
        }) as Prisma.InputJsonValue,
        lifecycleStage: "CLIENT",
        name: input.name,
        slug: await this.nextPartySlug(context.tenantId, input.name),
        tenantId: context.tenantId,
      },
    });
    if (normalizedMobile) {
      await this.prisma.clientContact.create({
        data: {
          clientId: party.id,
          email: `${party.id}@local.invalid`,
          isPrimary: true,
          name: input.name,
          normalizedEmail: `${party.id}@local.invalid`,
          phone: normalizedMobile,
          tenantId: context.tenantId,
        },
      });
    }
    return {
      balanceSide: signedOpening === 0 ? null : input.role === "supplier" ? (signedOpening > 0 ? "CR" : "DR") : (signedOpening > 0 ? "DR" : "CR"),
      contact: normalizedMobile ?? null,
      currentBalanceCents: signedOpening,
      gstin: input.gstin ?? null,
      id: party.id,
      name: party.name,
      openingBalanceCents: signedOpening,
      role: input.role,
    };
  }

  async quickCreateCategory(context: ActorContext, name: string) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.prisma.hardwareProductCategory.upsert({
      create: { name, slug: slugify(name), tenantId: context.tenantId },
      update: {},
      where: { tenantId_slug: { slug: slugify(name), tenantId: context.tenantId } },
    });
  }

  async quickCreateBrand(context: ActorContext, name: string) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.prisma.hardwareBrand.upsert({
      create: { name, slug: slugify(name), tenantId: context.tenantId },
      update: {},
      where: { tenantId_slug: { slug: slugify(name), tenantId: context.tenantId } },
    });
  }

  async quickCreateUnit(context: ActorContext, name: string) {
    await this.enforce(context, "hardware.catalog.manage");
    const code = name.trim().toUpperCase().replace(/[^A-Z0-9]+/gu, "").slice(0, 12) || "UNIT";
    return this.prisma.hardwareUnit.upsert({
      create: { code, name, tenantId: context.tenantId },
      update: {},
      where: { tenantId_code: { code, tenantId: context.tenantId } },
    });
  }

  async recordMovement(context: ActorContext, input: HardwareMovementInput) {
    await this.enforce(context, "hardware.inventory.manage");
    const product = await this.repository.findProductById(context.tenantId, input.productId);
    if (!product) throw validation("Product was not found.");
    await this.validateMovementLinks(context.tenantId, input);
    const currentStock = stockForProduct(await this.repository.movementsForProduct(context.tenantId, input.productId));
    if (input.type === HardwareInventoryMovementType.STOCK_OUT && input.quantity > currentStock) {
      throw validation("Stock out quantity cannot exceed current stock.");
    }
    const nextStock =
      input.type === HardwareInventoryMovementType.STOCK_IN
        ? currentStock + input.quantity
        : input.type === HardwareInventoryMovementType.STOCK_OUT
          ? currentStock - input.quantity
          : input.quantity;
    return this.repository.recordMovement({
      actorId: context.userId,
      data: stripUndefined({
        customerId: input.customerId,
        locationId: input.locationId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        notes: input.notes,
        occurredAt: input.occurredAt ?? new Date(),
        productId: input.productId,
        quantity: input.quantity,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        supplierId: input.supplierId,
        tenantId: context.tenantId,
        type: input.type,
        unitCostCents: input.unitCostCents,
        unitPriceCents: input.unitPriceCents,
      }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
      lowStock: nextStock <= product.lowStockThreshold,
    });
  }

  async dashboard(context: ActorContext): Promise<InventoryDashboard> {
    await this.enforce(context, "hardware.inventory.read");
    const products = await this.repository.listProducts(context.tenantId);
    const movements = await this.repository.allMovements(context.tenantId);
    const summaries = products.map((product) => toProductSummary(product, movements));
    return {
      lowStockProducts: summaries.filter((product) => product.lowStock).length,
      products: products.length,
      stockIn: movements.filter((movement) => movement.type === HardwareInventoryMovementType.STOCK_IN).length,
      stockOut: movements.filter((movement) => movement.type === HardwareInventoryMovementType.STOCK_OUT).length,
      stockValueCents: summaries.reduce((total, product) => total + product.currentStock * product.purchaseCostCents, 0),
    };
  }

  async search(context: ActorContext, query: string) {
    await this.enforce(context, "hardware.catalog.read");
    const products = await this.repository.searchProducts(context.tenantId, query);
    const movements = await this.repository.allMovements(context.tenantId);
    return products.map((product) => toProductSummary(product, movements));
  }

  async reminders(context: ActorContext): Promise<HardwareReminder[]> {
    await this.enforce(context, "hardware.inventory.read");
    const [products, movements, customers, suppliers] = await Promise.all([
      this.repository.listProducts(context.tenantId),
      this.repository.allMovements(context.tenantId),
      this.listParties(context, "customer"),
      this.listParties(context, "supplier"),
    ]);
    const summaries = products.map((product) => toProductSummary(product, movements));
    return [
      ...customers.filter((party) => party.currentBalanceCents > 0).map((party) => ({
        actionHref: `/admin/hardware/ledger?tab=customer&party=${party.id}`,
        amountCents: party.currentBalanceCents,
        id: `customer-${party.id}`,
        label: party.name,
        severity: "warning" as const,
        title: "Customer balance pending",
        type: "customer-outstanding" as const,
      })),
      ...suppliers.filter((party) => party.currentBalanceCents > 0).map((party) => ({
        actionHref: `/admin/hardware/ledger?tab=supplier&party=${party.id}`,
        amountCents: party.currentBalanceCents,
        id: `supplier-${party.id}`,
        label: party.name,
        severity: "warning" as const,
        title: "Supplier payable pending",
        type: "supplier-payable" as const,
      })),
      ...summaries.filter((product) => product.stockSetupStatus === "TRACKED" && product.currentStock > 0 && product.lowStock).map((product) => ({
        actionHref: `/admin/hardware/stock?product=${product.id}`,
        currentStock: product.currentStock,
        id: `low-${product.id}`,
        label: product.name,
        severity: "warning" as const,
        title: "Low stock",
        type: "low-stock" as const,
      })),
      ...summaries.filter((product) => product.stockSetupStatus === "TRACKED" && product.currentStock === 0).map((product) => ({
        actionHref: `/admin/hardware/stock?product=${product.id}`,
        currentStock: product.currentStock,
        id: `zero-${product.id}`,
        label: product.name,
        severity: "critical" as const,
        title: "Zero stock",
        type: "zero-stock" as const,
      })),
      ...summaries.filter((product) => product.stockSetupStatus === "PENDING").map((product) => ({
        actionHref: `/admin/hardware/stock?product=${product.id}&setup=1`,
        id: `pending-${product.id}`,
        label: product.name,
        severity: "info" as const,
        title: "Stock setup pending",
        type: "stock-setup-pending" as const,
      })),
    ];
  }

  async ledger(context: ActorContext, role: HardwarePartyRole, partyId?: string): Promise<PartyLedger[]> {
    await this.enforce(context, role === "supplier" ? "hardware.purchase.read" : "hardware.sales.read");
    const parties = (await this.listParties(context, role)).filter((party) => !partyId || party.id === partyId);
    const [invoices, saleReturns, supplierBills, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        orderBy: { createdAt: "asc" },
        where: {
          archivedAt: null,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE] },
          tenantId: context.tenantId,
        },
      }),
      this.prisma.hardwareTradeDocument.findMany({
        orderBy: { createdAt: "asc" },
        where: {
          archivedAt: null,
          status: HardwareTradeDocumentStatus.CONFIRMED,
          tenantId: context.tenantId,
          type: HardwareTradeDocumentType.SALE_RETURN,
        },
      }),
      this.prisma.hardwareTradeDocument.findMany({
        orderBy: { createdAt: "asc" },
        where: {
          archivedAt: null,
          status: HardwareTradeDocumentStatus.CONFIRMED,
          tenantId: context.tenantId,
          type: HardwareTradeDocumentType.SUPPLIER_BILL,
        },
      }),
      this.prisma.paymentRecord.findMany({
        include: { invoice: { select: { clientId: true, invoiceNumber: true, status: true } } },
        orderBy: { receivedAt: "asc" },
        where: { tenantId: context.tenantId },
      }),
    ]);
    return parties.map((party) => {
      let balance = party.openingBalanceCents;
      const entries = [{
        amountCents: party.openingBalanceCents,
        balanceCents: balance,
        creditCents: party.openingBalanceCents < 0 ? Math.abs(party.openingBalanceCents) : 0,
        date: new Date(0),
        debitCents: party.openingBalanceCents > 0 ? party.openingBalanceCents : 0,
        description: "Opening balance",
        reference: "OPENING",
      }];
      if (role === "customer") {
        for (const invoice of invoices.filter((invoice) => invoice.clientId === party.id)) {
          balance += invoice.totalAmountCents;
          entries.push({
            amountCents: invoice.totalAmountCents,
            balanceCents: balance,
            creditCents: 0,
            date: invoice.createdAt,
            debitCents: invoice.totalAmountCents,
            description: invoice.title,
            reference: invoice.invoiceNumber,
          });
        }
        for (const saleReturn of saleReturns.filter((document) => document.customerId === party.id)) {
          const metadata = asRecord(saleReturn.metadata);
          const refundType = readText(metadata.refundType) ?? "customer_credit";
          balance -= saleReturn.totalCents;
          entries.push({
            amountCents: saleReturn.totalCents,
            balanceCents: balance,
            creditCents: saleReturn.totalCents,
            date: saleReturn.createdAt,
            debitCents: 0,
            description: refundType === "customer_credit" ? "Sale return customer credit" : "Sale return refund pending",
            reference: saleReturn.documentNumber,
          });
        }
        for (const payment of payments.filter((payment) => payment.invoice.clientId === party.id)) {
          balance -= payment.amountCents;
          entries.push({
            amountCents: payment.amountCents,
            balanceCents: balance,
            creditCents: payment.amountCents,
            date: payment.receivedAt,
            debitCents: 0,
            description: `Payment ${payment.mode}`,
            reference: payment.reference ?? "PAYMENT",
          });
        }
      } else {
        for (const document of supplierBills.filter((document) => document.supplierId === party.id)) {
          balance += document.totalCents;
          entries.push({
            amountCents: document.totalCents,
            balanceCents: balance,
            creditCents: 0,
            date: document.createdAt,
            debitCents: document.totalCents,
            description: "Supplier bill",
            reference: document.documentNumber,
          });
        }
      }
      entries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.reference.localeCompare(b.reference));
      let running = 0;
      const runningEntries = entries.map((entry) => {
        running += entry.debitCents - entry.creditCents;
        return { ...entry, balanceCents: running };
      });
      return {
        entries: runningEntries,
        openingBalanceCents: party.openingBalanceCents,
        partyId: party.id,
        partyName: party.name,
        totalPaidCents: runningEntries.reduce((total, entry) => total + entry.creditCents, 0),
        totalPayableCents: runningEntries.reduce((total, entry) => total + entry.debitCents, 0),
        totalRemainingCents: runningEntries.at(-1)?.balanceCents ?? 0,
      };
    });
  }

  async searchByBarcode(context: ActorContext, barcode: string) {
    await this.enforce(context, "hardware.catalog.read");
    const product = await this.repository.findProductByBarcode(context.tenantId, barcode);
    if (!product) return null;
    const movements = await this.repository.movementsForProduct(context.tenantId, product.id);
    return toProductSummary(product, movements);
  }

  async importPreview(context: ActorContext, input: HardwareImportPreviewInput): Promise<HardwareImportPreview> {
    await this.enforce(context, "hardware.catalog.manage");
    const errors = input.rows.flatMap((row, index) => {
      const rowNumber = index + 1;
      if (!row.sku || !row.name) return [{ message: "SKU and name are required.", row: rowNumber }];
      return [];
    });
    return { errors, validRows: input.rows.length - errors.length };
  }

  async executeImport(context: ActorContext, input: HardwareImportExecuteInput): Promise<HardwareImportSummary> {
    await this.enforce(context, "hardware.catalog.manage");
    const errors: Array<{ message: string; row: number }> = [];
    let createdRows = 0;
    let skippedRows = 0;

    for (const [index, row] of input.rows.entries()) {
      const rowNumber = index + 1;
      const sku = readText(row.sku);
      const name = readText(row.name);
      const barcode = readText(row.barcode);
      const salesPriceCents = readNumber(row.salesPriceCents);
      const purchaseCostCents = readNumber(row.purchaseCostCents);
      const lowStockThreshold = readNumber(row.lowStockThreshold);

      if (!sku || !name) {
        errors.push({ message: "SKU and name are required.", row: rowNumber });
        continue;
      }
      if ([salesPriceCents, purchaseCostCents, lowStockThreshold].some((value) => value !== undefined && value < 0)) {
        errors.push({ message: "Numeric import values cannot be negative.", row: rowNumber });
        continue;
      }
      if (input.rows.slice(0, index).some((candidate) => readText(candidate.sku) === sku)) {
        errors.push({ message: "Duplicate SKU exists inside this import file.", row: rowNumber });
        continue;
      }
      if (barcode && input.rows.slice(0, index).some((candidate) => readText(candidate.barcode) === barcode)) {
        errors.push({ message: "Duplicate barcode exists inside this import file.", row: rowNumber });
        continue;
      }

      const duplicateSku = await this.repository.findProductBySku(context.tenantId, sku);
      const duplicateBarcode = barcode
        ? await this.repository.findProductByBarcode(context.tenantId, barcode)
        : null;

      if (duplicateSku || duplicateBarcode) {
        const message = duplicateSku ? "Duplicate SKU was found." : "Duplicate barcode was found.";
        if (input.duplicateMode === "skip") {
          skippedRows += 1;
        } else {
          errors.push({ message, row: rowNumber });
        }
        continue;
      }

      await this.repository.createProduct({
        actorId: context.userId,
        data: stripUndefined({
          barcode,
          lowStockThreshold: lowStockThreshold ?? 0,
          name,
          purchaseCostCents: purchaseCostCents ?? 0,
          salesPriceCents: salesPriceCents ?? 0,
          sku,
          tenantId: context.tenantId,
        }) as Prisma.HardwareProductUncheckedCreateInput,
      });
      createdRows += 1;
    }

    return { createdRows, errors, skippedRows, validRows: input.rows.length - errors.length };
  }

  async demoReadiness(context: ActorContext): Promise<HardwareDemoReadiness> {
    await this.enforce(context, "hardware.inventory.read");
    const [settings, locations, products, customerCount, documentCount] = await Promise.all([
      this.repository.getSettings(context.tenantId),
      this.repository.listLocations(context.tenantId),
      this.repository.listProducts(context.tenantId),
      this.prisma.clientOrganization.count({
        where: { archivedAt: null, tenantId: context.tenantId },
      }),
      this.prisma.hardwareTradeDocument.count({
        where: { tenantId: context.tenantId },
      }),
    ]);
    const items = [
      {
        description: settings ? "Firm profile is configured." : "Configure firm name, financial year, and print footer.",
        key: "settings",
        ready: Boolean(settings),
        title: "Hardware business settings",
      },
      {
        description: settings?.defaultStockLocationId ? "Default stock location is selected." : "Select a default stock location for stock operations.",
        key: "stock-location",
        ready: locations.length > 0 && Boolean(settings?.defaultStockLocationId),
        title: "Stock location",
      },
      {
        description: products.length > 0 ? "Products exist for billing and stock flow." : "Add or import verified products.",
        key: "products",
        ready: products.length > 0,
        title: "Products",
      },
      {
        description: customerCount > 0 ? "At least one customer or supplier exists." : "Create verified customers and suppliers.",
        key: "customers",
        ready: customerCount > 0,
        title: "Customers",
      },
      {
        description: settings ? "A4 print projection can use configured firm details." : "Print preview needs business settings.",
        key: "print",
        ready: Boolean(settings),
        title: "Print readiness",
      },
      {
        description: "Offline queue foundation is installed for supported draft actions.",
        key: "offline",
        ready: true,
        title: "Offline readiness",
      },
      {
        description: documentCount > 0 ? "Hardware trade documents exist for demo walkthroughs." : "Create a quotation or sale during the demo flow.",
        key: "documents",
        ready: documentCount > 0,
        title: "Demo documents",
      },
    ];
    return {
      counts: {
        customers: customerCount,
        products: products.length,
        stockLocations: locations.length,
      },
      items,
      ready: items.every((item) => item.ready),
    };
  }

  async operationalDashboard(context: ActorContext): Promise<HardwareOperationalDashboard> {
    await this.enforce(context, "hardware.inventory.read");
    const businessDay = currentIndiaBusinessDay();
    const [
      dashboard,
      recentBills,
      recentPurchases,
      invoices,
      products,
      movements,
      todaySales,
      todayPurchases,
    ] = await Promise.all([
      this.dashboard(context),
      this.prisma.hardwareTradeDocument.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        where: { tenantId: context.tenantId, type: "SUPPLIER_BILL" },
      }),
      this.prisma.hardwareTradeDocument.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        where: {
          tenantId: context.tenantId,
          type: { in: ["PURCHASE_ENTRY", "SUPPLIER_BILL"] },
        },
      }),
      this.prisma.invoice.findMany({ where: { tenantId: context.tenantId } }),
      this.repository.listProducts(context.tenantId),
      this.repository.allMovements(context.tenantId),
      this.prisma.hardwareTradeDocument.aggregate({
        _sum: { totalCents: true },
        where: {
          createdAt: businessDay,
          status: "CONFIRMED",
          tenantId: context.tenantId,
          type: "SALES_ORDER",
        },
      }),
      this.prisma.hardwareTradeDocument.aggregate({
        _sum: { totalCents: true },
        where: {
          createdAt: businessDay,
          status: "CONFIRMED",
          tenantId: context.tenantId,
          type: { in: ["PURCHASE_ENTRY", "SUPPLIER_BILL"] },
        },
      }),
    ]);
    return {
      ...dashboard,
      pendingPaymentsCents: invoices
        .filter((invoice) => ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status))
        .reduce((total, invoice) => total + Math.max(invoice.totalAmountCents - invoice.paidAmountCents, 0), 0),
      recentBills: recentBills.map((document) => ({
        documentNumber: document.documentNumber,
        totalCents: document.totalCents,
      })),
      recentPurchases: recentPurchases.map((document) => ({
        documentNumber: document.documentNumber,
        totalCents: document.totalCents,
      })),
      todayPurchasesCents: todayPurchases._sum.totalCents ?? 0,
      todaySalesCents: todaySales._sum.totalCents ?? 0,
      topProducts: products
        .map((product) => ({
          name: product.name,
          quantity: movements
            .filter((movement) => movement.productId === product.id)
            .reduce((total, movement) => total + movement.quantity, 0),
          sku: product.sku,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    };
  }

  async seedDemoData(context: ActorContext) {
    await this.enforce(context, "hardware.plugin.manage");
    await this.assertDemoSeedAllowed(context.tenantId);
    const categories = await Promise.all(
      genericHardwareDemoData.categories.map((name) =>
        this.prisma.hardwareProductCategory.upsert({
          create: { name, slug: slugify(name), tenantId: context.tenantId },
          update: {},
          where: { tenantId_slug: { slug: slugify(name), tenantId: context.tenantId } },
        }),
      ),
    );
    await Promise.all(
      genericHardwareDemoData.brands.map((name) =>
        this.prisma.hardwareBrand.upsert({
          create: { name, slug: slugify(name), tenantId: context.tenantId },
          update: {},
          where: { tenantId_slug: { slug: slugify(name), tenantId: context.tenantId } },
        }),
      ),
    );
    await Promise.all(
      genericHardwareDemoData.units.map((code) =>
        this.prisma.hardwareUnit.upsert({
          create: { code, name: code, tenantId: context.tenantId },
          update: {},
          where: { tenantId_code: { code, tenantId: context.tenantId } },
        }),
      ),
    );
    const location = await this.prisma.hardwareStockLocation.upsert({
      create: { code: "MAIN", name: "Main Godown", tenantId: context.tenantId },
      update: {},
      where: { tenantId_code: { code: "MAIN", tenantId: context.tenantId } },
    });
    const createdProducts = [];
    for (const sample of genericHardwareDemoData.products) {
      const category = categories.find((entry) => entry.name === sample.category);
      const product = await this.prisma.hardwareProduct.upsert({
        create: {
          barcode: sample.barcode,
          categoryId: category?.id ?? null,
          lowStockThreshold: 5,
          name: sample.name,
          purchaseCostCents: 5000,
          salesPriceCents: 6500,
          sku: sample.sku,
          tenantId: context.tenantId,
        },
        update: {},
        where: { tenantId_sku: { sku: sample.sku, tenantId: context.tenantId } },
      });
      createdProducts.push(product);
      await this.prisma.hardwareInventoryMovement.create({
        data: {
          locationId: location.id,
          productId: product.id,
          quantity: sample.stock,
          referenceType: "demo_seed",
          tenantId: context.tenantId,
          type: HardwareInventoryMovementType.STOCK_IN,
        },
      });
    }
    const customers = await Promise.all(
      [...genericHardwareDemoData.customers, ...genericHardwareDemoData.suppliers].map((name) =>
        this.prisma.clientOrganization.upsert({
          create: {
            lifecycleStage: ClientLifecycleStage.CLIENT,
            name,
            slug: slugify(name),
            tenantId: context.tenantId,
          },
          update: {},
          where: { tenantId_slug: { slug: slugify(name), tenantId: context.tenantId } },
        }),
      ),
    );
    return {
      categories: categories.length,
      customers: customers.length,
      location: location.name,
      products: createdProducts.length,
    };
  }

  async resetDemoData(context: ActorContext) {
    await this.enforce(context, "hardware.plugin.manage");
    await this.assertDemoSeedAllowed(context.tenantId);
    const sampleSkus = genericHardwareDemoData.products.map((product) => product.sku);
    const sampleClientSlugs = [
      ...genericHardwareDemoData.customers,
      ...genericHardwareDemoData.suppliers,
    ].map(slugify);
    const [movements, products, categories, brands, clients] = await this.prisma.$transaction([
      this.prisma.hardwareInventoryMovement.deleteMany({
        where: { referenceType: "demo_seed", tenantId: context.tenantId },
      }),
      this.prisma.hardwareProduct.deleteMany({
        where: { sku: { in: sampleSkus }, tenantId: context.tenantId },
      }),
      this.prisma.hardwareProductCategory.deleteMany({
        where: { slug: { in: genericHardwareDemoData.categories.map(slugify) }, tenantId: context.tenantId },
      }),
      this.prisma.hardwareBrand.deleteMany({
        where: { slug: { in: genericHardwareDemoData.brands.map(slugify) }, tenantId: context.tenantId },
      }),
      this.prisma.clientOrganization.deleteMany({
        where: { slug: { in: sampleClientSlugs }, tenantId: context.tenantId },
      }),
    ]);
    return {
      brands: brands.count,
      categories: categories.count,
      clients: clients.count,
      movements: movements.count,
      products: products.count,
    };
  }

  async csvExport(context: ActorContext): Promise<HardwareCsvExportContract> {
    const products = await this.listProducts(context);
    return {
      columns: ["sku", "name", "barcode", "currentStock", "salesPriceCents", "purchaseCostCents"],
      filename: "hardware-products.csv",
      format: "csv",
      rows: products.map((product) => ({
        barcode: product.barcode ?? "",
        currentStock: String(product.currentStock),
        name: product.name,
        purchaseCostCents: String(product.purchaseCostCents),
        salesPriceCents: String(product.salesPriceCents),
        sku: product.sku,
      })),
    };
  }

  private async validateOptionalLinks(tenantId: string, input: HardwareProductInput) {
    if (input.categoryId) await this.assertExists("hardwareProductCategory", tenantId, input.categoryId, "Category was not found.");
    if (input.brandId) await this.assertExists("hardwareBrand", tenantId, input.brandId, "Brand was not found.");
    if (input.unitId) await this.assertExists("hardwareUnit", tenantId, input.unitId, "Unit was not found.");
  }

  private async assertDemoSeedAllowed(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ select: { branding: true }, where: { id: tenantId } });
    if (asRecord(asRecord(tenant?.branding).officialIdentity).status === "LOCKED") {
      throw validation("Demo data controls are disabled after official tenant identity is locked.");
    }
  }

  private async validateMovementLinks(tenantId: string, input: HardwareMovementInput) {
    await this.assertExists("hardwareStockLocation", tenantId, input.locationId, "Stock location was not found.");
    if (input.supplierId) await this.assertClient(tenantId, input.supplierId, "Supplier link was not found.");
    if (input.customerId) await this.assertClient(tenantId, input.customerId, "Customer link was not found.");
  }

  private async assertClient(tenantId: string, id: string, message: string) {
    const record = await this.prisma.clientOrganization.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation(message);
  }

  private async assertExists(
    model: "hardwareProductCategory" | "hardwareBrand" | "hardwareUnit" | "hardwareStockLocation",
    tenantId: string,
    id: string,
    message: string,
  ) {
    const record =
      model === "hardwareProductCategory"
        ? await this.prisma.hardwareProductCategory.findFirst({ select: { id: true }, where: { id, tenantId } })
        : model === "hardwareBrand"
          ? await this.prisma.hardwareBrand.findFirst({ select: { id: true }, where: { id, tenantId } })
          : model === "hardwareUnit"
            ? await this.prisma.hardwareUnit.findFirst({ select: { id: true }, where: { id, tenantId } })
            : await this.prisma.hardwareStockLocation.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation(message);
  }

  private async nextProductSku(tenantId: string, name: string) {
    const base = slugify(name).toUpperCase().replaceAll("-", "").slice(0, 12) || "ITEM";
    let sequence = 1;
    let candidate = `${base}-${sequence.toString().padStart(3, "0")}`;
    while (await this.repository.findProductBySku(tenantId, candidate)) {
      sequence += 1;
      candidate = `${base}-${sequence.toString().padStart(3, "0")}`;
    }
    return candidate;
  }

  private ensureDefaultUnit(tenantId: string) {
    return this.prisma.hardwareUnit.upsert({
      create: { code: "PCS", name: "Pieces", tenantId },
      update: {},
      where: { tenantId_code: { code: "PCS", tenantId } },
    });
  }

  private async nextPartySlug(tenantId: string, name: string) {
    const base = slugify(name) || "party";
    let candidate = base;
    let sequence = 1;
    while (await this.prisma.clientOrganization.findUnique({ where: { tenantId_slug: { slug: candidate, tenantId } } })) {
      sequence += 1;
      candidate = `${base}-${sequence}`;
    }
    return candidate;
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}.${string}`, "hardware.plugin.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeComparable(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/gu, "").replace(/^0+/u, "") ?? "";
  if (!digits) return undefined;
  return digits.length === 10 ? `91${digits}` : digits;
}

function readNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function validateGstTaxConfig(config: Record<string, unknown> | undefined) {
  const rate = config?.rateBps;
  if (rate === undefined) return;
  if (typeof rate !== "number" || !Number.isInteger(rate) || rate < 0 || rate > 10_000) {
    throw validation("GST rate must be between 0 and 10000 basis points.");
  }
}

function toProductSummary(product: ProductRecord, movements: MovementRecord[]): HardwareProductSummary {
  const currentStock = stockForProduct(movements.filter((movement) => movement.productId === product.id));
  const gstTaxConfig = asRecord(product.gstTaxConfig);
  const metadata = asRecord(product.metadata);
  return {
    barcode: product.barcode,
    brandName: product.brand?.name ?? null,
    categoryName: product.category?.name ?? null,
    currentStock,
    gstRateBps: readInteger(gstTaxConfig.rateBps) ?? null,
    hsnCode: readText(metadata.hsnCode) ?? null,
    id: product.id,
    lowStock: currentStock <= product.lowStockThreshold,
    lowStockThreshold: product.lowStockThreshold,
    name: product.name,
    purchaseCostCents: product.purchaseCostCents,
    salesPriceCents: product.salesPriceCents,
    sku: product.sku,
    stockSetupStatus: metadata.stockSetupStatus === "PENDING" ? "PENDING" : "TRACKED",
    status: "ACTIVE",
    unitCode: product.unit?.code ?? null,
  };
}

export function stockForProduct(movements: Array<{ quantity: number; type: HardwareInventoryMovementType }>) {
  return movements.reduce((stock, movement) => {
    if (movement.type === HardwareInventoryMovementType.STOCK_IN) return stock + movement.quantity;
    if (movement.type === HardwareInventoryMovementType.STOCK_OUT) return stock - movement.quantity;
    return movement.quantity;
  }, 0);
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

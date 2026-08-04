import {
  ClientLifecycleStage,
  AuditAction,
  FinancialPartyType,
  FinancialTransactionStatus,
  HardwareInventoryMovementType,
  HardwareTimelineVerb,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { createHash } from "node:crypto";
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
type ImportAction = "create" | "skip" | "update";
type NormalizedImportRow = {
  action: ImportAction;
  active: boolean;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  errors: Array<{ field?: string; message: string; row: number }>;
  existingMetadata?: Prisma.JsonValue | undefined;
  existingProductId?: string | undefined;
  gstRateBps: number;
  hsnCode: string | null;
  minimumStock: number;
  mrpCents: number;
  name: string;
  openingStock: number;
  purchaseCostCents: number;
  row: number;
  salesPriceCents: number;
  shouldCreateOpeningStock: boolean;
  sku: string;
  stockLocation: string | null;
  unit: string | null;
  warnings: string[];
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
      if (!hardwarePartyRoles(customFields).includes(role)) return [];
      const openingBalanceCents = openingBalanceForRole(customFields, role);
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
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { id: true, phone: true },
          take: 1,
        },
      },
      where: { archivedAt: null, deletedAt: null, tenantId: context.tenantId },
    });
    const duplicate = existing.find((party) => {
      const customFields = asRecord(party.customFields);
      const sameName = normalizeComparable(party.name) === normalizedName;
      const existingMobile = normalizeMobile(party.contacts[0]?.phone ?? readText(customFields.phone));
      const sameMobile = Boolean(normalizedMobile && existingMobile === normalizedMobile);
      return sameName || sameMobile;
    });
    const openingBalanceCents = input.openingBalanceCents ?? 0;
    const signedOpening =
      openingBalanceCents === 0
        ? 0
        : input.balanceDirection === "CR"
          ? -openingBalanceCents
          : openingBalanceCents;

    if (duplicate) {
      const customFields = asRecord(duplicate.customFields);
      const roles = hardwarePartyRoles(customFields);
      const mergedRoles = roles.includes(input.role) ? roles : [...roles, input.role];
      const balances = {
        customer: openingBalanceForRole(customFields, "customer"),
        supplier: openingBalanceForRole(customFields, "supplier"),
      };
      if (input.openingBalanceCents !== undefined) balances[input.role] = signedOpening;
      const nextCustomFields = stripUndefined({
        ...customFields,
        address: input.address ?? readText(customFields.address),
        gstin: input.gstin ?? readText(customFields.gstin),
        hardwareOpeningBalances: balances,
        hardwarePartyRole: readText(customFields.hardwarePartyRole) ?? mergedRoles[0] ?? input.role,
        hardwarePartyRoles: mergedRoles,
        phone: normalizedMobile ?? readText(customFields.phone),
      });
      await this.prisma.clientOrganization.update({
        data: { customFields: nextCustomFields as Prisma.InputJsonValue },
        where: { id: duplicate.id },
      });
      const contact = duplicate.contacts[0];
      if (normalizedMobile && contact?.phone !== normalizedMobile) {
        if (contact) {
          await this.prisma.clientContact.update({
            data: { phone: normalizedMobile },
            where: { id: contact.id },
          });
        } else {
          await this.prisma.clientContact.create({
            data: {
              clientId: duplicate.id,
              email: `${duplicate.id}@local.invalid`,
              isPrimary: true,
              name: duplicate.name,
              normalizedEmail: `${duplicate.id}@local.invalid`,
              phone: normalizedMobile,
              tenantId: context.tenantId,
            },
          });
        }
      }
      const roleOpeningBalance = balances[input.role];
      return {
        balanceSide: roleOpeningBalance === 0 ? null : input.role === "supplier" ? (roleOpeningBalance > 0 ? "CR" : "DR") : (roleOpeningBalance > 0 ? "DR" : "CR"),
        contact: normalizedMobile ?? contact?.phone ?? readText(customFields.phone) ?? null,
        currentBalanceCents: roleOpeningBalance,
        gstin: input.gstin ?? readText(customFields.gstin) ?? null,
        id: duplicate.id,
        name: duplicate.name,
        openingBalanceCents: roleOpeningBalance,
        role: input.role,
      };
    }

    const party = await this.prisma.clientOrganization.create({
      data: {
        customFields: stripUndefined({
          address: input.address,
          gstin: input.gstin,
          hardwareOpeningBalances: { [input.role]: signedOpening },
          hardwarePartyRole: input.role,
          hardwarePartyRoles: [input.role],
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
    const [financialTransactions, invoices, saleReturns, supplierBills, payments] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        orderBy: { occurredAt: "asc" },
        where: {
          partyType: role === "supplier" ? FinancialPartyType.SUPPLIER : FinancialPartyType.CUSTOMER,
          status: FinancialTransactionStatus.POSTED,
          tenantId: context.tenantId,
        },
      }),
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
      const durableEntries = financialTransactions.filter((transaction) => transaction.partyId === party.id);
      if (durableEntries.length > 0) {
        for (const transaction of durableEntries) {
          balance += transaction.debitCents - transaction.creditCents;
          entries.push({
            amountCents: transaction.amountCents,
            balanceCents: balance,
            creditCents: transaction.creditCents,
            date: transaction.occurredAt,
            debitCents: transaction.debitCents,
            description: humanize(transaction.type),
            reference: transaction.sourceNumber ?? transaction.transactionNumber,
          });
        }
        return buildPartyLedger(party, entries);
      }
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
      return buildPartyLedger(party, entries);
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
    return this.prepareImport(context, input);
  }

  async executeImport(context: ActorContext, input: HardwareImportExecuteInput): Promise<HardwareImportSummary> {
    await this.enforce(context, "hardware.catalog.manage");
    const idempotencyKey = input.idempotencyKey?.trim();
    const existingImport = idempotencyKey
      ? await this.prisma.auditEvent.findFirst({
          select: { id: true },
          where: {
            action: AuditAction.HARDWARE_CATALOG_UPDATED,
            targetId: idempotencyKey,
            targetType: "HardwareProductImport",
            tenantId: context.tenantId,
          },
        })
      : null;
    const preview = await this.prepareImport(context, input);
    if (existingImport) {
      return {
        ...preview,
        createdRows: 0,
        dryRun: false,
        skippedRows: preview.validRows,
        updatedRows: 0,
      };
    }
    if (preview.errors.length > 0) {
      return {
        ...preview,
        createdRows: 0,
        dryRun: Boolean(input.dryRun),
        skippedRows: preview.rows.filter((row) => row.action === "skip").length,
        updatedRows: 0,
      };
    }
    if (input.dryRun) {
      return {
        ...preview,
        createdRows: 0,
        dryRun: true,
        skippedRows: preview.rows.filter((row) => row.action === "skip").length,
        updatedRows: 0,
      };
    }

    const normalizedRows = await this.normalizedImportRows(context, input);
    const actionableRows = normalizedRows.filter((row) => row.action !== "skip");
    const importId = idempotencyKey ?? preview.importId;
    const result = await this.prisma.$transaction(async (tx) => {
      let createdRows = 0;
      let updatedRows = 0;
      for (const row of actionableRows) {
        const categoryId = row.category ? (await tx.hardwareProductCategory.upsert({
          create: { name: row.category, slug: slugify(row.category), tenantId: context.tenantId },
          update: {},
          where: { tenantId_slug: { slug: slugify(row.category), tenantId: context.tenantId } },
        })).id : undefined;
        const brandId = row.brand ? (await tx.hardwareBrand.upsert({
          create: { name: row.brand, slug: slugify(row.brand), tenantId: context.tenantId },
          update: {},
          where: { tenantId_slug: { slug: slugify(row.brand), tenantId: context.tenantId } },
        })).id : undefined;
        const unitId = row.unit ? (await tx.hardwareUnit.upsert({
          create: { code: row.unit.toUpperCase(), name: row.unit.toUpperCase(), tenantId: context.tenantId },
          update: {},
          where: { tenantId_code: { code: row.unit.toUpperCase(), tenantId: context.tenantId } },
        })).id : undefined;
        const productData = stripUndefined({
          archivedAt: row.active ? null : new Date(),
          barcode: row.barcode,
          brandId,
          categoryId,
          gstTaxConfig: { rateBps: row.gstRateBps },
          lowStockThreshold: row.minimumStock,
          metadata: {
            ...asRecord(row.existingMetadata),
            hsnCode: row.hsnCode,
            importId,
            mrpCents: row.mrpCents,
            stockSetupStatus: row.openingStock > 0 ? "TRACKED" : "PENDING",
          } as Prisma.InputJsonValue,
          name: row.name,
          purchaseCostCents: row.purchaseCostCents,
          salesPriceCents: row.salesPriceCents,
          sku: row.sku,
          tenantId: context.tenantId,
          unitId,
        }) as Prisma.HardwareProductUncheckedCreateInput;
        const product = row.existingProductId
          ? await tx.hardwareProduct.update({
              data: stripUndefined({
                archivedAt: productData.archivedAt,
                barcode: productData.barcode,
                brandId: productData.brandId,
                categoryId: productData.categoryId,
                gstTaxConfig: productData.gstTaxConfig,
                lowStockThreshold: productData.lowStockThreshold,
                metadata: productData.metadata,
                name: productData.name,
                purchaseCostCents: productData.purchaseCostCents,
                salesPriceCents: productData.salesPriceCents,
                unitId: productData.unitId,
              }) as Prisma.HardwareProductUncheckedUpdateInput,
              where: { id: row.existingProductId },
            })
          : await tx.hardwareProduct.create({ data: productData });
        if (row.existingProductId) {
          updatedRows += 1;
        } else {
          createdRows += 1;
        }
        await tx.hardwareTimelineEvent.create({
          data: {
            actorId: context.userId,
            metadata: { importId, row: row.row },
            productId: product.id,
            summary: `${row.existingProductId ? "Updated" : "Imported"} product ${product.sku}`,
            tenantId: context.tenantId,
            verb: row.existingProductId ? HardwareTimelineVerb.PRODUCT_UPDATED : HardwareTimelineVerb.PRODUCT_CREATED,
          },
        });
        if (row.openingStock > 0 && row.shouldCreateOpeningStock) {
          const location = await this.ensureImportLocation(tx, context.tenantId, row.stockLocation);
          await tx.hardwareInventoryMovement.create({
            data: {
              locationId: location.id,
              metadata: { importId, row: row.row, source: "product_import" } as Prisma.InputJsonValue,
              notes: "Opening stock from product import",
              productId: product.id,
              quantity: row.openingStock,
              referenceId: importId,
              referenceType: "hardware_product_import_opening_stock",
              tenantId: context.tenantId,
              type: HardwareInventoryMovementType.STOCK_IN,
              unitCostCents: row.purchaseCostCents,
              unitPriceCents: row.salesPriceCents,
            },
          });
          await tx.auditEvent.create({
            data: {
              action: AuditAction.HARDWARE_STOCK_MOVED,
              actorId: context.userId,
              metadata: { importId, quantity: row.openingStock, row: row.row },
              targetId: product.id,
              targetType: "HardwareProduct",
              tenantId: context.tenantId,
            },
          });
        }
      }
      await tx.hardwareTimelineEvent.create({
        data: {
          actorId: context.userId,
          metadata: { createdRows, importId, mode: input.mode, updatedRows },
          summary: `Imported ${createdRows} product${createdRows === 1 ? "" : "s"} and updated ${updatedRows}`,
          tenantId: context.tenantId,
          verb: HardwareTimelineVerb.IMPORT_PREVIEWED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_CATALOG_UPDATED,
          actorId: context.userId,
          metadata: { createdRows, importId, mode: input.mode, rowCount: input.rows.length, updatedRows },
          targetId: importId,
          targetType: "HardwareProductImport",
          tenantId: context.tenantId,
        },
      });
      return { createdRows, updatedRows };
    });

    return {
      ...preview,
      createdRows: result.createdRows,
      dryRun: false,
      skippedRows: preview.rows.filter((row) => row.action === "skip").length,
      updatedRows: result.updatedRows,
    };
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

  private async prepareImport(context: ActorContext, input: HardwareImportPreviewInput): Promise<HardwareImportPreview> {
    const rows = await this.normalizedImportRows(context, input);
    const errors = rows.flatMap((row) => row.errors);
    const importId = input.importId?.trim() || importFingerprint(context.tenantId, rows);
    return {
      errors,
      importId,
      mode: input.mode,
      rows: rows.map((row) => ({
        action: row.action,
        barcode: row.barcode,
        brand: row.brand,
        category: row.category,
        name: row.name,
        openingStock: row.openingStock,
        row: row.row,
        sku: row.sku,
        stockLocation: row.stockLocation,
        unit: row.unit,
        warnings: row.warnings,
      })),
      validRows: rows.filter((row) => row.errors.length === 0 && row.action !== "skip").length,
    };
  }

  private async normalizedImportRows(context: ActorContext, input: HardwareImportPreviewInput): Promise<NormalizedImportRow[]> {
    const products = await this.prisma.hardwareProduct.findMany({
      select: { barcode: true, id: true, metadata: true, sku: true },
      where: { archivedAt: null, tenantId: context.tenantId },
    });
    const movements = await this.repository.allMovements(context.tenantId);
    const skuSeen = new Map<string, number>();
    const barcodeSeen = new Map<string, number>();
    return input.rows.map((rawRow, index) => {
      const row = readImportRow(rawRow);
      const rowNumber = index + 1;
      const sku = normalizeSku(readImportText(row, ["sku", "item sku", "product sku"]));
      const name = readImportText(row, ["product name", "name", "item name"]);
      const barcode = readImportText(row, ["barcode", "bar code", "ean", "upc"]) ?? null;
      const category = readImportText(row, ["category", "product category"]) ?? null;
      const brand = readImportText(row, ["brand", "make"]) ?? null;
      const unit = readImportText(row, ["unit", "uom", "unit code"])?.toUpperCase() ?? null;
      const hsnCode = readImportText(row, ["hsn", "hsn code"]) ?? null;
      const stockLocation = readImportText(row, ["stock location", "location", "godown"]) ?? null;
      const gstRateBps = readImportRateBps(row);
      const purchaseCostCents = readMoneyCents(row, ["purchase rate", "purchase cost", "purchase price"], ["purchaseCostCents", "purchase cost cents"]);
      const salesPriceCents = readMoneyCents(row, ["sale rate", "sales rate", "selling price", "sale price"], ["salesPriceCents", "sale price cents"]);
      const mrpCents = readMoneyCents(row, ["mrp"], ["mrpCents", "mrp cents"]);
      const openingStock = readNonNegativeInteger(row, ["opening stock", "stock", "opening quantity"]);
      const minimumStock = readNonNegativeInteger(row, ["minimum stock", "minimum qty", "low stock threshold", "min stock"]);
      const active = readActiveStatus(readImportText(row, ["active status", "status", "active"]));
      const errors: NormalizedImportRow["errors"] = [];
      const warnings: string[] = [];

      for (const [field, value] of Object.entries({ barcode, brand, category, hsnCode, name, sku, stockLocation, unit })) {
        if (value && isSpreadsheetFormula(value)) {
          errors.push({ field, message: "Spreadsheet formulas are not allowed in import text fields.", row: rowNumber });
        }
      }
      if (!sku) errors.push({ field: "sku", message: "SKU is required.", row: rowNumber });
      if (!name) errors.push({ field: "name", message: "Product name is required.", row: rowNumber });
      if (sku && skuSeen.has(sku)) {
        errors.push({ field: "sku", message: `Duplicate SKU exists inside this import file. First seen on row ${skuSeen.get(sku)}.`, row: rowNumber });
      } else if (sku) {
        skuSeen.set(sku, rowNumber);
      }
      if (barcode && barcodeSeen.has(barcode)) {
        errors.push({ field: "barcode", message: `Duplicate barcode exists inside this import file. First seen on row ${barcodeSeen.get(barcode)}.`, row: rowNumber });
      } else if (barcode) {
        barcodeSeen.set(barcode, rowNumber);
      }
      if (hsnCode && !/^\d{4,8}$/u.test(hsnCode)) {
        errors.push({ field: "hsn", message: "HSN must be 4 to 8 digits.", row: rowNumber });
      }
      if (gstRateBps === undefined) {
        errors.push({ field: "gstRate", message: "GST rate must be a valid percentage between 0 and 100.", row: rowNumber });
      }
      for (const [field, value] of Object.entries({ minimumStock, mrpCents, openingStock, purchaseCostCents, salesPriceCents })) {
        if (value === undefined) errors.push({ field, message: "Numeric value must be zero or greater.", row: rowNumber });
      }

      const existingBySku = sku ? products.find((product) => product.sku.toLowerCase() === sku.toLowerCase()) : undefined;
      const existingByBarcode = barcode ? products.find((product) => product.barcode?.toLowerCase() === barcode.toLowerCase()) : undefined;
      if (existingByBarcode && existingBySku && existingByBarcode.id !== existingBySku.id) {
        errors.push({ field: "barcode", message: "Barcode belongs to another product in this tenant.", row: rowNumber });
      }
      let action: ImportAction = "create";
      if (existingByBarcode && !existingBySku) {
        if ("duplicateMode" in input && input.duplicateMode === "skip") {
          action = "skip";
          warnings.push("Existing barcode will be skipped.");
        } else {
          errors.push({ field: "barcode", message: "Duplicate barcode was found.", row: rowNumber });
        }
      }
      if (input.mode === "update") {
        if (!existingBySku) {
          errors.push({ field: "sku", message: "Update mode requires an existing product with this SKU.", row: rowNumber });
        }
        action = "update";
      } else if (existingBySku) {
        if (input.mode === "upsert") {
          action = "update";
        } else if ("duplicateMode" in input && input.duplicateMode === "skip") {
          action = "skip";
          warnings.push("Existing SKU will be skipped.");
        } else {
          errors.push({ field: "sku", message: "Duplicate SKU was found.", row: rowNumber });
        }
      }
      const hasMovements = existingBySku ? movements.some((movement) => movement.productId === existingBySku.id) : false;
      if (existingBySku && (openingStock ?? 0) > 0 && hasMovements) {
        warnings.push("Opening stock will not be added because this existing product already has stock movements.");
      }

      return {
        action,
        active,
        barcode,
        brand,
        category,
        errors,
        existingMetadata: existingBySku?.metadata,
        existingProductId: existingBySku?.id,
        gstRateBps: gstRateBps ?? 0,
        hsnCode,
        minimumStock: minimumStock ?? 0,
        mrpCents: mrpCents ?? 0,
        name: name ?? "",
        openingStock: openingStock ?? 0,
        purchaseCostCents: purchaseCostCents ?? 0,
        row: rowNumber,
        salesPriceCents: salesPriceCents ?? 0,
        shouldCreateOpeningStock: !existingBySku || !hasMovements,
        sku: sku ?? "",
        stockLocation,
        unit,
        warnings,
      };
    });
  }

  private ensureImportLocation(tx: Prisma.TransactionClient, tenantId: string, name: string | null) {
    const locationName = name ?? "Main Godown";
    const code = slugify(locationName).replaceAll("-", "_").toUpperCase().slice(0, 40) || "MAIN";
    return tx.hardwareStockLocation.upsert({
      create: { code, name: locationName, tenantId },
      update: {},
      where: { tenantId_code: { code, tenantId } },
    });
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

function readImportRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeImportKey(key), value]));
}

function readImportText(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeImportKey(alias)];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function normalizeImportKey(key: string) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function normalizeSku(value: string | undefined) {
  return value?.trim().replace(/\s+/gu, "-").toUpperCase();
}

function isSpreadsheetFormula(value: string) {
  return /^[=+\-@]/u.test(value.trim());
}

function normalizeComparable(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/gu, "").replace(/^0+/u, "") ?? "";
  if (!digits) return undefined;
  return digits.length === 10 ? `91${digits}` : digits;
}

function hardwarePartyRoles(customFields: Record<string, unknown>): HardwarePartyRole[] {
  const roles = Array.isArray(customFields.hardwarePartyRoles)
    ? customFields.hardwarePartyRoles.filter(
        (role): role is HardwarePartyRole => role === "customer" || role === "supplier",
      )
    : [];
  const legacyRole = readText(customFields.hardwarePartyRole);
  if ((legacyRole === "customer" || legacyRole === "supplier") && !roles.includes(legacyRole)) {
    roles.push(legacyRole);
  }
  return roles;
}

function openingBalanceForRole(customFields: Record<string, unknown>, role: HardwarePartyRole) {
  const balances = asRecord(customFields.hardwareOpeningBalances);
  const explicit = readInteger(balances[role]);
  if (explicit !== undefined) return explicit;
  return readText(customFields.hardwarePartyRole) === role
    ? readInteger(customFields.openingBalanceCents) ?? 0
    : 0;
}

function readNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readImportNumber(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const raw = row[normalizeImportKey(alias)];
    const value = typeof raw === "string" ? raw.replace(/[,\s]/gu, "").replace(/%$/u, "") : raw;
    const parsed = readNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function readMoneyCents(row: Record<string, unknown>, rupeeAliases: string[], centAliases: string[]) {
  const cents = readImportNumber(row, centAliases);
  if (cents !== undefined) return Number.isInteger(cents) && cents >= 0 ? cents : undefined;
  const rupees = readImportNumber(row, rupeeAliases);
  if (rupees === undefined) return 0;
  if (rupees < 0) return undefined;
  return Math.round(rupees * 100);
}

function readNonNegativeInteger(row: Record<string, unknown>, aliases: string[]) {
  const value = readImportNumber(row, aliases);
  if (value === undefined) return 0;
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function readImportRateBps(row: Record<string, unknown>) {
  const bps = readImportNumber(row, ["gst rate bps", "gstRateBps"]);
  if (bps !== undefined) return Number.isInteger(bps) && bps >= 0 && bps <= 10_000 ? bps : undefined;
  const rate = readImportNumber(row, ["gst rate", "gst", "tax rate"]);
  if (rate === undefined) return 0;
  return rate >= 0 && rate <= 100 ? Math.round(rate * 100) : undefined;
}

function readActiveStatus(value: string | undefined) {
  if (!value) return true;
  return !["archived", "false", "inactive", "no", "0"].includes(value.trim().toLowerCase());
}

function validateGstTaxConfig(config: Record<string, unknown> | undefined) {
  const rate = config?.rateBps;
  if (rate === undefined) return;
  if (typeof rate !== "number" || !Number.isInteger(rate) || rate < 0 || rate > 10_000) {
    throw validation("GST rate must be between 0 and 10000 basis points.");
  }
}

function importFingerprint(tenantId: string, rows: NormalizedImportRow[]) {
  const hash = createHash("sha256")
    .update(tenantId)
    .update(JSON.stringify(rows.map((row) => ({
      action: row.action,
      active: row.active,
      barcode: row.barcode,
      brand: row.brand,
      category: row.category,
      existingProductId: row.existingProductId,
      gstRateBps: row.gstRateBps,
      hsnCode: row.hsnCode,
      minimumStock: row.minimumStock,
      mrpCents: row.mrpCents,
      name: row.name,
      openingStock: row.openingStock,
      purchaseCostCents: row.purchaseCostCents,
      row: row.row,
      salesPriceCents: row.salesPriceCents,
      sku: row.sku,
      stockLocation: row.stockLocation,
      unit: row.unit,
    }))))
    .digest("hex")
    .slice(0, 24);
  return `hardware-import-${hash}`;
}

function toProductSummary(product: ProductRecord, movements: MovementRecord[]): HardwareProductSummary {
  const productMovements = movements.filter((movement) => movement.productId === product.id);
  const currentStock = stockForProduct(productMovements);
  const gstTaxConfig = asRecord(product.gstTaxConfig);
  const metadata = asRecord(product.metadata);
  return {
    barcode: product.barcode,
    brandName: product.brand?.name ?? null,
    categoryName: product.category?.name ?? null,
    currentStock,
    gstRateBps:
      readRateBps(metadata.lastSalesGstRateBps) ??
      readRateBps(gstTaxConfig.rateBps) ??
      null,
    hsnCode: readText(metadata.hsnCode) ?? null,
    id: product.id,
    lowStock: currentStock <= product.lowStockThreshold,
    lowStockThreshold: product.lowStockThreshold,
    name: product.name,
    purchaseCostCents: product.purchaseCostCents,
    salesDiscountBps: readRateBps(metadata.lastSalesDiscountBps) ?? 0,
    salesPriceCents: product.salesPriceCents,
    sku: product.sku,
    stockSetupStatus: metadata.stockSetupStatus === "PENDING" && productMovements.length === 0 ? "PENDING" : "TRACKED",
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

function buildPartyLedger(
  party: HardwarePartySummary,
  entries: PartyLedger["entries"],
): PartyLedger {
  entries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.reference.localeCompare(b.reference));
  let running = 0;
  const runningEntries = entries.map((entry) => {
    if (entry.reference === "OPENING") {
      running = entry.balanceCents;
      return entry;
    }
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
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
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

function readRateBps(value: unknown) {
  const rate = readInteger(value);
  return rate !== undefined && rate >= 0 && rate <= 10_000 ? rate : undefined;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

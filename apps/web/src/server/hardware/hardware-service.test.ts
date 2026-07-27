import {
  HardwareInventoryMovementType,
  HardwareTradeDocumentType,
  InvoiceStatus,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareService, stockForProduct } from "./hardware-service";
import { hardwareMovementSchema } from "./schemas";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "hardware-manager",
          permissions: [
            { permission: { key: "hardware.catalog.read" } },
            { permission: { key: "hardware.catalog.manage" } },
            { permission: { key: "hardware.inventory.read" } },
            { permission: { key: "hardware.inventory.manage" } },
            { permission: { key: "hardware.settings.read" } },
            { permission: { key: "hardware.settings.manage" } },
            { permission: { key: "hardware.plugin.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("HardwareService", () => {
  it("calculates inventory movement stock", () => {
    expect(
      stockForProduct([
        { quantity: 10, type: HardwareInventoryMovementType.STOCK_IN },
        { quantity: 3, type: HardwareInventoryMovementType.STOCK_OUT },
        { quantity: 5, type: HardwareInventoryMovementType.ADJUSTMENT },
      ]),
    ).toBe(5);
  });

  it("allows an absolute stock adjustment to zero", () => {
    expect(hardwareMovementSchema.safeParse({
      locationId: "loc_1",
      productId: "prod_1",
      quantity: 0,
      type: HardwareInventoryMovementType.ADJUSTMENT,
    }).success).toBe(true);
    expect(hardwareMovementSchema.safeParse({
      locationId: "loc_1",
      productId: "prod_1",
      quantity: 0,
      type: HardwareInventoryMovementType.STOCK_OUT,
    }).success).toBe(false);
  });

  it("validates import preview rows", async () => {
    const service = new HardwareService(prismaMock({
      hardwareInventoryMovement: { findMany: async () => [] },
      hardwareProduct: { findMany: async () => [] },
    } as unknown as Partial<PrismaClient>));
    const preview = await service.importPreview(
      { tenantId: "tenant_1", userId: "user_1" },
      { mode: "create", rows: [{ name: "Pipe" }, { sku: "SKU-1", name: "Tap" }] },
    );
    expect(preview).toMatchObject({
      errors: [{ field: "sku", message: "SKU is required.", row: 1 }],
      mode: "create",
      validRows: 1,
    });
    expect(preview.importId).toMatch(/^hardware-import-/u);
  });

  it("previews product imports with duplicate SKU and barcode handling", async () => {
    const created: Array<Record<string, unknown>> = [];
    const service = new HardwareService(
      prismaMock({
        $transaction: async (
          callback: (tx: {
            auditEvent: { create: () => Promise<unknown> };
            hardwareProduct: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
            hardwareTimelineEvent: { create: () => Promise<unknown> };
          }) => Promise<unknown>,
        ) =>
          callback({
            auditEvent: { create: async () => ({}) },
            hardwareProduct: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                created.push(data);
                return { id: `prod_${created.length}`, ...data };
              },
            },
            hardwareTimelineEvent: { create: async () => ({}) },
          }),
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareProduct: {
          findMany: async () => [
            { barcode: null, id: "existing_sku", metadata: {}, sku: "DUP-SKU" },
            { barcode: "DUP-BAR", id: "existing_barcode", metadata: {}, sku: "OTHER-SKU" },
          ],
          findFirst: async ({ where }: { where: { barcode?: string; sku?: string } }) => {
            if (where.sku === "DUP-SKU" || where.barcode === "DUP-BAR") return { id: "existing" };
            return null;
          },
        },
      } as unknown as Partial<PrismaClient>),
    );

    const summary = await service.executeImport(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        duplicateMode: "skip",
        dryRun: false,
        mode: "create",
        rows: [
          { barcode: "111", name: "Angle Valve", sku: "ANG-VALVE" },
          { barcode: "222", name: "", sku: "BAD" },
          { barcode: "333", name: "Duplicate SKU", sku: "DUP-SKU" },
          { barcode: "DUP-BAR", name: "Duplicate Barcode", sku: "NEW-SKU" },
        ],
      },
    );

    expect(created).toHaveLength(0);
    expect(summary.createdRows).toBe(0);
    expect(summary.errors).toEqual([{ field: "name", message: "Product name is required.", row: 2 }]);
    expect(summary.skippedRows).toBe(2);
    expect(summary.validRows).toBe(1);
  });

  it("rejects invalid import rows before execution", async () => {
    const service = new HardwareService(
      prismaMock({
        $transaction: async (
          callback: (tx: {
            auditEvent: { create: () => Promise<unknown> };
            hardwareProduct: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
            hardwareTimelineEvent: { create: () => Promise<unknown> };
          }) => Promise<unknown>,
        ) =>
          callback({
            auditEvent: { create: async () => ({}) },
            hardwareProduct: {
              create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "prod_1", ...data }),
            },
            hardwareTimelineEvent: { create: async () => ({}) },
          }),
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareProduct: { findFirst: async () => null, findMany: async () => [] },
      } as unknown as Partial<PrismaClient>),
    );

    const summary = await service.executeImport(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        duplicateMode: "reject",
        dryRun: false,
        mode: "create",
        rows: [
          { barcode: "111", name: "Pipe", purchaseCostCents: -1, sku: "P-1" },
          { barcode: "222", name: "Tap", sku: "DUP-IN-FILE" },
          { barcode: "333", name: "Tap copy", sku: "DUP-IN-FILE" },
        ],
      },
    );

    expect(summary.createdRows).toBe(0);
    expect(summary.errors).toEqual([
      { field: "purchaseCostCents", message: "Numeric value must be zero or greater.", row: 1 },
      { field: "sku", message: "Duplicate SKU exists inside this import file. First seen on row 2.", row: 3 },
    ]);
  });

  it("imports product rows transactionally with opening stock movements", async () => {
    const createdProducts: Array<Record<string, unknown>> = [];
    const movements: Array<Record<string, unknown>> = [];
    const service = new HardwareService(
      prismaMock({
        auditEvent: { findFirst: async () => null },
        $transaction: async (
          callback: (tx: {
            auditEvent: { create: (input: { data: Record<string, unknown> }) => Promise<unknown> };
            hardwareBrand: { upsert: () => Promise<{ id: string }> };
            hardwareInventoryMovement: { create: (input: { data: Record<string, unknown> }) => Promise<unknown> };
            hardwareProduct: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>; update: () => Promise<Record<string, unknown>> };
            hardwareProductCategory: { upsert: () => Promise<{ id: string }> };
            hardwareStockLocation: { upsert: () => Promise<{ id: string }> };
            hardwareTimelineEvent: { create: () => Promise<unknown> };
            hardwareUnit: { upsert: () => Promise<{ id: string }> };
          }) => Promise<unknown>,
        ) =>
          callback({
            auditEvent: { create: async () => ({}) },
            hardwareBrand: { upsert: async () => ({ id: "brand_1" }) },
            hardwareInventoryMovement: {
              create: async ({ data }) => {
                movements.push(data);
                return { id: "movement_1", ...data };
              },
            },
            hardwareProduct: {
              create: async ({ data }) => {
                createdProducts.push(data);
                return { id: "product_1", ...data };
              },
              update: async () => ({ id: "product_existing" }),
            },
            hardwareProductCategory: { upsert: async () => ({ id: "category_1" }) },
            hardwareStockLocation: { upsert: async () => ({ id: "location_1" }) },
            hardwareTimelineEvent: { create: async () => ({}) },
            hardwareUnit: { upsert: async () => ({ id: "unit_1" }) },
          }),
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareProduct: { findMany: async () => [] },
      } as unknown as Partial<PrismaClient>),
    );

    const summary = await service.executeImport(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        duplicateMode: "reject",
        dryRun: false,
        idempotencyKey: "import-key-12345",
        mode: "create",
        rows: [{
          "Brand": "Jaquar",
          "Category": "Taps",
          "GST rate": "18%",
          "HSN": "8481",
          "Minimum stock": "4",
          "Opening stock": "12",
          "Product name": "Bib Tap",
          "Purchase rate": "900",
          "SKU": "BT-001",
          "Sale rate": "1250",
          "Stock location": "Main Godown",
          "Unit": "PCS",
        }],
      },
    );

    expect(summary.errors).toEqual([]);
    expect(summary.createdRows).toBe(1);
    expect(summary.updatedRows).toBe(0);
    expect(createdProducts[0]).toMatchObject({
      brandId: "brand_1",
      categoryId: "category_1",
      gstTaxConfig: { rateBps: 1800 },
      lowStockThreshold: 4,
      name: "Bib Tap",
      purchaseCostCents: 90000,
      salesPriceCents: 125000,
      sku: "BT-001",
      tenantId: "tenant_1",
      unitId: "unit_1",
    });
    expect(movements[0]).toMatchObject({
      locationId: "location_1",
      productId: "product_1",
      quantity: 12,
      referenceId: "import-key-12345",
      referenceType: "hardware_product_import_opening_stock",
      tenantId: "tenant_1",
      type: HardwareInventoryMovementType.STOCK_IN,
    });
  });

  it("blocks duplicate barcodes and invalid GST rates when creating products", async () => {
    const duplicateBarcodeService = new HardwareService(
      prismaMock({
        hardwareProduct: {
          findFirst: async ({ where }: { where: { barcode?: string; sku?: string } }) =>
            where.barcode === "BAR-1" ? { id: "existing" } : null,
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      duplicateBarcodeService.createProduct(
        { tenantId: "tenant_1", userId: "user_1" },
        { barcode: "BAR-1", name: "Tap", sku: "SKU-1" },
      ),
    ).rejects.toThrow("barcode");

    const invalidGstService = new HardwareService(
      prismaMock({
        hardwareProduct: { findFirst: async () => null },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      invalidGstService.createProduct(
        { tenantId: "tenant_1", userId: "user_1" },
        { gstTaxConfig: { rateBps: 12_000 }, name: "Tap", sku: "SKU-2" },
      ),
    ).rejects.toThrow("GST rate");
  });

  it("quick-creates a pending product without fake inventory movement", async () => {
    const movements: unknown[] = [];
    const service = new HardwareService(
      prismaMock({
        $transaction: async (
          callback: (tx: {
            auditEvent: { create: () => Promise<unknown> };
            hardwareProduct: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
            hardwareTimelineEvent: { create: () => Promise<unknown> };
          }) => Promise<unknown>,
        ) =>
          callback({
            auditEvent: { create: async () => ({}) },
            hardwareProduct: { create: async ({ data }) => ({ brand: null, category: null, id: "prod_new", unit: null, ...data }) },
            hardwareTimelineEvent: { create: async () => ({}) },
          }),
        hardwareInventoryMovement: { findMany: async () => movements },
        hardwareProduct: { findFirst: async () => null },
        hardwareUnit: { upsert: async () => ({ id: "unit_pcs" }) },
      } as unknown as Partial<PrismaClient>),
    );

    const product = await service.quickCreateProduct(
      { tenantId: "tenant_1", userId: "user_1" },
      { name: "New Tap" },
    );

    expect(product.stockSetupStatus).toBe("PENDING");
    expect(movements).toHaveLength(0);
  });

  it("rejects quick-add exact name duplicates", async () => {
    const service = new HardwareService(
      prismaMock({
        hardwareProduct: {
          findFirst: async ({ where }: { where: { name?: { equals?: string } } }) =>
            where.name?.equals === "Existing Tap" ? { id: "prod_1" } : null,
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.quickCreateProduct(
        { tenantId: "tenant_1", userId: "user_1" },
        { name: "Existing Tap" },
      ),
    ).rejects.toThrow("already exists");
  });

  it("rejects duplicate normalized customer mobile during quick-create", async () => {
    const service = new HardwareService(
      prismaMock({
        clientOrganization: {
          findMany: async () => [
            {
              contacts: [{ phone: "919876543210" }],
              customFields: { hardwarePartyRole: "customer" },
              name: "Existing Customer",
            },
          ],
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.quickCreateParty(
        { tenantId: "tenant_1", userId: "user_1" },
        { mobile: "09876543210", name: "New Customer", role: "customer" },
      ),
    ).rejects.toThrow("already exists");
  });

  it("reports demo readiness and tenant-scoped missing setup", async () => {
    const service = new HardwareService(
      prismaMock({
        clientOrganization: { count: async () => 0 },
        hardwareBusinessSettings: { findUnique: async () => null },
        hardwareProduct: { findMany: async () => [] },
        hardwareStockLocation: { findMany: async () => [] },
        hardwareTradeDocument: { count: async () => 0 },
      } as unknown as Partial<PrismaClient>),
    );

    const readiness = await service.demoReadiness({ tenantId: "tenant_1", userId: "user_1" });

    expect(readiness.ready).toBe(false);
    expect(readiness.items.find((item) => item.key === "offline")?.ready).toBe(true);
    expect(readiness.items.find((item) => item.key === "settings")?.ready).toBe(false);
  });

  it("refuses demo data controls for an official locked tenant", async () => {
    const service = new HardwareService(
      prismaMock({
        tenant: {
          findUnique: async () => ({
            branding: { officialIdentity: { status: "LOCKED" } },
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.seedDemoData({ tenantId: "tenant_1", userId: "user_1" }),
    ).rejects.toThrow("disabled");
  });

  it("prevents tenant mismatches on linked product metadata", async () => {
    const service = new HardwareService(
      prismaMock({
        hardwareProduct: { findFirst: async () => null },
        hardwareProductCategory: { findFirst: async () => null },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.createProduct(
        { tenantId: "tenant_1", userId: "user_1" },
        { categoryId: "other_tenant_category", name: "Tap", sku: "SKU-1" },
      ),
    ).rejects.toThrow("Category was not found");
  });

  it("searches products by barcode with current stock", async () => {
    const service = new HardwareService(
      prismaMock({
        hardwareInventoryMovement: {
          findMany: async () => [{ productId: "prod_1", quantity: 12, type: HardwareInventoryMovementType.STOCK_IN }],
        },
        hardwareProduct: {
          findFirst: async () => ({
            barcode: "890000000001",
            id: "prod_1",
            lowStockThreshold: 3,
            name: "PVC Pipe",
            purchaseCostCents: 5000,
            salesPriceCents: 6500,
            sku: "PVC-1",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(service.searchByBarcode({ tenantId: "tenant_1", userId: "user_1" }, "890000000001")).resolves.toMatchObject({
      currentStock: 12,
      lowStock: false,
      sku: "PVC-1",
    });
  });

  it("projects operational dashboard metrics for the hardware demo", async () => {
    const today = new Date();
    const service = new HardwareService(
      prismaMock({
        hardwareInventoryMovement: {
          findMany: async () => [
            { productId: "prod_1", quantity: 10, type: HardwareInventoryMovementType.STOCK_IN },
            { productId: "prod_1", quantity: 3, type: HardwareInventoryMovementType.STOCK_OUT },
          ],
        },
        hardwareProduct: {
          findMany: async () => [
            {
              barcode: "111",
              id: "prod_1",
              lowStockThreshold: 2,
              name: "Basin Tap",
              purchaseCostCents: 4000,
              salesPriceCents: 6000,
              sku: "TAP-1",
            },
          ],
        },
        hardwareTradeDocument: {
          aggregate: async (input: { where: { type: unknown } }) => ({
            _sum: {
              totalCents:
                input.where.type === HardwareTradeDocumentType.SALES_ORDER
                  ? 12000
                  : 9000,
            },
          }),
          findMany: async () => [
            {
              createdAt: today,
              documentNumber: "HSO-2026-0001",
              status: "CONFIRMED",
              totalCents: 12000,
              type: HardwareTradeDocumentType.SALES_ORDER,
              updatedAt: today,
            },
            {
              createdAt: today,
              documentNumber: "HSB-2026-0001",
              status: "CONFIRMED",
              totalCents: 9000,
              type: HardwareTradeDocumentType.SUPPLIER_BILL,
              updatedAt: today,
            },
          ],
        },
        invoice: {
          findMany: async () => [
            { paidAmountCents: 4000, status: InvoiceStatus.PARTIALLY_PAID, totalAmountCents: 10000 },
          ],
        },
      } as unknown as Partial<PrismaClient>),
    );

    const dashboard = await service.operationalDashboard({ tenantId: "tenant_1", userId: "user_1" });

    expect(dashboard.todaySalesCents).toBe(12000);
    expect(dashboard.todayPurchasesCents).toBe(9000);
    expect(dashboard.pendingPaymentsCents).toBe(6000);
    expect(dashboard.stockValueCents).toBe(28000);
    expect(dashboard.topProducts[0]).toMatchObject({ sku: "TAP-1" });
  });

  it("builds customer and supplier ledger running balances", async () => {
    const service = new HardwareService(
      prismaMock({
        clientOrganization: {
          findMany: async () => [
            { contacts: [], customFields: { hardwarePartyRole: "customer", openingBalanceCents: 1000 }, id: "cust_1", invoices: [], name: "Customer", supplierHardwareDocuments: [] },
            { contacts: [], customFields: { hardwarePartyRole: "supplier", openingBalanceCents: 2000 }, id: "sup_1", invoices: [], name: "Supplier", supplierHardwareDocuments: [] },
          ],
        },
        financialTransaction: { findMany: async () => [] },
        hardwareTradeDocument: {
          findMany: async (input?: { where?: { type?: HardwareTradeDocumentType } }) =>
            input?.where?.type === HardwareTradeDocumentType.SUPPLIER_BILL
              ? [{ createdAt: new Date("2026-07-01"), documentNumber: "HSB-1", supplierId: "sup_1", totalCents: 5000 }]
              : [],
        },
        invoice: {
          findMany: async () => [{ clientId: "cust_1", createdAt: new Date("2026-07-01"), invoiceNumber: "INV-1", title: "Invoice", totalAmountCents: 8000 }],
        },
        paymentRecord: {
          findMany: async () => [{ amountCents: 3000, invoice: { clientId: "cust_1" }, mode: "CASH", receivedAt: new Date("2026-07-02"), reference: "REC-1" }],
        },
      } as unknown as Partial<PrismaClient>),
    );

    const [customerLedger] = await service.ledger({ tenantId: "tenant_1", userId: "user_1" }, "customer");
    const [supplierLedger] = await service.ledger({ tenantId: "tenant_1", userId: "user_1" }, "supplier");

    expect(customerLedger?.totalRemainingCents).toBe(6000);
    expect(supplierLedger?.totalRemainingCents).toBe(7000);
  });

  it("derives customer ledger safely for cancelled paid sales and sale returns", async () => {
    const service = new HardwareService(
      prismaMock({
        clientOrganization: {
          findMany: async () => [
            { contacts: [], customFields: { hardwarePartyRole: "customer", openingBalanceCents: 0 }, id: "cust_1", invoices: [], name: "Customer", supplierHardwareDocuments: [] },
          ],
        },
        financialTransaction: { findMany: async () => [] },
        hardwareTradeDocument: {
          findMany: async (input?: { where?: { type?: HardwareTradeDocumentType } }) =>
            input?.where?.type === HardwareTradeDocumentType.SALE_RETURN
              ? [
                  {
                    createdAt: new Date("2026-07-04"),
                    customerId: "cust_1",
                    documentNumber: "HSR-2026-0001",
                    metadata: { refundType: "customer_credit" },
                    totalCents: 1500,
                  },
                ]
              : [],
        },
        invoice: {
          findMany: async () => [
            {
              clientId: "cust_1",
              createdAt: new Date("2026-07-03"),
              invoiceNumber: "MS/INV/2026-27/00002",
              status: InvoiceStatus.PARTIALLY_PAID,
              title: "Active invoice",
              totalAmountCents: 8_000,
            },
          ],
        },
        paymentRecord: {
          findMany: async () => [
            {
              amountCents: 10_000,
              invoice: { clientId: "cust_1", invoiceNumber: "MS/INV/2026-27/00001", status: InvoiceStatus.VOID },
              mode: "CASH",
              receivedAt: new Date("2026-07-02"),
              reference: "REC-VOID",
            },
            {
              amountCents: 3_000,
              invoice: { clientId: "cust_1", invoiceNumber: "MS/INV/2026-27/00002", status: InvoiceStatus.PARTIALLY_PAID },
              mode: "UPI",
              receivedAt: new Date("2026-07-03"),
              reference: "REC-ACTIVE",
            },
          ],
        },
      } as unknown as Partial<PrismaClient>),
    );

    const [ledger] = await service.ledger({ tenantId: "tenant_1", userId: "user_1" }, "customer");

    expect(ledger?.entries.some((entry) => entry.reference === "MS/INV/2026-27/00001")).toBe(false);
    expect(ledger?.entries.find((entry) => entry.reference === "REC-VOID")?.creditCents).toBe(10_000);
    expect(ledger?.entries.find((entry) => entry.reference === "HSR-2026-0001")?.creditCents).toBe(1500);
    expect(ledger?.totalRemainingCents).toBe(-6500);
  });

  it("blocks stock out above available stock", async () => {
    const service = new HardwareService(
      prismaMock({
        clientOrganization: { findFirst: async () => null },
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareProduct: {
          findFirst: async () => ({
            id: "prod_1",
            lowStockThreshold: 2,
          }),
        },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.recordMovement(
        { tenantId: "tenant_1", userId: "user_1" },
        {
          locationId: "loc_1",
          productId: "prod_1",
          quantity: 1,
          type: HardwareInventoryMovementType.STOCK_OUT,
        },
      ),
    ).rejects.toThrow("cannot exceed");
  });

  it("blocks users without plugin permissions", async () => {
    const service = new HardwareService(
      prismaMock({
        tenantMembership: {
          findUnique: async () => ({
            role: { key: "viewer", permissions: [{ permission: { key: "crm.read" } }] },
            status: "ACTIVE",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(service.listProducts({ tenantId: "tenant_1", userId: "user_1" })).rejects.toThrow("permission");
  });
});

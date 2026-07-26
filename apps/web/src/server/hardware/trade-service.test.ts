import {
  HardwareInventoryMovementType,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  InvoiceStatus,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { movementTypeForDocument } from "./trade-repository";
import { calculateTradeTotals } from "./trade-calculations";
import { HardwareTradeService } from "./trade-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "hardware-trade-manager",
          permissions: [
            { permission: { key: "hardware.sales.read" } },
            { permission: { key: "hardware.sales.manage" } },
            { permission: { key: "hardware.purchase.read" } },
            { permission: { key: "hardware.purchase.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("HardwareTradeService", () => {
  it("calculates item discount, GST, and round-off", () => {
    expect(
      calculateTradeTotals(
        [{ discountCents: 100, productId: "p1", quantity: 2, taxRateBps: 1800, unitAmountCents: 1000 }],
        -1,
      ),
    ).toEqual({
      discountCents: 100,
      roundOffCents: -1,
      subtotalCents: 2000,
      taxCents: 342,
      totalCents: 2241,
    });
  });

  it("maps sales, purchases, and returns to stock movement directions", () => {
    expect(movementTypeForDocument(HardwareTradeDocumentType.SALES_ORDER)).toBe(HardwareInventoryMovementType.STOCK_OUT);
    expect(movementTypeForDocument(HardwareTradeDocumentType.PURCHASE_ENTRY)).toBe(HardwareInventoryMovementType.STOCK_IN);
    expect(movementTypeForDocument(HardwareTradeDocumentType.SALE_RETURN)).toBe(HardwareInventoryMovementType.STOCK_IN);
    expect(movementTypeForDocument(HardwareTradeDocumentType.PURCHASE_RETURN)).toBe(HardwareInventoryMovementType.STOCK_OUT);
  });

  it("calculates customer and supplier outstanding reports", async () => {
    const service = new HardwareTradeService(
      prismaMock({
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareProduct: { findMany: async () => [] },
        hardwareTradeDocument: {
          findMany: async () => [
            {
              createdAt: new Date(),
              paymentStatus: "unpaid",
              status: HardwareTradeDocumentStatus.CONFIRMED,
              taxCents: 9000,
              totalCents: 50_000,
              type: HardwareTradeDocumentType.SUPPLIER_BILL,
            },
          ],
        },
        invoice: {
          findMany: async () => [
            { paidAmountCents: 20_000, status: InvoiceStatus.PARTIALLY_PAID, totalAmountCents: 75_000 },
          ],
        },
      } as unknown as Partial<PrismaClient>),
    );

    const report = await service.reports({ tenantId: "tenant_1", userId: "user_1" });

    expect(report.outstandingCustomersCents).toBe(55_000);
    expect(report.outstandingSuppliersCents).toBe(50_000);
  });

  it("builds an A4 print projection with GST summary and firm settings", async () => {
    const now = new Date();
    const service = new HardwareTradeService(
      prismaMock({
        clientOrganization: {
          findFirst: async () => ({
            contacts: [{ phone: "9999999998" }],
            customFields: { gstin: "22BBBBB0000B1Z5" },
            name: "Sample Customer",
          }),
        },
        hardwareBusinessSettings: {
          findUnique: async () => ({
            address: { city: "Indore", line1: "Market Road" },
            email: "billing@example.com",
            firmName: "Sample Hardware Firm",
            gstin: "22AAAAA0000A1Z5",
            logoPlaceholder: null,
            phone: "9999999999",
            termsFooter: "Goods once sold follow configured return terms.",
          }),
        },
        tenant: {
          findUnique: async () => ({
            branding: {
              logo: { assetKey: "client-assets/demo/branding/logo.jpeg" },
              officialIdentity: {
                legalName: "Sample Proprietor",
                proprietorName: "Sample Proprietor",
                status: "LOCKED",
              },
              tagline: "Sample tagline",
            },
          }),
        },
        hardwareTradeDocument: {
          findFirst: async () => ({
            customerId: "client_1",
            createdAt: now,
            discountCents: 100,
            documentNumber: "HSQ-2026-0001",
            id: "doc_1",
            items: [
              {
                description: "PVC Pipe",
                discountCents: 100,
                lineTotalCents: 2241,
                metadata: { discountPercent: 5, hsnCode: "3917", unitCode: "MTR" },
                product: { metadata: {}, unit: { code: "MTR" } },
                productId: "prod_1",
                quantity: 2,
                taxCents: 342,
                taxRateBps: 1800,
                unitAmountCents: 1000,
              },
            ],
            paymentStatus: "unlinked",
            metadata: { taxMode: "intra-state" },
            roundOffCents: -1,
            status: HardwareTradeDocumentStatus.DRAFT,
            subtotalCents: 2000,
            supplierId: null,
            taxCents: 342,
            totalCents: 2241,
            type: HardwareTradeDocumentType.SALES_QUOTATION,
            updatedAt: now,
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    const projection = await service.printProjection({ tenantId: "tenant_1", userId: "user_1" }, "doc_1");

    expect(projection.firm.firmName).toBe("Sample Hardware Firm");
    expect(projection.firm.legalName).toBe("Sample Proprietor");
    expect(projection.firm.logoUrl).toBe("/api/tenants/branding/logo");
    expect(projection.customer?.name).toBe("Sample Customer");
    expect(projection.customer?.gstin).toBe("22BBBBB0000B1Z5");
    expect(projection.gstSummary).toEqual([{ taxableCents: 1900, taxCents: 342, taxRateBps: 1800 }]);
    expect(projection.items[0]).toMatchObject({
      cgstCents: 171,
      discountPercent: 5,
      hsnCode: "3917",
      sgstCents: 171,
      unitCode: "MTR",
    });
    expect(projection.document.totalsInWords).toContain("only");
  });

  it("deducts stock when a sales order is confirmed", async () => {
    const movements: Array<{ data: { type: HardwareInventoryMovementType } }> = [];
    const now = new Date();
    const document = {
      customerId: "client_1",
      discountCents: 0,
      documentNumber: "HSO-2026-0001",
      id: "doc_1",
      items: [
        {
          description: "Basin Tap",
          discountCents: 0,
          lineTotalCents: 12000,
          productId: "prod_1",
          quantity: 2,
          taxCents: 0,
          taxRateBps: 0,
          unitAmountCents: 6000,
        },
      ],
      paymentStatus: "unlinked",
      roundOffCents: 0,
      status: HardwareTradeDocumentStatus.DRAFT,
      subtotalCents: 12000,
      supplierId: null,
      taxCents: 0,
      totalCents: 12000,
      type: HardwareTradeDocumentType.SALES_ORDER,
      updatedAt: now,
    };
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (
          callback: (tx: {
            auditEvent: { create: () => Promise<unknown> };
            hardwareInventoryMovement: {
              create: (input: { data: { type: HardwareInventoryMovementType } }) => Promise<{ type: HardwareInventoryMovementType }>;
            };
            hardwareTradeDocument: { update: () => Promise<Record<string, unknown>> };
            hardwareTradeTimelineEvent: { create: () => Promise<unknown> };
          }) => Promise<unknown>,
        ) =>
          callback({
            auditEvent: { create: async () => ({}) },
            hardwareInventoryMovement: {
              create: async (input: { data: { type: HardwareInventoryMovementType } }) => {
                movements.push(input);
                return input.data;
              },
            },
            hardwareTradeDocument: {
              update: async () => ({ ...document, status: HardwareTradeDocumentStatus.CONFIRMED }),
            },
            hardwareTradeTimelineEvent: { create: async () => ({}) },
          }),
        hardwareInventoryMovement: {
          findMany: async () => [{ quantity: 5, type: HardwareInventoryMovementType.STOCK_IN }],
        },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: { findFirst: async () => document },
      } as unknown as Partial<PrismaClient>),
    );

    await service.confirm(
      { tenantId: "tenant_1", userId: "user_1" },
      "doc_1",
      { locationId: "loc_1" },
    );

    expect(movements[0]?.data.type).toBe(HardwareInventoryMovementType.STOCK_OUT);
  });

  it("does not create stock movement for stock-setup-pending products", async () => {
    const movements: Array<{ data: { type: HardwareInventoryMovementType } }> = [];
    const now = new Date();
    const document = {
      customerId: "client_1",
      discountCents: 0,
      documentNumber: "HSO-2026-0003",
      id: "doc_3",
      items: [
        {
          description: "Pending Item",
          discountCents: 0,
          lineTotalCents: 12000,
          product: { metadata: { stockSetupStatus: "PENDING" }, unit: null },
          productId: "prod_pending",
          quantity: 2,
          taxCents: 0,
          taxRateBps: 0,
          unitAmountCents: 6000,
        },
      ],
      paymentStatus: "unlinked",
      roundOffCents: 0,
      status: HardwareTradeDocumentStatus.DRAFT,
      subtotalCents: 12000,
      supplierId: null,
      taxCents: 0,
      totalCents: 12000,
      type: HardwareTradeDocumentType.SALES_ORDER,
      updatedAt: now,
    };
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (
          callback: (tx: {
            auditEvent: { create: () => Promise<unknown> };
            hardwareInventoryMovement: { create: (input: { data: { type: HardwareInventoryMovementType } }) => Promise<{ type: HardwareInventoryMovementType }> };
            hardwareTradeDocument: { update: () => Promise<Record<string, unknown>> };
            hardwareTradeTimelineEvent: { create: () => Promise<unknown> };
          }) => Promise<unknown>,
        ) =>
          callback({
            auditEvent: { create: async () => ({}) },
            hardwareInventoryMovement: { create: async (input) => { movements.push(input); return input.data; } },
            hardwareTradeDocument: { update: async () => ({ ...document, status: HardwareTradeDocumentStatus.CONFIRMED }) },
            hardwareTradeTimelineEvent: { create: async () => ({}) },
          }),
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: { findFirst: async () => document },
      } as unknown as Partial<PrismaClient>),
    );

    await service.confirm({ tenantId: "tenant_1", userId: "user_1" }, "doc_3", { locationId: "loc_1" });

    expect(movements).toHaveLength(0);
  });

  it("blocks duplicate draft invoice numbers for hardware documents", async () => {
    const now = new Date();
    const service = new HardwareTradeService(
      prismaMock({
        hardwareTradeDocument: {
          findFirst: async () => ({
            currency: "INR",
            customerId: "client_1",
            discountCents: 0,
            documentNumber: "HSO-2026-0001",
            id: "doc_1",
            items: [],
            paymentStatus: "unlinked",
            roundOffCents: 0,
            status: HardwareTradeDocumentStatus.DRAFT,
            subtotalCents: 0,
            supplierId: null,
            taxCents: 0,
            totalCents: 10_000,
            type: HardwareTradeDocumentType.SALES_ORDER,
            updatedAt: now,
          }),
        },
        invoice: { findFirst: async () => ({ id: "inv_1" }) },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.draftSaleInvoice({ tenantId: "tenant_1", userId: "user_1" }, "doc_1"),
    ).rejects.toThrow("already exists");
  });

  it("requires a confirmed sale before creating an invoice draft", async () => {
    const now = new Date();
    const service = new HardwareTradeService(
      prismaMock({
        hardwareTradeDocument: {
          findFirst: async () => ({
            currency: "INR",
            customerId: "client_1",
            discountCents: 0,
            documentNumber: "HSO-2026-0002",
            id: "doc_2",
            items: [],
            paymentStatus: "unlinked",
            roundOffCents: 0,
            status: HardwareTradeDocumentStatus.DRAFT,
            subtotalCents: 0,
            supplierId: null,
            taxCents: 0,
            totalCents: 10_000,
            type: HardwareTradeDocumentType.SALES_ORDER,
            updatedAt: now,
          }),
        },
        invoice: { findFirst: async () => null },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.draftSaleInvoice({ tenantId: "tenant_1", userId: "user_1" }, "doc_2"),
    ).rejects.toThrow("Confirm the sale");
  });

  it("posts a quick POS sale atomically with invoice, stock movement, and payment", async () => {
    const created: string[] = [];
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
          callback({
            auditEvent: { createMany: async () => created.push("audit") },
            billingTimelineEvent: { createMany: async () => created.push("billingTimeline") },
            documentSequence: { upsert: async () => ({ lastValue: 1 }) },
            hardwareInventoryMovement: { create: async () => created.push("movement") },
            hardwareTradeDocument: {
              create: async ({ data }: { data: { documentNumber: string; paymentStatus: string; totalCents: number } }) => {
                created.push("document");
                return { id: "doc_1", ...data };
              },
            },
            hardwareTradeTimelineEvent: { create: async () => created.push("tradeTimeline") },
            invoice: {
              create: async ({ data }: { data: { invoiceNumber: string; totalAmountCents: number } }) => {
                created.push("invoice");
                return { id: "inv_1", ...data };
              },
            },
            paymentRecord: { create: async () => { created.push("payment"); return { amountCents: 1180, id: "pay_1" }; } },
            tenant: { findUnique: async () => ({ slug: "manglam-trading-demo" }) },
          }),
        hardwareInventoryMovement: {
          findMany: async () => [{ quantity: 5, type: HardwareInventoryMovementType.STOCK_IN }],
        },
        hardwareProduct: {
          findMany: async () => [{ gstTaxConfig: { rateBps: 1800 }, id: "prod_1", metadata: {}, name: "Tap" }],
        },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: {
          count: async () => 0,
          findFirst: async () => null,
        },
      } as unknown as Partial<PrismaClient>),
    );

    const result = await service.postQuickPosSale(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        clientTotalCents: 1180,
        idempotencyKey: "idem-quick-pos-1",
        items: [{ productId: "prod_1", quantity: 1, unitAmountCents: 1000 }],
        locationId: "loc_1",
        paidAmountCents: 1180,
        paymentMode: "CASH",
        taxMode: "intra-state",
      },
    );

    expect(result).toMatchObject({ invoiceNumber: "MS/INV/2026-27/00001", paymentStatus: "paid" });
    expect(created).toEqual(expect.arrayContaining(["invoice", "document", "movement", "payment"]));
  });

  it("rejects manipulated quick POS client totals before posting", async () => {
    const service = new HardwareTradeService(
      prismaMock({
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareProduct: {
          findMany: async () => [{ gstTaxConfig: { rateBps: 1800 }, id: "prod_1", metadata: {}, name: "Tap" }],
        },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: { findFirst: async () => null },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.postQuickPosSale(
        { tenantId: "tenant_1", userId: "user_1" },
        {
          clientTotalCents: 1,
          idempotencyKey: "idem-quick-pos-2",
          items: [{ productId: "prod_1", quantity: 1, unitAmountCents: 1000 }],
          locationId: "loc_1",
          paidAmountCents: 0,
          taxMode: "intra-state",
        },
      ),
    ).rejects.toThrow("server");
  });

  it("does not allow an unclassified intake record to become a trade party", async () => {
    const service = new HardwareTradeService(
      prismaMock({
        clientOrganization: {
          findFirst: async () => ({ customFields: { source: "public-intake" } }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.create(
        { tenantId: "tenant_1", userId: "user_1" },
        {
          customerId: "intake_record",
          items: [{ productId: "prod_1", quantity: 1, unitAmountCents: 1000 }],
          type: HardwareTradeDocumentType.SALES_ORDER,
        },
      ),
    ).rejects.toThrow("not classified as a customer");
  });

  it("rejects invalid GST rates from product tax configuration", async () => {
    const service = new HardwareTradeService(
      prismaMock({
        hardwareProduct: {
          findMany: async () => [{ gstTaxConfig: { rateBps: 12_001 }, id: "prod_1", name: "Tap" }],
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.create(
        { tenantId: "tenant_1", userId: "user_1" },
        {
          items: [{ productId: "prod_1", quantity: 1, unitAmountCents: 1000 }],
          type: HardwareTradeDocumentType.SALES_ORDER,
        },
      ),
    ).rejects.toThrow("GST rate");
  });

  it("blocks users without hardware trade permissions", async () => {
    const service = new HardwareTradeService(
      prismaMock({
        tenantMembership: {
          findUnique: async () => ({
            role: { key: "viewer", permissions: [{ permission: { key: "hardware.catalog.read" } }] },
            status: "ACTIVE",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(service.listSales({ tenantId: "tenant_1", userId: "user_1" })).rejects.toThrow("permission");
  });
});

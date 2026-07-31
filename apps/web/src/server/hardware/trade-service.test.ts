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
    hardwareProduct: {
      findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),
      update: async ({ data }: { data: unknown }) => data,
    },
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
    expect(movementTypeForDocument(HardwareTradeDocumentType.SALES_QUOTATION)).toBe(HardwareInventoryMovementType.STOCK_OUT);
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
            {
              createdAt: new Date(),
              paymentStatus: "unlinked",
              status: HardwareTradeDocumentStatus.CONFIRMED,
              taxCents: 1800,
              totalCents: 11_800,
              type: HardwareTradeDocumentType.SALES_QUOTATION,
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

    expect(report.dailySalesCents).toBe(11_800);
    expect(report.outstandingCustomersCents).toBe(66_800);
    expect(report.outstandingSuppliersCents).toBe(50_000);
    expect(report.salesGstCents).toBe(1_800);
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
            hardwareProduct: {
              findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),
              update: async ({ data }: { data: unknown }) => data,
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
            hardwareProduct: {
              findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),
              update: async ({ data }: { data: unknown }) => data,
            },
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

  it("posts supplier payable and only the entered partial payment when purchase is confirmed", async () => {
    const financial: Array<{ amountCents?: number; kind: string; paymentStatus?: string | undefined }> = [];
    const now = new Date();
    const document = {
      customerId: null,
      discountCents: 0,
      documentNumber: "HPE-2026-0001",
      id: "doc_purchase_1",
      items: [
        {
          description: "PVC Pipe",
          discountCents: 0,
          lineTotalCents: 5000,
          metadata: {},
          product: { metadata: {}, unit: null },
          productId: "prod_1",
          quantity: 5,
          taxCents: 0,
          taxRateBps: 0,
          unitAmountCents: 1000,
        },
      ],
      metadata: { paidAmountCents: 3000, paymentMode: "Cash", referenceNumber: "SUP-001" },
      paymentStatus: "unlinked",
      roundOffCents: 0,
      status: HardwareTradeDocumentStatus.DRAFT,
      subtotalCents: 5000,
      supplierId: "supplier_1",
      taxCents: 0,
      totalCents: 5000,
      type: HardwareTradeDocumentType.PURCHASE_ENTRY,
      updatedAt: now,
    };
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
          callback({
            auditEvent: { create: async () => ({}) },
            documentSequence: { upsert: async () => ({ lastValue: financial.length + 1 }) },
            financialAllocation: { create: async ({ data }: { data: { amountCents: number } }) => { financial.push({ amountCents: data.amountCents, kind: "allocation" }); return {}; } },
            financialTransaction: {
              create: async ({ data }: { data: { amountCents: number } }) => {
                const id = `fin_${financial.length + 1}`;
                financial.push({ amountCents: data.amountCents, kind: "transaction" });
                return { id };
              },
              findUnique: async () => null,
            },
            hardwareInventoryMovement: { create: async () => ({}) },
            hardwareTradeDocument: {
              update: async ({ data }: { data: { paymentStatus?: string } }) => {
                financial.push({ kind: "document-update", paymentStatus: data.paymentStatus });
                return { ...document, paymentStatus: data.paymentStatus ?? document.paymentStatus, status: HardwareTradeDocumentStatus.CONFIRMED };
              },
            },
            hardwareTradeTimelineEvent: { create: async () => ({}) },
          }),
        hardwareInventoryMovement: { findMany: async () => [] },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: { findFirst: async () => document },
      } as unknown as Partial<PrismaClient>),
    );

    await service.confirm({ tenantId: "tenant_1", userId: "user_1" }, "doc_purchase_1", { locationId: "loc_1" });

    expect(financial).toEqual([
      { kind: "document-update", paymentStatus: "partial" },
      { amountCents: 5000, kind: "transaction" },
      { amountCents: 3000, kind: "transaction" },
      { amountCents: 3000, kind: "allocation" },
    ]);
  });

  it("records a partial purchase return with supplier credit and stock-out movement", async () => {
    const events: string[] = [];
    const now = new Date();
    const purchase = {
      billingInvoice: null,
      billingInvoiceId: null,
      currency: "INR",
      customer: null,
      customerId: null,
      discountCents: 0,
      documentNumber: "HPE-2026-0002",
      id: "doc_purchase_2",
      items: [
        {
          description: "CP Tap",
          discountCents: 0,
          id: "item_purchase_1",
          lineTotalCents: 10_000,
          metadata: {},
          product: { metadata: {}, unit: null },
          productId: "prod_1",
          quantity: 10,
          taxCents: 0,
          taxRateBps: 0,
          unitAmountCents: 1000,
        },
      ],
      metadata: {},
      paymentStatus: "partial",
      roundOffCents: 0,
      status: HardwareTradeDocumentStatus.CONFIRMED,
      subtotalCents: 10_000,
      supplier: { name: "Supplier" },
      supplierId: "supplier_1",
      taxCents: 0,
      timeline: [],
      totalCents: 10_000,
      type: HardwareTradeDocumentType.PURCHASE_ENTRY,
      updatedAt: now,
    };
    let createdReturn = null as null | Record<string, unknown>;
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
          callback({
            auditEvent: { create: async () => { events.push("audit"); return {}; } },
            documentSequence: { upsert: async () => ({ lastValue: 1 }) },
            financialTransaction: {
              create: async () => { events.push("financial"); return { id: "fin_return" }; },
              findUnique: async () => null,
            },
            hardwareInventoryMovement: { create: async ({ data }: { data: { type: string; quantity: number } }) => { events.push(`${data.type}:${data.quantity}`); return {}; } },
            hardwareTradeDocument: {
              create: async ({ data }: { data: { documentNumber: string; items: { create: unknown[] }; totalCents: number; type: HardwareTradeDocumentType } }) => {
                events.push("return-document");
                createdReturn = {
                  ...purchase,
                  documentNumber: data.documentNumber,
                  id: "doc_return_1",
                  items: [],
                  totalCents: data.totalCents,
                  type: data.type,
                };
                return createdReturn;
              },
              update: async () => { events.push("original-updated"); return purchase; },
            },
            hardwareTradeTimelineEvent: { create: async () => { events.push("timeline"); return {}; } },
          }),
        hardwareInventoryMovement: {
          findMany: async () => [{ quantity: 10, type: HardwareInventoryMovementType.STOCK_IN }],
        },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: {
          count: async () => 0,
          findFirst: async ({ where }: { where: { documentNumber?: string; id?: string; type?: HardwareTradeDocumentType } }) => {
            if (where.documentNumber) return null;
            if (where.id === "doc_return_1") return createdReturn;
            if (where.type === HardwareTradeDocumentType.PURCHASE_RETURN) return null;
            return purchase;
          },
          findMany: async () => [],
        },
      } as unknown as Partial<PrismaClient>),
    );

    const result = await service.createPurchaseReturn(
      { tenantId: "tenant_1", userId: "user_1" },
      "doc_purchase_2",
      {
        idempotencyKey: "purchase-return-123",
        items: [{ originalItemId: "item_purchase_1", quantity: 3 }],
        locationId: "loc_1",
        reason: "Damaged goods",
        settlementType: "supplier_credit",
      },
    );

    expect(result.type).toBe(HardwareTradeDocumentType.PURCHASE_RETURN);
    expect(result.totalCents).toBe(3000);
    expect(events).toEqual([
      "return-document",
      "financial",
      "STOCK_OUT:3",
      "original-updated",
      "timeline",
      "audit",
    ]);
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
    const tradeDocuments: Array<Record<string, unknown>> = [];
    const invoices: Array<Record<string, unknown>> = [];
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
          callback({
            auditEvent: { createMany: async () => created.push("audit") },
            billingTimelineEvent: { createMany: async () => created.push("billingTimeline") },
            documentSequence: { upsert: async () => ({ lastValue: 1 }) },
            financialAllocation: { create: async () => created.push("financialAllocation") },
            financialTransaction: {
              create: async () => {
                const id = `fin_${created.filter((entry) => entry === "financialTransaction").length + 1}`;
                created.push("financialTransaction");
                return { id };
              },
              findUnique: async () => null,
            },
            hardwareInventoryMovement: { create: async () => created.push("movement") },
            hardwareProduct: {
              findFirst: async () => ({ gstTaxConfig: { rateBps: 1800 }, metadata: { hsnCode: "8481" } }),
              update: async ({ data }: { data: unknown }) => { created.push("productPreference"); return data; },
            },
            hardwareTradeDocument: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                created.push("document");
                tradeDocuments.push(data);
                return { id: "doc_1", ...data };
              },
            },
            hardwareTradeTimelineEvent: { create: async () => created.push("tradeTimeline") },
            invoice: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                created.push("invoice");
                invoices.push(data);
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
          findMany: async () => [{ gstTaxConfig: { rateBps: 1800 }, id: "prod_1", metadata: { hsnCode: "8481" }, name: "Tap" }],
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
    expect(created).toEqual(expect.arrayContaining(["invoice", "document", "movement", "payment", "financialTransaction", "financialAllocation"]));
    expect(invoices[0]?.lineItems).toEqual([
      expect.objectContaining({ hsnCode: "8481", taxRateBps: 1800, taxCents: 180 }),
    ]);
    expect((tradeDocuments[0]?.items as { create: Array<{ metadata: Record<string, unknown>; taxRateBps: number }> }).create[0]).toMatchObject({
      metadata: { hsnCode: "8481" },
      taxRateBps: 1800,
    });
  });

  it("cancels a confirmed sale by reversing stock and voiding the linked invoice", async () => {
    const movements: Array<{ data: { referenceType: string | null | undefined; type: HardwareInventoryMovementType } }> = [];
    const invoiceUpdates: Array<{ data: { status?: InvoiceStatus } }> = [];
    const paymentUpdates: Array<{ data: { metadata?: unknown } }> = [];
    const now = new Date();
    const document = {
      billingInvoice: { id: "inv_1", metadata: {} },
      billingInvoiceId: "inv_1",
      createdAt: now,
      currency: "INR",
      customer: { name: "Counter Customer" },
      customerId: "client_1",
      discountCents: 0,
      documentNumber: "HSO-2026-0009",
      id: "doc_9",
      items: [
        {
          description: "Basin Tap",
          discountCents: 0,
          id: "item_1",
          lineTotalCents: 12000,
          metadata: {},
          product: { metadata: {}, unit: null },
          productId: "prod_1",
          quantity: 2,
          taxCents: 0,
          taxRateBps: 0,
          unitAmountCents: 6000,
        },
      ],
      metadata: {},
      paymentStatus: "paid",
      roundOffCents: 0,
      status: HardwareTradeDocumentStatus.CONFIRMED as HardwareTradeDocumentStatus,
      subtotalCents: 12000,
      supplier: null,
      supplierId: null,
      taxCents: 0,
      totalCents: 12000,
      type: HardwareTradeDocumentType.SALES_ORDER,
      updatedAt: now,
    };
    const service = new HardwareTradeService(
      prismaMock({
        $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
          callback({
            auditEvent: { create: async () => ({}) },
            billingTimelineEvent: { create: async () => ({}) },
            hardwareInventoryMovement: {
              create: async (input: { data: { referenceType: string | null | undefined; type: HardwareInventoryMovementType } }) => {
                movements.push(input);
                return input.data;
              },
            },
            hardwareTradeDocument: {
              update: async ({ data }: { data: { status?: HardwareTradeDocumentStatus } }) => {
                if (data.status) document.status = data.status;
                return document;
              },
            },
            hardwareTradeTimelineEvent: { create: async () => ({}) },
            invoice: {
              update: async (input: { data: { status?: InvoiceStatus } }) => {
                invoiceUpdates.push(input);
                return {};
              },
            },
            paymentRecord: {
              findMany: async () => [{ id: "pay_1", metadata: { source: "quick-pos" } }],
              update: async (input: { data: { metadata?: unknown } }) => {
                paymentUpdates.push(input);
                return {};
              },
            },
          }),
        hardwareInventoryMovement: { findFirst: async () => null },
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: {
          findFirst: async (args?: { where?: { type?: HardwareTradeDocumentType } }) =>
            args?.where?.type === HardwareTradeDocumentType.SALE_RETURN ? null : document,
        },
      } as unknown as Partial<PrismaClient>),
    );

    const result = await service.cancelSale(
      { tenantId: "tenant_1", userId: "user_1" },
      "doc_9",
      {
        confirm: true,
        idempotencyKey: "cancel-confirmed-sale-1",
        locationId: "loc_1",
        reason: "Customer cancelled counter sale",
      },
    );

    expect(result.status).toBe(HardwareTradeDocumentStatus.CANCELLED);
    expect(movements[0]?.data).toMatchObject({
      referenceType: "SALE_CANCELLATION",
      type: HardwareInventoryMovementType.STOCK_IN,
    });
    expect(invoiceUpdates[0]?.data.status).toBe(InvoiceStatus.VOID);
    expect(paymentUpdates[0]?.data.metadata).toMatchObject({
      cancellation: { refundStatus: "pending_explicit_refund_or_customer_credit" },
    });
  });

  it("rejects a sale return quantity greater than the remaining sold quantity", async () => {
    const now = new Date();
    const document = {
      billingInvoice: null,
      billingInvoiceId: null,
      createdAt: now,
      currency: "INR",
      customer: { name: "Counter Customer" },
      customerId: "client_1",
      discountCents: 0,
      documentNumber: "HSO-2026-0010",
      id: "doc_10",
      items: [
        {
          description: "Wall Mixer",
          discountCents: 0,
          id: "item_1",
          lineTotalCents: 8000,
          metadata: {},
          product: { metadata: {}, unit: null },
          productId: "prod_1",
          quantity: 1,
          taxCents: 0,
          taxRateBps: 0,
          unitAmountCents: 8000,
        },
      ],
      metadata: {},
      paymentStatus: "paid",
      roundOffCents: 0,
      status: HardwareTradeDocumentStatus.CONFIRMED,
      subtotalCents: 8000,
      supplier: null,
      supplierId: null,
      taxCents: 0,
      totalCents: 8000,
      type: HardwareTradeDocumentType.SALES_ORDER,
      updatedAt: now,
    };
    const service = new HardwareTradeService(
      prismaMock({
        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },
        hardwareTradeDocument: {
          findFirst: async (args?: { where?: { type?: HardwareTradeDocumentType } }) =>
            args?.where?.type === HardwareTradeDocumentType.SALE_RETURN ? null : document,
          findMany: async () => [],
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.createSaleReturn(
        { tenantId: "tenant_1", userId: "user_1" },
        "doc_10",
        {
          idempotencyKey: "sale-return-over-1",
          items: [{ originalItemId: "item_1", quantity: 2 }],
          locationId: "loc_1",
          reason: "Customer returned damaged goods",
          refundType: "customer_credit",
        },
      ),
    ).rejects.toThrow("exceeds sold quantity");
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

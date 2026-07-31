import {
  FinancialTransactionType,
  HardwareInventoryMovementType,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareTradeService } from "./trade-service";

const context = { tenantId: "tenant_1", userId: "user_1" };

function membership() {
  return {
    role: {
      key: "hardware-trade-manager",
      permissions: [
        { permission: { key: "hardware.sales.read" } },
        { permission: { key: "hardware.sales.manage" } },
      ],
    },
    status: "ACTIVE",
  };
}

function estimateDocument(status: HardwareTradeDocumentStatus) {
  const now = new Date("2026-07-30T00:00:00.000Z");
  return {
    billingInvoice: null,
    billingInvoiceId: null,
    confirmedAt: status === HardwareTradeDocumentStatus.CONFIRMED ? now : null,
    createdAt: now,
    currency: "INR",
    customer: { name: "Estimate Customer" },
    customerId: "customer_1",
    discountCents: 0,
    documentNumber: "HSQ-2026-0001",
    id: "estimate_1",
    items: [
      {
        description: "Basin Tap",
        discountCents: 0,
        id: "item_1",
        lineTotalCents: 10_000,
        metadata: { discountPercent: 0, unitCode: "PCS" },
        product: { metadata: { stockSetupStatus: "PENDING" }, unit: { code: "PCS" } },
        productId: "product_1",
        quantity: 2,
        taxCents: 0,
        taxRateBps: 0,
        unitAmountCents: 5_000,
      },
    ],
    metadata: {
      estimateBill: true,
      estimateSaleVersion: "initial",
      paidAmountCents: 4_000,
      paymentMode: "Cash",
      referenceNumber: "EST-REF-1",
      stockLocationId: "location_original",
      stockMovementVersion: "initial",
    },
    paymentStatus: status === HardwareTradeDocumentStatus.CONFIRMED ? "partial" : "unlinked",
    roundOffCents: 0,
    status,
    subtotalCents: 10_000,
    supplier: null,
    supplierId: null,
    taxCents: 0,
    timeline: [],
    totalCents: 10_000,
    type: HardwareTradeDocumentType.SALES_QUOTATION,
    updatedAt: now,
  };
}

describe("Estimate Bill final-sale lifecycle", () => {
  it("confirms an Estimate as stock-out even when stale metadata still says stock setup pending", async () => {
    let document = estimateDocument(HardwareTradeDocumentStatus.DRAFT);
    const movements: Array<Record<string, unknown>> = [];
    const financialTransactions: Array<Record<string, unknown>> = [];
    const allocations: Array<Record<string, unknown>> = [];

    const service = new HardwareTradeService({
      $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
        callback({
          auditEvent: { create: async () => ({}) },
          documentSequence: { upsert: async () => ({ lastValue: financialTransactions.length + 1 }) },
          financialAllocation: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              allocations.push(data);
              return data;
            },
          },
          financialTransaction: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              financialTransactions.push(data);
              return { id: `financial_${financialTransactions.length}`, ...data };
            },
            findUnique: async () => null,
          },
          hardwareInventoryMovement: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              movements.push(data);
              return data;
            },
          },
          hardwareTradeDocument: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
              document = {
                ...document,
                ...data,
                metadata: (data.metadata as typeof document.metadata | undefined) ?? document.metadata,
                status: (data.status as HardwareTradeDocumentStatus | undefined) ?? document.status,
              };
              return document;
            },
          },
          hardwareTradeTimelineEvent: { create: async () => ({}) },
        }),
      hardwareInventoryMovement: {
        findMany: async () => [{ quantity: 10, type: HardwareInventoryMovementType.STOCK_IN }],
      },
      hardwareStockLocation: { findFirst: async () => ({ id: "location_original" }) },
      hardwareTradeDocument: { findFirst: async () => document },
      tenantMembership: { findUnique: async () => membership() },
    } as unknown as PrismaClient);

    const result = await service.confirm(context, document.id, { locationId: "location_original" });

    expect(result.status).toBe(HardwareTradeDocumentStatus.CONFIRMED);
    expect(result.paymentStatus).toBe("partial");
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      locationId: "location_original",
      metadata: { stockMovementVersion: "initial" },
      type: HardwareInventoryMovementType.STOCK_OUT,
    });
    expect(financialTransactions.map((entry) => entry.type)).toEqual([
      FinancialTransactionType.SALE_RECEIVABLE,
      FinancialTransactionType.CUSTOMER_PAYMENT,
    ]);
    expect(allocations).toHaveLength(1);
    expect(allocations[0]).toMatchObject({ amountCents: 4_000 });
  });

  it("cancels an Estimate without a manually supplied location and reverses the recorded stock movement", async () => {
    let document = estimateDocument(HardwareTradeDocumentStatus.CONFIRMED);
    const reversals: Array<Record<string, unknown>> = [];
    const originalMovement = {
      id: "movement_1",
      locationId: "location_original",
      productId: "product_1",
      quantity: 2,
      unitPriceCents: 5_000,
    };

    const service = new HardwareTradeService({
      $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
        callback({
          auditEvent: { create: async () => ({}) },
          hardwareInventoryMovement: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              reversals.push(data);
              return data;
            },
          },
          hardwareTradeDocument: {
            update: async ({ data }: { data: Record<string, unknown> }) => {
              document = {
                ...document,
                ...data,
                status: (data.status as HardwareTradeDocumentStatus | undefined) ?? document.status,
              };
              return document;
            },
          },
          hardwareTradeTimelineEvent: { create: async () => ({}) },
        }),
      financialTransaction: { findFirst: async () => null },
      hardwareInventoryMovement: {
        findFirst: async () => null,
        findMany: async () => [originalMovement],
      },
      hardwareTradeDocument: {
        findFirst: async (args?: { where?: { type?: HardwareTradeDocumentType } }) =>
          args?.where?.type === HardwareTradeDocumentType.SALE_RETURN ? null : document,
      },
      tenantMembership: { findUnique: async () => membership() },
    } as unknown as PrismaClient);

    const result = await service.cancelSale(context, document.id, {
      confirm: true,
      idempotencyKey: "estimate-cancel-123",
      reason: "Customer cancelled Estimate Bill",
    });

    expect(result.status).toBe(HardwareTradeDocumentStatus.CANCELLED);
    expect(reversals).toHaveLength(1);
    expect(reversals[0]).toMatchObject({
      locationId: "location_original",
      metadata: { reversedMovementId: "movement_1" },
      referenceType: "SALE_CANCELLATION",
      type: HardwareInventoryMovementType.STOCK_IN,
    });
  });

  it("still requires a stock location when cancelling a normal sales order", async () => {
    const document = {
      ...estimateDocument(HardwareTradeDocumentStatus.CONFIRMED),
      documentNumber: "HSO-2026-0001",
      type: HardwareTradeDocumentType.SALES_ORDER,
    };
    const service = new HardwareTradeService({
      hardwareTradeDocument: { findFirst: async () => document },
      tenantMembership: { findUnique: async () => membership() },
    } as unknown as PrismaClient);

    await expect(
      service.cancelSale(context, document.id, {
        confirm: true,
        idempotencyKey: "normal-cancel-123",
        reason: "Customer cancelled sale",
      }),
    ).rejects.toThrow("stock location");
  });
});

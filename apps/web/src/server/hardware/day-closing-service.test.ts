import {
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMode,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareDayClosingService } from "./day-closing-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "hardware-day-closing-manager",
          permissions: [
            { permission: { key: "hardware.sales.read" } },
            { permission: { key: "hardware.sales.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("HardwareDayClosingService", () => {
  it("calculates expected cash from cash-only receipts and cash outflows", async () => {
    const service = new HardwareDayClosingService(
      prismaMock({
        financialTransaction: {
          findMany: async () => [
            posted(FinancialTransactionType.CUSTOMER_PAYMENT, 10_000, PaymentMode.CASH),
            posted(FinancialTransactionType.CUSTOMER_PAYMENT, 20_000, PaymentMode.UPI),
            posted(FinancialTransactionType.SUPPLIER_PAYMENT, 2_500, PaymentMode.CASH),
            posted(FinancialTransactionType.SUPPLIER_PAYMENT, 5_000, PaymentMode.BANK_TRANSFER),
            posted(FinancialTransactionType.CUSTOMER_REFUND_PAID, 1_000, PaymentMode.CASH),
            posted(FinancialTransactionType.CUSTOMER_REFUND_PAID, 1_500, PaymentMode.UPI),
          ],
        },
        hardwareDayClosing: {
          findUnique: async () => null,
        },
      } as unknown as Partial<PrismaClient>),
    );

    const summary = await service.summary({ tenantId: "tenant_1", userId: "user_1" }, "2026-07-27");

    expect(summary.totals.cashSalesCents).toBe(10_000);
    expect(summary.totals.upiSalesCents).toBe(20_000);
    expect(summary.totals.cashSupplierPaymentsCents).toBe(2_500);
    expect(summary.totals.supplierPaymentsCents).toBe(7_500);
    expect(summary.totals.customerRefundsCashCents).toBe(1_000);
    expect(summary.totals.customerRefundsCents).toBe(2_500);
    expect(summary.expectedCashCents).toBe(6_500);
  });

  it("rejects closing a business date that is already closed", async () => {
    const service = new HardwareDayClosingService(
      prismaMock({
        hardwareDayClosing: {
          findUnique: async () => ({ id: "closing_1", status: "CLOSED" }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.close(
        { tenantId: "tenant_1", userId: "user_1" },
        { businessDate: "2026-07-27", countedCashCents: 0, openingCashCents: 0 },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

function posted(type: FinancialTransactionType, amountCents: number, paymentMode: PaymentMode) {
  return {
    amountCents,
    occurredAt: new Date("2026-07-27T06:00:00.000Z"),
    paymentMode,
    status: FinancialTransactionStatus.POSTED,
    tenantId: "tenant_1",
    type,
  };
}

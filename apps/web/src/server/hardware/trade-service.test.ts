import {
  HardwareInventoryMovementType,
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

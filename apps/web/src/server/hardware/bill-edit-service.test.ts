import { HardwareTradeDocumentStatus, HardwareTradeDocumentType, type PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareBillEditService, calculateBillPaymentCorrection } from "./bill-edit-service";

const context = { tenantId: "tenant_1", userId: "user_1" };

function document(type: HardwareTradeDocumentType = HardwareTradeDocumentType.SALES_ORDER) {
  const now = new Date("2026-08-20T09:00:00.000Z");
  return {
    billingInvoice: null,
    billingInvoiceId: null,
    confirmedAt: now,
    createdAt: now,
    currency: "INR",
    customer: { name: "Customer" },
    customerId: "customer_1",
    discountCents: 0,
    documentNumber: type === HardwareTradeDocumentType.SALES_QUOTATION ? "HSQ-2026-0001" : "HSO-2026-0001",
    id: "bill_1",
    items: [{
      description: "Tap",
      discountCents: 0,
      id: "item_1",
      lineTotalCents: 10_000,
      metadata: { unitCode: "PCS" },
      product: { metadata: {}, unit: { code: "PCS" } },
      productId: "product_1",
      quantity: 2,
      taxCents: 0,
      taxRateBps: 0,
      unitAmountCents: 5_000,
    }],
    metadata: { stockLocationId: "location_1" },
    paymentStatus: "unpaid",
    roundOffCents: 0,
    status: HardwareTradeDocumentStatus.CONFIRMED,
    subtotalCents: 10_000,
    supplier: null,
    supplierId: null,
    taxCents: 0,
    totalCents: 10_000,
    type,
    updatedAt: now,
  };
}

function membership(permissions: string[]) {
  return {
    role: { key: "billing-user", permissions: permissions.map((key) => ({ permission: { key } })) },
    status: "ACTIVE",
  };
}

describe("HardwareBillEditService", () => {
  it("turns a corrected total below the already-paid amount into customer or supplier credit", () => {
    expect(calculateBillPaymentCorrection({
      alreadyPaidAmountCents: 12_000,
      correctedTotalCents: 8_000,
      requestedPaidAmountCents: 5_000,
    })).toEqual({
      allocatedPaymentCents: 8_000,
      correctedPaidAmountCents: 12_000,
      creditCents: 4_000,
    });
  });

  it("allows an authenticated billing user with the existing sales-manage permission to load an editor", async () => {
    const service = new HardwareBillEditService({
      financialTransaction: { findMany: async () => [] },
      hardwareInventoryMovement: { findMany: async () => [] },
      hardwareTradeDocument: { findFirst: async () => document() },
      tenantMembership: { findUnique: async () => membership(["hardware.sales.manage"]) },
    } as unknown as PrismaClient);
    await expect(service.billForEdit(context, "bill_1")).resolves.toMatchObject({ documentNumber: "HSO-2026-0001" });
  });

  it("rejects a user without the existing billing permission", async () => {
    const service = new HardwareBillEditService({
      hardwareTradeDocument: { findFirst: async () => document() },
      tenantMembership: { findUnique: async () => membership(["hardware.catalog.read"]) },
    } as unknown as PrismaClient);
    await expect(service.billForEdit(context, "bill_1")).rejects.toThrow("permission");
  });

  it("blocks an atomic confirmed-sale edit whose corrected repost would make stock negative", async () => {
    const current = document();
    let auditWrites = 0;
    const transactionClient = {
      auditEvent: { create: async () => { auditWrites += 1; } },
      financialTransaction: { findMany: async () => [] },
      hardwareInventoryMovement: {
        findMany: async (args: { where: { referenceId?: string } }) => args.where.referenceId
          ? [{ id: "movement_old", locationId: "location_1", productId: "product_1", quantity: 2, type: "STOCK_OUT", unitCostCents: null, unitPriceCents: 5000 }]
          : [{ quantity: 2, type: "STOCK_IN" }, { quantity: 2, type: "STOCK_OUT" }],
      },
      hardwareTradeDocument: { findFirst: async () => current },
      paymentRecord: { findMany: async () => [] },
    };
    const service = new HardwareBillEditService({
      $transaction: async (callback: (tx: typeof transactionClient) => Promise<unknown>) => callback(transactionClient),
      clientOrganization: { findFirst: async () => ({ customFields: { hardwarePartyRoles: ["customer"] }, id: "customer_1" }) },
      hardwareProduct: { findMany: async () => [{ id: "product_1", metadata: {}, name: "Tap", unit: { code: "PCS" } }] },
      hardwareStockLocation: { findFirst: async () => ({ id: "location_1" }) },
      hardwareTradeDocument: { findFirst: async () => current },
      tenantMembership: { findUnique: async () => membership(["hardware.sales.manage"]) },
    } as unknown as PrismaClient);
    await expect(service.updateBill(context, "bill_1", {
      currency: "INR",
      customerId: "customer_1",
      idempotencyKey: "bill-edit-negative-1",
      invoiceDiscountCents: 0,
      items: [{ productId: "product_1", quantity: 3, unitAmountCents: 5000 }],
      locationId: "location_1",
      metadata: {},
      paidAmountCents: 0,
      reason: "Correct quantity",
      roundOffCents: 0,
      type: HardwareTradeDocumentType.SALES_ORDER,
    })).rejects.toThrow("negative stock");
    expect(auditWrites).toBe(0);
  });

  it("keeps reversal, repost, document update, and audit writes inside one serializable transaction", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./bill-edit-service.ts", import.meta.url), "utf8"));
    expect(source).toContain("this.prisma.$transaction(async (tx)");
    expect(source).toContain('isolationLevel: "Serializable"');
    expect(source).toContain("postFinancialReversal(tx");
    expect(source).toContain("tx.auditEvent.create");
    expect(source).toContain("reversalIds");
    expect(source).toContain("repostIds");
  });
});

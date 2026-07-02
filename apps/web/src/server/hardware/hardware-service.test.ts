import {
  HardwareInventoryMovementType,
  HardwareTradeDocumentType,
  InvoiceStatus,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareService, stockForProduct } from "./hardware-service";

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

  it("validates import preview rows", async () => {
    const service = new HardwareService(prismaMock());
    await expect(
      service.importPreview(
        { tenantId: "tenant_1", userId: "user_1" },
        { rows: [{ name: "Pipe" }, { sku: "SKU-1", name: "Tap" }] },
      ),
    ).resolves.toEqual({ errors: [{ message: "SKU and name are required.", row: 1 }], validRows: 1 });
  });

  it("executes product imports with duplicate SKU and barcode handling", async () => {
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
        hardwareProduct: {
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
        rows: [
          { barcode: "111", name: "Angle Valve", sku: "ANG-VALVE" },
          { barcode: "222", name: "", sku: "BAD" },
          { barcode: "333", name: "Duplicate SKU", sku: "DUP-SKU" },
          { barcode: "DUP-BAR", name: "Duplicate Barcode", sku: "NEW-SKU" },
        ],
      },
    );

    expect(created).toHaveLength(1);
    expect(summary).toEqual({
      createdRows: 1,
      errors: [{ message: "SKU and name are required.", row: 2 }],
      skippedRows: 2,
      validRows: 3,
    });
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
          findMany: async () => [
            {
              createdAt: today,
              documentNumber: "HSO-2026-0001",
              totalCents: 12000,
              type: HardwareTradeDocumentType.SALES_ORDER,
              updatedAt: today,
            },
            {
              createdAt: today,
              documentNumber: "HSB-2026-0001",
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

import { HardwareInventoryMovementType, type PrismaClient } from "@trustfirst/database";
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

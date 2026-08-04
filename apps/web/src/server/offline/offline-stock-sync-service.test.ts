import { HardwareInventoryMovementType } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { offlineStockSyncTestUtils } from "./offline-stock-sync-service";

const baseMovement = {
  locationId: "location-1",
  productId: "product-1",
  quantity: 4,
  type: HardwareInventoryMovementType.STOCK_IN,
};

describe("offline stock sync helpers", () => {
  it("replays movement history using the ERP absolute-adjustment contract", () => {
    expect(offlineStockSyncTestUtils.stockForMovements([
      { quantity: 10, type: HardwareInventoryMovementType.STOCK_IN },
      { quantity: 3, type: HardwareInventoryMovementType.STOCK_OUT },
      { quantity: 5, type: HardwareInventoryMovementType.ADJUSTMENT },
      { quantity: 2, type: HardwareInventoryMovementType.STOCK_IN },
    ])).toBe(7);
  });

  it("calculates next stock for inward, outward and absolute adjustment", () => {
    expect(offlineStockSyncTestUtils.nextStockForMovement(10, baseMovement)).toBe(14);
    expect(offlineStockSyncTestUtils.nextStockForMovement(10, {
      ...baseMovement,
      quantity: 3,
      type: HardwareInventoryMovementType.STOCK_OUT,
    })).toBe(7);
    expect(offlineStockSyncTestUtils.nextStockForMovement(10, {
      ...baseMovement,
      quantity: 2,
      type: HardwareInventoryMovementType.ADJUSTMENT,
    })).toBe(2);
  });

  it("rejects stale absolute adjustments instead of silently overwriting server stock", () => {
    const adjustment = {
      ...baseMovement,
      quantity: 2,
      type: HardwareInventoryMovementType.ADJUSTMENT,
    };
    expect(() => offlineStockSyncTestUtils.assertStockContract(adjustment, 8, 10)).toThrow(
      "Stock changed from 10 to 8",
    );
    expect(() => offlineStockSyncTestUtils.assertStockContract(adjustment, 10, 10)).not.toThrow();
  });

  it("rejects an offline stock-out that exceeds current server stock", () => {
    expect(() => offlineStockSyncTestUtils.assertStockContract({
      ...baseMovement,
      quantity: 6,
      type: HardwareInventoryMovementType.STOCK_OUT,
    }, 5, 5)).toThrow("exceeds the current server stock 5");
  });

  it("serializes both queue-item and idempotency identities before receipt checks", () => {
    expect(offlineStockSyncTestUtils.stockIdentityLockKeys({
      id: "device-1",
      tenantId: "tenant-1",
    }, "queue-stock-1", "stock-idempotency-123")).toEqual([
      "offline-stock:tenant-1:device-1:idempotency:stock-idempotency-123",
      "offline-stock:tenant-1:device-1:item:queue-stock-1",
    ]);
  });
});

import { HardwareInventoryMovementType } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { offlineProductSyncTestUtils } from "./offline-product-sync-service";

describe("offline product sync helpers", () => {
  it("keeps auto-SKU generation aligned with the online product service", () => {
    expect(offlineProductSyncTestUtils.productSkuBase("Long Nose Tap")).toBe("LONGNOSETAP");
    expect(offlineProductSyncTestUtils.productSkuBase("वॉश बेसिन")).toBe("ITEM");
  });

  it("serializes name, barcode and auto-SKU identities before duplicate checks", () => {
    expect(offlineProductSyncTestUtils.productLockKeys("tenant-1", {
      barcode: "8901234567890",
      name: "वॉश बेसिन",
    })).toEqual([
      "offline-product:tenant-1:barcode:8901234567890",
      "offline-product:tenant-1:name:वॉश बेसिन",
      "offline-product:tenant-1:sku:AUTO:ITEM",
    ]);
  });

  it("calculates current stock using the existing stock movement contract", () => {
    expect(offlineProductSyncTestUtils.stockForMovements([
      { quantity: 10, type: HardwareInventoryMovementType.STOCK_IN },
      { quantity: 3, type: HardwareInventoryMovementType.STOCK_OUT },
      { quantity: 5, type: HardwareInventoryMovementType.ADJUSTMENT },
      { quantity: 2, type: HardwareInventoryMovementType.STOCK_IN },
    ])).toBe(7);
  });

  it("only recovers a product carrying the exact device, queue and idempotency tuple", () => {
    const identity = {
      deviceId: "device-1",
      idempotencyKey: "product-idempotency-123",
      queueItemId: "queue-product-1",
    };
    const metadata = {
      offlineDeviceId: identity.deviceId,
      offlineIdempotencyKey: identity.idempotencyKey,
      offlineSyncQueueItemId: identity.queueItemId,
    };
    expect(offlineProductSyncTestUtils.matchesOfflineIdentity(metadata, identity)).toBe(true);
    expect(offlineProductSyncTestUtils.matchesOfflineIdentity(metadata, {
      ...identity,
      queueItemId: "another-item",
    })).toBe(false);
  });
});

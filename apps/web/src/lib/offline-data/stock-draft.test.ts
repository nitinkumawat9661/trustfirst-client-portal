import { afterEach, describe, expect, it, vi } from "vitest";
import { listQueuedOfflineStockMovements, queueOfflineStockMovement } from "./stock-draft";

const scope = { tenantId: "tenant-1", userId: "user-1" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("offline stock movement queue", () => {
  it("persists multiple ordered movements with their visible stock snapshots", async () => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("indexedDB", undefined);

    const first = await queueOfflineStockMovement(scope, {
      locationId: "location-1",
      productId: "product-1",
      quantity: 2,
      type: "STOCK_IN",
    }, 10, { locationName: "Main", productName: "Product One" });
    const second = await queueOfflineStockMovement(scope, {
      locationId: "location-1",
      productId: "product-2",
      quantity: 4,
      type: "ADJUSTMENT",
    }, 7, { locationName: "Main", productName: "Product Two" });

    const movements = await listQueuedOfflineStockMovements(scope);
    expect(movements.map((movement) => movement.id)).toEqual([
      `offline-stock:${first.queueItem.id}`,
      `offline-stock:${second.queueItem.id}`,
    ]);
    expect(movements.map((movement) => movement.expectedCurrentStock)).toEqual([10, 7]);
    expect(movements.map((movement) => movement.projectedStock)).toEqual([12, 4]);
    expect(movements.map((movement) => movement.productName)).toEqual(["Product One", "Product Two"]);
  });
});

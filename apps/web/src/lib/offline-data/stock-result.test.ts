import { describe, expect, it } from "vitest";
import {
  buildQueuedOfflineStockMovement,
  projectedStock,
  validateOfflineStockMovement,
} from "./stock-result";

const baseInput = {
  locationId: "location-1",
  notes: "Offline stock count",
  productId: "product-1",
  quantity: 3,
  type: "STOCK_IN",
};

describe("queued offline stock movement summaries", () => {
  it("builds a pending row without changing the authoritative current stock", () => {
    expect(buildQueuedOfflineStockMovement(
      baseInput,
      10,
      "queue-stock-1",
      "2026-08-04T05:00:00.000Z",
      { locationName: "Main Godown", productName: "Ceramic Basin" },
    )).toMatchObject({
      expectedCurrentStock: 10,
      id: "offline-stock:queue-stock-1",
      locationName: "Main Godown",
      offlineQueued: true,
      productId: "product-1",
      productName: "Ceramic Basin",
      projectedStock: 13,
      quantity: 3,
      queueItemId: "queue-stock-1",
      queueStatus: "pending",
      type: "STOCK_IN",
    });
  });

  it("projects inward, outward and absolute adjustment results", () => {
    expect(projectedStock(10, { quantity: 4, type: "STOCK_IN" })).toBe(14);
    expect(projectedStock(10, { quantity: 4, type: "STOCK_OUT" })).toBe(6);
    expect(projectedStock(10, { quantity: 4, type: "ADJUSTMENT" })).toBe(4);
  });

  it("rejects stock-out above the visible snapshot before queue persistence", () => {
    expect(() => validateOfflineStockMovement({
      ...baseInput,
      quantity: 11,
      type: "STOCK_OUT",
    }, 10)).toThrow("exceeds the visible stock 10");
  });

  it("requires whole-number quantities and permits zero only for adjustment", () => {
    expect(() => validateOfflineStockMovement({
      ...baseInput,
      quantity: 0,
      type: "STOCK_IN",
    }, 10)).toThrow("must be greater than zero");
    expect(() => validateOfflineStockMovement({
      ...baseInput,
      quantity: 1.5,
    }, 10)).toThrow("Quantity must be a non-negative whole number");
    expect(validateOfflineStockMovement({
      ...baseInput,
      quantity: 0,
      type: "ADJUSTMENT",
    }, 10)).toMatchObject({ expectedCurrentStock: 10 });
  });
});

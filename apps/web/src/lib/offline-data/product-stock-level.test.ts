import { describe, expect, it } from "vitest";
import {
  buildQueuedOfflineProductSummary,
  catalogProductPayloadToOfflineInput,
} from "./product-result";

const locationId = "11111111-1111-4111-8111-111111111111";

describe("product-section stock level", () => {
  it("maps a catalog stock level to atomic offline opening stock", () => {
    const input = catalogProductPayloadToOfflineInput({
      gstTaxConfig: { rateBps: 1_800 },
      lowStockThreshold: 5,
      metadata: { hsnCode: "6910" },
      name: "QA Basin",
      purchaseCostCents: 8_000,
      salesPriceCents: 10_000,
      stockLevel: { locationId, quantity: 12 },
    });

    expect(input.openingStock).toEqual({ locationId, quantity: 12 });
    expect(input.lowStockThreshold).toBe(5);
  });

  it("shows queued opening stock as tracked instead of pending", () => {
    const summary = buildQueuedOfflineProductSummary({
      lowStockThreshold: 5,
      name: "QA Basin",
      openingStock: { locationId, quantity: 12 },
      purchaseCostCents: 8_000,
      salesPriceCents: 10_000,
    }, "queue-product-1");

    expect(summary.currentStock).toBe(12);
    expect(summary.lowStock).toBe(false);
    expect(summary.stockSetupStatus).toBe("TRACKED");
  });
});

import { describe, expect, it } from "vitest";
import { collectLastSalesPreferences } from "./sales-preferences";

describe("product sales preferences", () => {
  it("uses the explicit discount percentage and selected GST", () => {
    expect(collectLastSalesPreferences([{
      discountCents: 750,
      metadata: { discountPercent: 7.5 },
      productId: "product-1",
      quantity: 1,
      taxRateBps: 1800,
      unitAmountCents: 10_000,
    }])).toEqual([{
      discountBps: 750,
      gstRateBps: 1800,
      productId: "product-1",
    }]);
  });

  it("derives discount when old item metadata has no percentage", () => {
    expect(collectLastSalesPreferences([{
      discountCents: 500,
      productId: "product-1",
      quantity: 2,
      taxRateBps: 500,
      unitAmountCents: 5_000,
    }])[0]).toEqual({
      discountBps: 500,
      gstRateBps: 500,
      productId: "product-1",
    });
  });

  it("uses the last line for a repeated product and allows zero to reset", () => {
    expect(collectLastSalesPreferences([
      {
        discountCents: 500,
        metadata: { discountPercent: 5 },
        productId: "product-1",
        quantity: 1,
        taxRateBps: 1800,
        unitAmountCents: 10_000,
      },
      {
        discountCents: 0,
        metadata: { discountPercent: 0 },
        productId: "product-1",
        quantity: 1,
        taxRateBps: 0,
        unitAmountCents: 10_000,
      },
    ])).toEqual([{
      discountBps: 0,
      gstRateBps: 0,
      productId: "product-1",
    }]);
  });
});

import { describe, expect, it } from "vitest";
import { offlinePurchaseLabel, offlinePurchaseSeries } from "./purchase-draft";

describe("offline purchase mapping", () => {
  it.each([
    ["PURCHASE_ENTRY", "HPE", "Purchase entry"],
    ["PURCHASE_ORDER", "HPO", "Purchase order"],
    ["SUPPLIER_BILL", "HSB", "Supplier bill"],
  ] as const)("maps %s to its locked number series", (type, series, label) => {
    expect(offlinePurchaseSeries(type)).toBe(series);
    expect(offlinePurchaseLabel(type)).toBe(label);
  });

  it("rejects unsupported document types", () => {
    expect(offlinePurchaseSeries("PURCHASE_RETURN")).toBeNull();
    expect(offlinePurchaseSeries("SALES_ORDER")).toBeNull();
    expect(offlinePurchaseLabel("OTHER")).toBe("Purchase document");
  });
});

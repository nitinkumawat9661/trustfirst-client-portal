import { describe, expect, it } from "vitest";
import { isInsufficientStockResult, stockOverrideMessage } from "./estimate-stock-override";

describe("Estimate Bill stock override warning", () => {
  it("recognizes a structured stock shortage and shows exact product quantities", () => {
    const result = {
      code: "VALIDATION_ERROR",
      details: {
        reason: "INSUFFICIENT_STOCK",
        shortages: [{ available: 1, productName: "Basin Tap", required: 3 }],
      },
      message: "Available stock is lower than the document quantity.",
      ok: false as const,
    };

    expect(isInsufficientStockResult(result)).toBe(true);
    expect(stockOverrideMessage(result)).toContain("Basin Tap: required 3, available 1");
    expect(stockOverrideMessage(result)).toContain("OK dabakar proceed");
  });

  it("does not offer a stock override for unrelated validation failures", () => {
    expect(isInsufficientStockResult({ message: "Customer is required.", ok: false })).toBe(false);
  });
});

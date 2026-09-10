import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hardware sale stock deduction source", () => {
  const source = readFileSync(new URL("./trade-service.ts", import.meta.url), "utf8");

  it("does not skip products marked pending during stock posting", () => {
    expect(source).not.toContain("isStockSetupPending");
    expect(source).toContain("const trackedItems = normalizedItems;");
    expect(source).toContain("const stockItems = document.items;");
  });

  it("keeps server stock availability validation before sale posting", () => {
    expect(source).toContain("Available stock is lower than the document quantity.");
    expect(source).toContain('{ reason: "INSUFFICIENT_STOCK", shortages }');
    expect(source).toContain("isEstimateSale && input.allowNegativeStock");
    expect(source).toContain("type: movementTypeForDocument(document.type)");
  });
});

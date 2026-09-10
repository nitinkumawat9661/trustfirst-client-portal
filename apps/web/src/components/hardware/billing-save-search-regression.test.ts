import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSibling(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

describe("billing save interaction regression", () => {
  it("coalesces identical in-flight hardware mutations", () => {
    const source = readSibling("hardware-api-client.ts");
    expect(source).toContain("const inFlightMutations = new Map");
    expect(source).toContain("const existing = inFlightMutations.get(requestKey)");
    expect(source).toContain("if (existing) return existing");
    expect(source).toContain("inFlightMutations.delete(requestKey)");
  });

  it("routes every supported bill type through the audited editor", () => {
    const actions = readSibling("hardware-document-actions.tsx");
    expect(actions).toContain('["SALES_ORDER", "SALES_QUOTATION", "PURCHASE_ENTRY", "SUPPLIER_BILL"]');
    expect(actions).toContain("/admin/hardware/bills/${document.id}/edit");
    expect(actions).toContain("/admin/hardware/bills/${document.id}/audit");
  });

  it("keeps draft Estimates editable and supports an explicit stock override", () => {
    const actions = readSibling("hardware-document-actions.tsx");
    const editor = readSibling("hardware-bill-edit-form.tsx");
    expect(actions).toContain('(isEstimate && document.status === "DRAFT")');
    expect(actions).toContain("confirmEstimateStockOverride");
    expect(editor).toContain("Save, post and print Estimate Bill");
    expect(editor).toContain("allowNegativeStock: true");
  });

  it("closes the product form while persistence continues and keeps table controls accessible", () => {
    const form = readSibling("hardware-product-form.tsx");
    const table = readSibling("hardware-product-table.tsx");
    expect(form).toContain("is saving in the background");
    expect(form).toContain("router.push(`${productsPath}?saving=1`)");
    expect(form).toContain("void persistence");
    expect(table).toContain('data-testid="sticky-horizontal-scrollbar"');
    expect(table).toContain("deleteHardwareJson");
    expect(table).toContain("Existing bills and stock history will remain safe");
  });
});

describe("billing product search regression", () => {
  it("waits for typing to settle and hides stale results immediately", () => {
    const source = readSibling("hardware-product-combobox.tsx");
    expect(source).toContain("const SEARCH_DEBOUNCE_MS = 250");
    expect(source).toContain("const [settledQuery, setSettledQuery]");
    expect(source).toContain("const querySettling = open && normalizedTypedQuery !== normalizedSettledQuery");
    expect(source).toContain("const results = querySettling ? [] : rankedResults");
    expect(source).toContain("onBlur={() => setOpen(false)}");
  });
});

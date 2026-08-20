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

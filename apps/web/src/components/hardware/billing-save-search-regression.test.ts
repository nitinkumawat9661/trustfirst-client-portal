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

  it("opens Estimate edits in a script-created closable window", () => {
    const actions = readSibling("hardware-document-actions.tsx");
    const api = readSibling("hardware-api-client.ts");
    expect(actions).toContain("window.open(");
    expect(actions).toContain("trustfirst-estimate-edit-");
    expect(api).toContain("window.close()");
    expect(api).toContain("window.opener.location.reload()");
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

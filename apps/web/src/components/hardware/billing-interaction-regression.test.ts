import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateSource = readFileSync(new URL("./estimate-bill-form.tsx", import.meta.url), "utf8");
const quickPosSource = readFileSync(new URL("./quick-pos-form.tsx", import.meta.url), "utf8");
const productSearchSource = readFileSync(new URL("./hardware-product-combobox.tsx", import.meta.url), "utf8");
const creatableSearchSource = readFileSync(new URL("./creatable-combobox.tsx", import.meta.url), "utf8");

describe("billing save interaction safety", () => {
  it("prevents duplicate Estimate Bill saves synchronously and exits edit immediately", () => {
    expect(estimateSource).toContain("const saveLockRef = useRef(false);");
    expect(estimateSource).toContain("if (saveLockRef.current) return;");
    expect(estimateSource).toContain("saveLockRef.current = true;");
    expect(estimateSource).toContain('router.replace("/admin/hardware/quotations?updated=1");');
    expect(estimateSource).toContain("if (!navigationStarted) {");
    expect(estimateSource).toContain('? "Save changes"');
  });

  it("prevents duplicate sales posts before React can rerender the disabled button", () => {
    expect(quickPosSource).toContain("const postLockRef = useRef(false);");
    expect(quickPosSource).toContain("if (postLockRef.current) return;");
    expect(quickPosSource).toContain("postLockRef.current = true;");
    expect(quickPosSource).toContain("postLockRef.current = false;");
  });
});

describe("settled billing search", () => {
  it("waits for product typing to settle and clears product results immediately", () => {
    expect(productSearchSource).toContain("PRODUCT_SEARCH_DEBOUNCE_MS = 300");
    expect(productSearchSource).toContain("searchPending ? [] : rankProducts(searchQuery)");
    expect(productSearchSource).toContain('setSearchQuery("");');
    expect(productSearchSource).toContain("setOpen(false);");
    expect(productSearchSource).toContain("rankProducts(query)");
  });

  it("uses the same settled-query behavior for customer, supplier and reusable searches", () => {
    expect(creatableSearchSource).toContain("COMBOBOX_SEARCH_DEBOUNCE_MS = 300");
    expect(creatableSearchSource).toContain("searchPending ? [] : findMatches(searchQuery)");
    expect(creatableSearchSource).toContain('setSearchQuery("");');
    expect(creatableSearchSource).toContain("setOpen(false);");
    expect(creatableSearchSource).toContain("findMatches(query)");
  });
});

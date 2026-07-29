import { describe, expect, it } from "vitest";
import {
  isStrongProductSearchMatch,
  normalizeProductSearchText,
  rankProductSearchEntry,
  type ProductSearchEntry,
} from "./product-search";

const products: ProductSearchEntry[] = [
  {
    brandName: "Cera",
    categoryName: "Wash Basin",
    keywords: ["counter top", "white", "ceramic", "model 101"],
    label: "Cera White Counter Top Wash Basin",
    salesPriceCents: 425_000,
    sku: "CERA-101",
  },
  {
    brandName: "Hindware",
    categoryName: "Wash Basin",
    keywords: ["wall hung", "white", "ceramic", "flora"],
    label: "Hindware Flora Wall Hung Basin",
    salesPriceCents: 389_000,
    sku: "HIND-FLORA",
  },
  {
    brandName: "Parryware",
    categoryName: "Sanitaryware",
    keywords: ["wall hung", "western", "rimless"],
    label: "Parryware Rimless Wall Hung Commode",
    salesPriceCents: 799_000,
    sku: "PARRY-RIM",
  },
];

function ranked(query: string) {
  return products
    .map((product) => ({ product, score: rankProductSearchEntry(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

describe("advanced product search", () => {
  it("matches product words in any order", () => {
    const results = ranked("basin white cera");

    expect(results[0]?.product.label).toBe("Cera White Counter Top Wash Basin");
    expect(isStrongProductSearchMatch(results[0]?.score ?? 0)).toBe(true);
  });

  it("handles spelling mistakes in brand and product words", () => {
    const results = ranked("hindwer besin");

    expect(results[0]?.product.label).toBe("Hindware Flora Wall Hung Basin");
    expect(isStrongProductSearchMatch(results[0]?.score ?? 0)).toBe(true);
  });

  it("handles adjacent letter transposition", () => {
    const results = ranked("parryware comodde");

    expect(results[0]?.product.label).toBe("Parryware Rimless Wall Hung Commode");
  });

  it("matches partial words and model keywords", () => {
    expect(ranked("cera coun 101")[0]?.product.label).toBe("Cera White Counter Top Wash Basin");
    expect(ranked("flora wall")[0]?.product.label).toBe("Hindware Flora Wall Hung Basin");
  });

  it("matches common sanitary product aliases", () => {
    const results = ranked("parryware toilet");

    expect(results[0]?.product.label).toBe("Parryware Rimless Wall Hung Commode");
  });

  it("does not return unrelated weak matches", () => {
    expect(ranked("electrical ceiling fan")).toEqual([]);
  });

  it("normalizes punctuation, spacing, accents, and letter-number boundaries", () => {
    expect(normalizeProductSearchText("  CÉRA---101 / White  ")).toBe("cera 101 white");
  });
});

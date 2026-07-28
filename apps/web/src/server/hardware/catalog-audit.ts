import type { HardwareProductSummary } from "./types";

export type CatalogAuditSuggestion = {
  brandName: string | null;
  categoryName: string | null;
  currentStock: number;
  id: string;
  newName: string;
  oldName: string;
  salesPriceCents: number;
  sku: string;
};

export type CatalogDuplicateGroup = {
  differentRates: boolean;
  name: string;
  products: Array<Pick<CatalogAuditSuggestion, "brandName" | "categoryName" | "currentStock" | "id" | "salesPriceCents" | "sku">>;
};

export type CatalogAudit = {
  duplicateGroups: CatalogDuplicateGroup[];
  suggestions: CatalogAuditSuggestion[];
  summary: {
    differentRateGroups: number;
    duplicateGroups: number;
    duplicateProducts: number;
    missingBarcode: number;
    missingHsn: number;
    safeRenameCandidates: number;
    totalProducts: number;
  };
};

export function buildCatalogAudit(products: HardwareProductSummary[]): CatalogAudit {
  const groups = new Map<string, HardwareProductSummary[]>();
  for (const product of products) {
    const key = normalizeProductName(product.name);
    const group = groups.get(key) ?? [];
    group.push(product);
    groups.set(key, group);
  }

  const duplicateGroups = [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group): CatalogDuplicateGroup => ({
      differentRates: new Set(group.map((product) => product.salesPriceCents)).size > 1,
      name: group[0]?.name ?? "",
      products: group
        .map((product) => ({
          brandName: product.brandName,
          categoryName: product.categoryName,
          currentStock: product.currentStock,
          id: product.id,
          salesPriceCents: product.salesPriceCents,
          sku: product.sku,
        }))
        .sort((left, right) => localeCompare(left.sku, right.sku)),
    }))
    .sort((left, right) => right.products.length - left.products.length || localeCompare(left.name, right.name));

  const duplicateIds = new Set(duplicateGroups.flatMap((group) => group.products.map((product) => product.id)));
  const suggestions = products
    .filter((product) => duplicateIds.has(product.id))
    .map((product): CatalogAuditSuggestion | null => {
      const newName = buildSafeCatalogName(product);
      if (newName === product.name) return null;
      return {
        brandName: product.brandName,
        categoryName: product.categoryName,
        currentStock: product.currentStock,
        id: product.id,
        newName,
        oldName: product.name,
        salesPriceCents: product.salesPriceCents,
        sku: product.sku,
      };
    })
    .filter((suggestion): suggestion is CatalogAuditSuggestion => suggestion !== null)
    .sort((left, right) => localeCompare(left.oldName, right.oldName) || localeCompare(left.sku, right.sku));

  return {
    duplicateGroups,
    suggestions,
    summary: {
      differentRateGroups: duplicateGroups.filter((group) => group.differentRates).length,
      duplicateGroups: duplicateGroups.length,
      duplicateProducts: duplicateIds.size,
      missingBarcode: products.filter((product) => !product.barcode).length,
      missingHsn: products.filter((product) => !product.hsnCode).length,
      safeRenameCandidates: suggestions.length,
      totalProducts: products.length,
    },
  };
}

export function buildSafeCatalogName(product: Pick<HardwareProductSummary, "categoryName" | "name" | "sku">) {
  const normalizedName = normalizeProductName(product.name);
  const normalizedSku = normalizeProductName(product.sku);
  if (!normalizedSku || normalizedName.includes(normalizedSku)) return product.name;

  const category = product.categoryName?.trim();
  const includeCategory = Boolean(category) && !normalizedName.includes(normalizeProductName(category ?? ""));
  const suffix = ` — ${product.sku}${includeCategory ? ` — ${category}` : ""}`;
  const baseLength = Math.max(1, 240 - suffix.length);
  const base = product.name.trim().slice(0, baseLength).trimEnd();
  return `${base}${suffix}`.slice(0, 240);
}

export function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function localeCompare(left: string, right: string) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

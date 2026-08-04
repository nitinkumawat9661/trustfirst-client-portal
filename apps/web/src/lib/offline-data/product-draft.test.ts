import { afterEach, describe, expect, it, vi } from "vitest";
import { listQueuedOfflineProducts, queueOfflineCatalogProduct } from "./product-draft";

const scope = { tenantId: "tenant-1", userId: "user-1" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("offline catalog product queue", () => {
  it("persists multiple product drafts with display-only lookup labels", async () => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("indexedDB", undefined);

    const first = await queueOfflineCatalogProduct(scope, {
      gstTaxConfig: { rateBps: 1800 },
      lowStockThreshold: 1,
      metadata: { hsnCode: "6910" },
      name: "Product One",
      purchaseCostCents: 5000,
      salesPriceCents: 7500,
    }, { categoryName: "Sanitary", unitCode: "PCS" });
    const second = await queueOfflineCatalogProduct(scope, {
      gstTaxConfig: {},
      lowStockThreshold: 0,
      metadata: { hsnCode: null },
      name: "Product Two",
      purchaseCostCents: 0,
      salesPriceCents: 9900,
      sku: "PRODUCT-002",
    }, { brandName: "Test Brand" });

    const products = await listQueuedOfflineProducts(scope);
    expect(products.map((product) => product.name)).toEqual(["Product One", "Product Two"]);
    expect(products.map((product) => product.id)).toEqual([
      `offline-product:${first.queueItem.id}`,
      `offline-product:${second.queueItem.id}`,
    ]);
    expect(products[0]).toMatchObject({ categoryName: "Sanitary", unitCode: "PCS" });
    expect(products[1]).toMatchObject({ brandName: "Test Brand", sku: "PRODUCT-002" });
  });
});

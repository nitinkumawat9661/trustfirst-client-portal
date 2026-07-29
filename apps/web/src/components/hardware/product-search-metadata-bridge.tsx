"use client";

import { useEffect, useMemo } from "react";
import type { HardwareProductSummary } from "@/server/hardware";

export type ProductSearchMetadata = {
  brandName: string | null;
  categoryName: string | null;
  currentStock: number;
  id: string;
  name: string;
  salesPriceCents: number;
  sku: string;
  unitCode: string | null;
};

type SearchWindow = Window & {
  __hardwareProductSearchMetadata?: Record<string, ProductSearchMetadata>;
};

export function ProductSearchMetadataBridge({
  printerStorageKey,
  products,
}: {
  printerStorageKey: string;
  products: HardwareProductSummary[];
}) {
  const metadata = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, {
      brandName: product.brandName,
      categoryName: product.categoryName,
      currentStock: product.currentStock,
      id: product.id,
      name: product.name,
      salesPriceCents: product.salesPriceCents,
      sku: product.sku,
      unitCode: product.unitCode,
    } satisfies ProductSearchMetadata])),
    [products],
  );

  useEffect(() => {
    (window as SearchWindow).__hardwareProductSearchMetadata = metadata;
    window.dispatchEvent(new CustomEvent("hardware-product-search-metadata-ready"));
    try {
      window.localStorage.setItem(printerStorageKey, "a4");
    } catch {
      // Ignore private-mode storage restrictions.
    }
    return () => {
      delete (window as SearchWindow).__hardwareProductSearchMetadata;
    };
  }, [metadata, printerStorageKey]);

  return null;
}

"use client";

import { Badge, Button, Input } from "@trustfirst/ui";
import { Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  listQueuedOfflineProducts,
  readActiveOfflineScope,
  type QueuedOfflineProductSummary,
} from "../../lib/offline-data";
import type { HardwareProductSummary } from "@/server/hardware";

type ProductRow = HardwareProductSummary | QueuedOfflineProductSummary;

export function HardwareProductTable({ products }: { products: HardwareProductSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [visibleProducts, setVisibleProducts] = useState<ProductRow[]>(products);

  useEffect(() => {
    let cancelled = false;

    async function hydrateQueuedProducts() {
      const scope = readActiveOfflineScope();
      const queued = scope ? await listQueuedOfflineProducts(scope) : [];
      if (!cancelled) setVisibleProducts(mergeProductRows(products, queued));
    }

    function handleOnline() {
      void hydrateQueuedProducts();
      router.refresh();
    }

    function handleQueueChange() {
      void hydrateQueuedProducts();
      if (navigator.onLine) router.refresh();
    }

    void hydrateQueuedProducts();
    window.addEventListener("trustfirst:offline-queue-changed", handleQueueChange);
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("trustfirst:offline-queue-changed", handleQueueChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [products, router]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visibleProducts;
    return visibleProducts.filter((product) =>
      [product.name, product.sku, product.barcode, product.brandName, product.categoryName, product.hsnCode]
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [query, visibleProducts]);

  if (visibleProducts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
        <p className="font-medium">No products have been added yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">Add one product manually or import a verified product master in bulk.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, barcode, brand, or HSN" value={query} />
        </label>
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {visibleProducts.length} products</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-muted text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              {[
                "Product",
                "SKU",
                "Brand",
                "Category",
                "Unit",
                "Purchase",
                "Sale",
                "GST",
                "HSN",
                "Stock",
                "Status",
                "Actions",
              ].map((heading) => (
                <th className="px-3 py-3" key={heading} scope="col">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((product) => (
              <tr className="hover:bg-muted/50" key={product.id}>
                <td className="px-3 py-3 font-medium">{product.name}</td>
                <td className="px-3 py-3 font-mono text-xs">{product.sku}</td>
                <td className="px-3 py-3">{fallback(product.brandName)}</td>
                <td className="px-3 py-3">{fallback(product.categoryName)}</td>
                <td className="px-3 py-3">{fallback(product.unitCode)}</td>
                <td className="px-3 py-3">{moneyOrPending(product.purchaseCostCents)}</td>
                <td className="px-3 py-3">{moneyOrPending(product.salesPriceCents)}</td>
                <td className="px-3 py-3">{product.gstRateBps === null ? <Pending /> : `${product.gstRateBps / 100}%`}</td>
                <td className="px-3 py-3">{fallback(product.hsnCode, "Needs review")}</td>
                <td className="px-3 py-3">
                  <span className={product.lowStock ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{product.currentStock}</span>
                </td>
                <td className="px-3 py-3">
                  {isQueuedProduct(product)
                    ? <Badge>{queueStatusLabel(product.queueStatus)}</Badge>
                    : <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Active</Badge>}
                </td>
                <td className="px-3 py-3">
                  {isQueuedProduct(product) ? (
                    <span className="text-xs text-muted-foreground">Available after sync</span>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/hardware/products/${product.id}/edit`}><Pencil className="size-4" />Edit</Link>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match this search.</p> : null}
    </div>
  );
}

export function mergeProductRows(
  serverProducts: ProductRow[],
  queuedProducts: QueuedOfflineProductSummary[],
): ProductRow[] {
  const queuedIds = new Set(queuedProducts.map((product) => product.id));
  return [
    ...queuedProducts,
    ...serverProducts.filter((product) => !queuedIds.has(product.id) && !isQueuedProduct(product)),
  ];
}

function isQueuedProduct(product: ProductRow): product is QueuedOfflineProductSummary {
  return "offlineQueued" in product && product.offlineQueued === true;
}

function queueStatusLabel(status: QueuedOfflineProductSummary["queueStatus"]) {
  if (status === "failed") return "Sync failed";
  if (status === "syncing") return "Syncing";
  return "Pending sync";
}

function Pending() {
  return <span className="text-muted-foreground">Pending</span>;
}

function fallback(value: string | null, empty = "Not provided") {
  return value ?? <span className="text-muted-foreground">{empty}</span>;
}

function moneyOrPending(value: number) {
  if (value === 0) return <Pending />;
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value / 100);
}

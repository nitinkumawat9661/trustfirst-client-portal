"use client";

import { Badge, Button, Input } from "@trustfirst/ui";
import { Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listQueuedOfflineProducts,
  readActiveOfflineScope,
  type QueuedOfflineProductSummary,
} from "../../lib/offline-data";
import type { HardwareProductSummary } from "@/server/hardware";
import {
  backgroundProductSaveEvent,
  clearBackgroundProductSave,
  readBackgroundProductSave,
  type BackgroundProductSaveStatus,
} from "./background-product-save";
import { deleteHardwareJson } from "./hardware-api-client";

type ProductRow = HardwareProductSummary | QueuedOfflineProductSummary;

export function HardwareProductTable({ products }: { products: HardwareProductSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [visibleProducts, setVisibleProducts] = useState<ProductRow[]>(products);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<BackgroundProductSaveStatus | null>(null);
  const [scrollMetrics, setScrollMetrics] = useState({ clientWidth: 0, scrollWidth: 0 });
  const stickyScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => setSaveStatus(readBackgroundProductSave()), 0);
    const handleStatus = (event: Event) => {
      setSaveStatus((event as CustomEvent<BackgroundProductSaveStatus | null>).detail);
    };
    window.addEventListener(backgroundProductSaveEvent, handleStatus);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener(backgroundProductSaveEvent, handleStatus);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visibleProducts;
    return visibleProducts.filter((product) =>
      [product.name, product.sku, product.barcode, product.brandName, product.categoryName, product.hsnCode]
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [query, visibleProducts]);

  useEffect(() => {
    const scroller = tableScrollRef.current;
    if (!scroller) return;
    const updateMetrics = () => setScrollMetrics({
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
    });
    updateMetrics();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateMetrics);
    observer?.observe(scroller);
    if (scroller.firstElementChild) observer?.observe(scroller.firstElementChild);
    window.addEventListener("resize", updateMetrics);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [filtered.length]);

  async function deleteProduct(product: HardwareProductSummary) {
    if (!window.confirm(`Delete ${product.name} from the active product list? Existing bills and stock history will remain safe.`)) return;
    const previousRows = visibleProducts;
    setActionMessage(null);
    setDeletingId(product.id);
    setVisibleProducts((current) => current.filter((row) => row.id !== product.id));
    const result = await deleteHardwareJson<{ id: string }>(`/api/hardware/products/${product.id}`);
    setDeletingId(null);
    if (!result.ok) {
      setVisibleProducts(previousRows);
      setActionMessage({ error: true, text: result.message });
      return;
    }
    setActionMessage({ error: false, text: `${product.name} deleted from the active product list.` });
    router.refresh();
  }

  const statusPanels = (
    <>
      {saveStatus ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm ${saveStatus.state === "error" ? "border-red-300 bg-red-50 text-red-900" : saveStatus.state === "pending" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
          role={saveStatus.state === "error" ? "alert" : "status"}
        >
          <span>{saveStatus.message}</span>
          <span className="flex items-center gap-2">
            {saveStatus.state === "error" && saveStatus.returnHref ? <Button asChild size="sm" variant="outline"><Link href={saveStatus.returnHref}>Review and retry</Link></Button> : null}
            {saveStatus.state !== "pending" ? <Button onClick={clearBackgroundProductSave} size="sm" type="button" variant="ghost">Dismiss</Button> : null}
          </span>
        </div>
      ) : null}
      {actionMessage ? <p className={`rounded-md border p-3 text-sm ${actionMessage.error ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`} role={actionMessage.error ? "alert" : "status"}>{actionMessage.text}</p> : null}
    </>
  );

  if (visibleProducts.length === 0) {
    return (
      <div className="space-y-4">
        {statusPanels}
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
          <p className="font-medium">No products have been added yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Add one product manually or import a verified product master in bulk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusPanels}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, barcode, brand, or HSN" value={query} />
        </label>
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {visibleProducts.length} products</p>
      </div>
      <div className="relative">
        {scrollMetrics.scrollWidth > scrollMetrics.clientWidth + 1 ? (
          <div className="sticky top-16 z-10 border-x border-t border-border bg-background p-1 shadow-sm" data-testid="sticky-horizontal-scrollbar">
            <div
              aria-label="Scroll product table horizontally"
              className="hardware-horizontal-scrollbar overflow-x-scroll"
              onScroll={(event) => {
                if (tableScrollRef.current) tableScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
              }}
              ref={stickyScrollRef}
              role="region"
              tabIndex={0}
            >
              <div className="h-px" style={{ width: scrollMetrics.scrollWidth }} />
            </div>
          </div>
        ) : null}
        <div
          className="overflow-x-auto rounded-md border border-border"
          onScroll={(event) => {
            if (stickyScrollRef.current) stickyScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          ref={tableScrollRef}
        >
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
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/hardware/products/${product.id}/edit`}><Pencil className="size-4" />Edit</Link>
                      </Button>
                      <Button
                        className="text-red-700 hover:text-red-800 dark:text-red-300"
                        disabled={deletingId === product.id}
                        onClick={() => void deleteProduct(product)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />{deletingId === product.id ? "Deleting..." : "Delete"}
                      </Button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
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

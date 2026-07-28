"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Download, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CatalogAudit } from "@/server/hardware";
import { postHardwareJson } from "./hardware-api-client";

const BATCH_SIZE = 25;

type CleanupResponse = {
  skipped: string[];
  updated: Array<{ id: string; name: string; sku: string }>;
};

export function CatalogAuditPanel({ audit }: { audit: CatalogAudit }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: audit.suggestions.length });
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const appliedSet = useMemo(() => new Set(appliedIds), [appliedIds]);

  const filteredSuggestions = useMemo(() => {
    const normalized = normalize(query);
    if (!normalized) return audit.suggestions;
    return audit.suggestions.filter((suggestion) => normalize([
      suggestion.oldName,
      suggestion.newName,
      suggestion.sku,
      suggestion.brandName ?? "",
      suggestion.categoryName ?? "",
    ].join(" ")).includes(normalized));
  }, [audit.suggestions, query]);

  async function applySafeNames() {
    setError(null);
    setApplying(true);
    setAppliedIds([]);
    setSkippedCount(0);
    setProgress({ completed: 0, total: audit.suggestions.length });
    const nextApplied: string[] = [];
    let nextSkipped = 0;

    for (let index = 0; index < audit.suggestions.length; index += BATCH_SIZE) {
      const batch = audit.suggestions.slice(index, index + BATCH_SIZE);
      const result = await postHardwareJson<CleanupResponse>("/api/hardware/products/catalog-cleanup", {
        confirmation: "RENAME",
        items: batch.map((suggestion) => ({
          expectedName: suggestion.oldName,
          id: suggestion.id,
          newName: suggestion.newName,
        })),
      });
      if (!result.ok) {
        setError(result.message);
        setApplying(false);
        return;
      }
      nextApplied.push(...result.data.updated.map((product) => product.id));
      nextSkipped += result.data.skipped.length;
      setAppliedIds([...nextApplied]);
      setSkippedCount(nextSkipped);
      setProgress({ completed: Math.min(index + batch.length, audit.suggestions.length), total: audit.suggestions.length });
    }

    setApplying(false);
    router.refresh();
  }

  function downloadCsv() {
    const rows = [
      ["Brand", "SKU", "Old product name", "Safe product name", "Category", "Sale price", "Current stock"],
      ...audit.suggestions.map((suggestion) => [
        suggestion.brandName ?? "",
        suggestion.sku,
        suggestion.oldName,
        suggestion.newName,
        suggestion.categoryName ?? "",
        (suggestion.salesPriceCents / 100).toFixed(2),
        String(suggestion.currentStock),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Mangalam-Catalog-Duplicate-Name-Audit.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total products" value={audit.summary.totalProducts} />
        <Metric label="Same-name groups" value={audit.summary.duplicateGroups} />
        <Metric label="Different-rate groups" value={audit.summary.differentRateGroups} />
        <Metric label="Safe rename candidates" value={audit.summary.safeRenameCandidates} />
        <Metric label="Products in duplicate groups" value={audit.summary.duplicateProducts} />
        <Metric label="Missing barcode" value={audit.summary.missingBarcode} />
        <Metric label="Missing HSN" value={audit.summary.missingHsn} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" />Safe name cleanup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            This operation changes only the product display name by appending its existing SKU and category. It does not change price, SKU, barcode, GST, HSN, stock, purchase, sale, invoice, ledger or payment data. No product is deleted or merged.
          </p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
            <Input placeholder="Type RENAME to enable safe cleanup" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            <Button onClick={downloadCsv} type="button" variant="outline"><Download className="size-4" />Download audit CSV</Button>
            <Button disabled={applying || confirmation !== "RENAME" || !audit.suggestions.length} onClick={applySafeNames} type="button">
              <RefreshCw className={`size-4 ${applying ? "animate-spin" : ""}`} />{applying ? `Applying ${progress.completed}/${progress.total}` : "Apply safe names"}
            </Button>
          </div>
          {error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800" role="alert">{error}</p> : null}
          {appliedIds.length || skippedCount ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
              Updated {appliedIds.length} product names. Skipped {skippedCount} already-resolved or stale rows. Refreshing audit...
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rename preview</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Filter by product, SKU, brand or category" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="max-h-[70vh] overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 bg-muted"><tr><th className="p-3">Current name</th><th className="p-3">Safe name</th><th className="p-3">Brand / category</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Stock</th><th className="p-3">Action</th></tr></thead>
              <tbody>
                {filteredSuggestions.map((suggestion) => (
                  <tr className="border-t border-border align-top" key={suggestion.id}>
                    <td className="p-3"><p className="font-medium">{suggestion.oldName}</p><p className="mt-1 text-xs text-muted-foreground">{suggestion.sku}</p></td>
                    <td className="p-3">{suggestion.newName}</td>
                    <td className="p-3 text-muted-foreground">{[suggestion.brandName, suggestion.categoryName].filter(Boolean).join(" • ") || "Not provided"}</td>
                    <td className="p-3 text-right tabular-nums">{money(suggestion.salesPriceCents)}</td>
                    <td className="p-3 text-right tabular-nums">{suggestion.currentStock}</td>
                    <td className="p-3">
                      {appliedSet.has(suggestion.id) ? <span className="text-emerald-700">Updated</span> : <Button asChild size="sm" variant="ghost"><Link href={`/admin/hardware/products/${suggestion.id}/edit`}><ExternalLink className="size-4" />Review</Link></Button>}
                    </td>
                  </tr>
                ))}
                {!filteredSuggestions.length ? <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No matching audit rows.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Largest same-name groups</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {audit.duplicateGroups.slice(0, 30).map((group) => (
            <details className="rounded-md border border-border p-3" key={`${group.name}-${group.products[0]?.id ?? "group"}`}>
              <summary className="cursor-pointer font-medium">{group.name} — {group.products.length} variants{group.differentRates ? " — different rates" : ""}</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.products.map((product) => <div className="rounded border border-border p-2 text-xs" key={product.id}><p className="font-medium">{product.sku}</p><p>{money(product.salesPriceCents)} • Stock {product.currentStock}</p><p className="text-muted-foreground">{[product.brandName, product.categoryName].filter(Boolean).join(" • ")}</p></div>)}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="pt-5"><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>;
}

function normalize(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

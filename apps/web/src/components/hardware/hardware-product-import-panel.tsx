"use client";

import { useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";

type ImportPreview = {
  errors: Array<{ field?: string; message: string; row: number }>;
  importId: string;
  mode: "create" | "update" | "upsert";
  rows: Array<{
    action: "create" | "skip" | "update";
    barcode: string | null;
    brand: string | null;
    category: string | null;
    name: string;
    openingStock: number;
    row: number;
    sku: string;
    stockLocation: string | null;
    unit: string | null;
    warnings: string[];
  }>;
  validRows: number;
};

type ImportSummary = ImportPreview & {
  createdRows: number;
  dryRun: boolean;
  skippedRows: number;
  updatedRows: number;
};

export function HardwareProductImportPanel() {
  const [duplicateMode, setDuplicateMode] = useState<"reject" | "skip">("reject");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "update" | "upsert">("create");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState<"execute" | "preview" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  async function submit(endpoint: string, dryRun: boolean) {
    if (!file) {
      setMessage("Select the completed CSV template first.");
      return;
    }
    setBusy(endpoint.includes("execute") ? "execute" : "preview");
    setMessage(null);
    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    body.set("duplicateMode", duplicateMode);
    body.set("dryRun", String(dryRun));
    body.set("idempotencyKey", idempotencyKey);
    try {
      const response = await fetch(endpoint, { body, method: "POST" });
      const envelope = await response.json().catch(() => ({}));
      if (!response.ok || !envelope.ok) {
        setMessage(envelope.error?.message ?? "Import request failed.");
        return;
      }
      if (endpoint.includes("execute")) {
        setSummary(envelope.data);
        setPreview(envelope.data);
      } else {
        setPreview(envelope.data);
        setSummary(null);
      }
    } catch {
      setMessage("The import service could not be reached. Check the connection and retry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Product import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">
              Import mode
              <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
                <option value="create">Create new products</option>
                <option value="update">Update existing products</option>
                <option value="upsert">Create or update</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Duplicate handling
              <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={duplicateMode} onChange={(event) => setDuplicateMode(event.target.value as typeof duplicateMode)}>
                <option value="reject">Reject duplicates</option>
                <option value="skip">Skip existing SKUs</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              CSV file
              <Input
                accept=".csv,text/csv"
                type="file"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setSummary(null);
                  setIdempotencyKey(`hardware-import-${crypto.randomUUID()}`);
                }}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href="/api/hardware/import-template">Download template</a>
            </Button>
            <Button disabled={!file || busy !== null} type="button" variant="outline" onClick={() => submit("/api/hardware/import-preview", true)}>
              {busy === "preview" ? "Previewing..." : "Preview upload"}
            </Button>
            <Button disabled={!file || busy !== null || Boolean(preview?.errors.length)} type="button" onClick={() => submit("/api/hardware/import-execute", false)}>
              {busy === "execute" ? "Importing..." : "Import products"}
            </Button>
          </div>
          {message ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
          {preview ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Opening stock</th>
                    <th className="px-3 py-2">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr className="border-t border-border" key={`${row.row}-${row.sku}`}>
                      <td className="px-3 py-2">{row.row}</td>
                      <td className="px-3 py-2 font-mono">{row.sku}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2"><Badge>{row.action}</Badge></td>
                      <td className="px-3 py-2">{row.openingStock}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.warnings.join(" ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Validation report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {preview ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Valid rows" value={preview.validRows} />
                <Metric label="Errors" value={preview.errors.length} />
                <Metric label="Creates" value={preview.rows.filter((row) => row.action === "create").length} />
                <Metric label="Updates" value={preview.rows.filter((row) => row.action === "update").length} />
              </div>
              <p className="break-all font-mono text-xs text-muted-foreground">{preview.importId}</p>
              {summary ? (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  Imported {summary.createdRows} created, {summary.updatedRows} updated, {summary.skippedRows} skipped.
                </div>
              ) : null}
              {preview.errors.length > 0 ? (
                <ul className="space-y-2">
                  {preview.errors.map((error) => (
                    <li className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-destructive" key={`${error.row}-${error.field}-${error.message}`}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-border bg-muted/40 p-3">No blocking validation errors.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Upload the completed CSV template to preview row-level validation before importing.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

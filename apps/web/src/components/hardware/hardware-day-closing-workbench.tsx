"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { LockKeyhole, Printer, RefreshCcw, UnlockKeyhole } from "lucide-react";
import { useState } from "react";
import type { HardwareDayClosingSummary } from "@/server/hardware";
import { getHardwareJson, postHardwareJson } from "./hardware-api-client";

export function HardwareDayClosingWorkbench({ initialSummary }: { initialSummary: HardwareDayClosingSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [businessDate, setBusinessDate] = useState(initialSummary.businessDate);
  const [openingCash, setOpeningCash] = useState(centsToRupees(initialSummary.closing?.openingCashCents ?? 0));
  const [countedCash, setCountedCash] = useState(centsToRupees(initialSummary.closing?.countedCashCents ?? initialSummary.expectedCashCents));
  const [notes, setNotes] = useState(initialSummary.closing?.notes ?? "");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    setMessage(null);
    const result = await getHardwareJson<HardwareDayClosingSummary>(`/api/hardware/day-closing?businessDate=${encodeURIComponent(businessDate)}`);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    setSummary(result.data);
    setOpeningCash(centsToRupees(result.data.closing?.openingCashCents ?? 0));
    setCountedCash(centsToRupees(result.data.closing?.countedCashCents ?? result.data.expectedCashCents));
    setNotes(result.data.closing?.notes ?? "");
  }

  async function closeDay() {
    setPending(true);
    setMessage(null);
    const result = await postHardwareJson<unknown>("/api/hardware/day-closing", {
      businessDate,
      countedCashCents: rupeesToCents(countedCash),
      notes: notes || undefined,
      openingCashCents: rupeesToCents(openingCash),
    });
    setPending(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    setMessage({ kind: "success", text: "Business day closed." });
    await refresh();
  }

  async function reopenDay() {
    if (!summary.closing) return;
    const reason = window.prompt("Reason for reopening this business day");
    if (!reason || reason.trim().length < 3) {
      setMessage({ kind: "error", text: "Reopen reason is required." });
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await postHardwareJson<unknown>(`/api/hardware/day-closing/${summary.closing.id}/reopen`, { reason: reason.trim() });
    setPending(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    setMessage({ kind: "success", text: "Business day reopened." });
    await refresh();
  }

  const expectedCashCents = rupeesToCents(openingCash) + summary.totals.cashSalesCents - summary.totals.customerRefundsCashCents - summary.totals.cashSupplierPaymentsCents;
  const countedCashCents = rupeesToCents(countedCash);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Business date</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Date
            <Input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Opening cash
            <Input inputMode="decimal" min="0" step="0.01" type="number" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Counted cash
            <Input inputMode="decimal" min="0" step="0.01" type="number" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} />
          </label>
          <div className="flex items-end gap-2">
            <Button className="flex-1" onClick={() => void refresh()} type="button" variant="outline"><RefreshCcw className="size-4" />Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Server totals</CardTitle>
          <span className="rounded-md border px-2 py-1 text-xs font-semibold">{summary.closing?.status ?? "OPEN"}</span>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Cash sales / receipts" value={summary.totals.cashSalesCents} />
          <Metric label="UPI sales / receipts" value={summary.totals.upiSalesCents} />
          <Metric label="Card sales / receipts" value={summary.totals.cardSalesCents} />
          <Metric label="Bank sales / receipts" value={summary.totals.bankSalesCents} />
          <Metric label="Credit sales" value={summary.totals.creditSalesCents} />
          <Metric label="Customer payments" value={summary.totals.customerPaymentsCents} />
          <Metric label="Customer refunds" value={summary.totals.customerRefundsCents} />
          <Metric label="Cash customer refunds" value={summary.totals.customerRefundsCashCents} />
          <Metric label="Purchases" value={summary.totals.purchasesCents} />
          <Metric label="Supplier payments" value={summary.totals.supplierPaymentsCents} />
          <Metric label="Cash supplier payments" value={summary.totals.cashSupplierPaymentsCents} />
          <Metric label="Sale returns" value={summary.totals.saleReturnsCents} />
          <Metric label="Purchase returns" value={summary.totals.purchaseReturnsCents} />
          <Metric label="Supplier refunds" value={summary.totals.supplierRefundsCents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cash close</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Expected cash" value={expectedCashCents} />
            <Metric label="Counted cash" value={countedCashCents} />
            <Metric label="Difference" value={countedCashCents - expectedCashCents} />
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Notes
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => window.print()} type="button" variant="outline"><Printer className="size-4" />Print report</Button>
            {summary.closing?.status === "CLOSED" ? (
              <Button disabled={pending} onClick={() => void reopenDay()} type="button" variant="outline"><UnlockKeyhole className="size-4" />Reopen</Button>
            ) : (
              <Button disabled={pending} onClick={() => void closeDay()} type="button"><LockKeyhole className="size-4" />{pending ? "Closing..." : "Close day"}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {message ? (
        <p className={`rounded-md border p-3 text-sm ${message.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{money(value)}</div></div>;
}

function rupeesToCents(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function centsToRupees(value: number) {
  return (value / 100).toFixed(2);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value / 100);
}

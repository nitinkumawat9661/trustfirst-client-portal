"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { HardwareReturnOptions, HardwareTradeSummary } from "@/server/hardware";
import { getHardwareJson, postHardwareJson } from "./hardware-api-client";

type LocationOption = { id: string; name: string };

export function HardwareReturnsWorkbench({
  locations,
  purchases,
  sales,
}: {
  locations: LocationOption[];
  purchases: HardwareTradeSummary[];
  sales: HardwareTradeSummary[];
}) {
  const [tab, setTab] = useState<"sale" | "purchase">("sale");
  const [documentId, setDocumentId] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [settlement, setSettlement] = useState("customer_credit");
  const [options, setOptions] = useState<HardwareReturnOptions | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const documents = tab === "sale" ? sales : purchases;

  async function loadOptions(nextDocumentId = documentId) {
    setMessage(null);
    setOptions(null);
    setQuantities({});
    if (!nextDocumentId) return;
    const result = await getHardwareJson<HardwareReturnOptions>(`/api/hardware/trade/${nextDocumentId}/return-options`);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    setOptions(result.data);
    setQuantities(Object.fromEntries(result.data.remainingItems.map((item) => [item.originalItemId, "0"])));
  }

  async function submitReturn() {
    if (!options) return;
    if (!locationId) {
      setMessage({ kind: "error", text: "Select a stock location." });
      return;
    }
    if (reason.trim().length < 3) {
      setMessage({ kind: "error", text: "Return reason is required." });
      return;
    }
    const items = options.remainingItems
      .map((item) => ({ originalItemId: item.originalItemId, quantity: Number(quantities[item.originalItemId] ?? 0) }))
      .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0);
    if (items.length === 0) {
      setMessage({ kind: "error", text: "Enter at least one return quantity." });
      return;
    }
    setPending(true);
    const result = await postHardwareJson<HardwareTradeSummary>(
      tab === "sale"
        ? `/api/hardware/trade/${options.documentId}/return`
        : `/api/hardware/trade/${options.documentId}/purchase-return`,
      tab === "sale"
        ? {
            idempotencyKey: `sale-return-${options.documentId}-${crypto.randomUUID()}`,
            items,
            locationId,
            reason,
            refundType: settlement,
          }
        : {
            idempotencyKey: `purchase-return-${options.documentId}-${crypto.randomUUID()}`,
            items,
            locationId,
            reason,
            settlementType: settlement,
          },
    );
    setPending(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    setMessage({ kind: "success", text: `${result.data.documentNumber} recorded. Use print preview to print or reprint.` });
    await loadOptions(options.documentId);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Tab active={tab === "sale"} onClick={() => { setTab("sale"); setDocumentId(""); setOptions(null); setSettlement("customer_credit"); }}>Sale return</Tab>
        <Tab active={tab === "purchase"} onClick={() => { setTab("purchase"); setDocumentId(""); setOptions(null); setSettlement("supplier_credit"); }}>Purchase return</Tab>
      </div>
      <Card>
        <CardHeader><CardTitle>{tab === "sale" ? "Original sale" : "Original purchase"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
          <label className="grid gap-1.5 text-sm font-medium">
            Document
            <select
              className={selectClassName}
              value={documentId}
              onChange={(event) => {
                setDocumentId(event.target.value);
                void loadOptions(event.target.value);
              }}
            >
              <option value="">Select document</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.documentNumber} - {document.customerName ?? document.supplierName ?? "Party not linked"} - {money(document.totalCents)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Stock location
            <select className={selectClassName} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Select location</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void loadOptions()} type="button" variant="outline"><Search className="size-4" />Load</Button>
          </div>
        </CardContent>
      </Card>

      {options ? (
        <Card>
          <CardHeader>
            <CardTitle>{options.documentNumber} return items</CardTitle>
            <p className="text-sm text-muted-foreground">{options.partyName ?? "Party not linked"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.remainingItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">All quantities have already been returned.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">Item</th><th>Sold/Purchased</th><th>Returned</th><th>Remaining</th><th>Return qty</th><th>Rate</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {options.remainingItems.map((item) => (
                      <tr key={item.originalItemId}>
                        <td className="py-3 font-medium">{item.description}</td>
                        <td>{item.purchasedOrSoldQuantity}</td>
                        <td>{item.previouslyReturnedQuantity}</td>
                        <td>{item.remainingQuantity}</td>
                        <td>
                          <Input
                            className="max-w-28"
                            inputMode="numeric"
                            max={item.remainingQuantity}
                            min="0"
                            step="1"
                            type="number"
                            value={quantities[item.originalItemId] ?? "0"}
                            onChange={(event) => setQuantities((current) => ({ ...current, [item.originalItemId]: event.target.value }))}
                          />
                        </td>
                        <td>{money(item.unitAmountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
                Reason
                <Input value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Settlement
                <select className={selectClassName} value={settlement} onChange={(event) => setSettlement(event.target.value)}>
                  {tab === "sale" ? (
                    <>
                      <option value="customer_credit">Customer credit</option>
                      <option value="cash_refund">Refund pending</option>
                      <option value="payment_refund">Payment refund pending</option>
                    </>
                  ) : (
                    <>
                      <option value="supplier_credit">Supplier credit</option>
                      <option value="refund_received">Refund received</option>
                    </>
                  )}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {message?.kind === "success" && options ? (
                <Button asChild type="button" variant="outline">
                  <Link href={`/admin/hardware/print/${options.documentId}`} target="_blank">Print original</Link>
                </Button>
              ) : null}
              <Button disabled={pending || options.remainingItems.length === 0} onClick={() => void submitReturn()} type="button">
                <RotateCcw className="size-4" />{pending ? "Recording..." : "Record return"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {message ? (
        <p className={`rounded-md border p-3 text-sm ${message.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button className={`rounded-md border px-3 py-2 text-sm font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`} onClick={onClick} type="button">{children}</button>;
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

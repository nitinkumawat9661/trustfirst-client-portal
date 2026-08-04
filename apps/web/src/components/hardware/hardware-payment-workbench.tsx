"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Printer, ReceiptText, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  listQueuedOfflinePartyPayments,
  readActiveOfflineScope,
  readOfflineFinancialPosition,
  readOfflinePaymentReceipt,
  type OfflinePaymentExpectedTarget,
  type OfflinePaymentReceipt,
  type OfflineSnapshotFinancialPosition,
  type QueuedOfflinePartyPayment,
} from "../../lib/offline-data";
import type { HardwarePartySummary, PartyFinancialPosition } from "@/server/hardware";
import { getHardwareJson, postHardwarePartyPaymentJson } from "./hardware-api-client";

const paymentModes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"] as const;

const paymentSchema = z.object({
  amount: z.string().refine((value) => Number(value) > 0, "Enter a positive amount."),
  excessAsAdvance: z.boolean(),
  mode: z.enum(paymentModes),
  notes: z.string().max(1000),
  partyId: z.string().min(1, "Select a party."),
  reference: z.string().max(120),
});

type PaymentValues = z.infer<typeof paymentSchema>;
type PaymentPostResult = {
  printTransactionId: string | null;
  receiptNumber: string | null;
} | QueuedOfflinePartyPayment;

export function HardwarePaymentWorkbench({
  parties,
  role,
}: {
  parties: HardwarePartySummary[];
  role: "customer" | "supplier";
}) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    control,
    resetField,
  } = useForm<PaymentValues>({
    defaultValues: {
      amount: "",
      excessAsAdvance: false,
      mode: "CASH",
      notes: "",
      partyId: "",
      reference: "",
    },
    resolver: zodResolver(paymentSchema),
  });
  const partyId = useWatch({ control, name: "partyId" });
  const amount = useWatch({ control, name: "amount" });
  const [position, setPosition] = useState<PartyFinancialPosition | null>(null);
  const [positionSource, setPositionSource] = useState<"offline" | "online" | null>(null);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [lastPrintTransactionId, setLastPrintTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [queuedPayments, setQueuedPayments] = useState<QueuedOfflinePartyPayment[]>([]);
  const [syncedReceipts, setSyncedReceipts] = useState<Record<string, OfflinePaymentReceipt>>({});

  const loadPosition = useCallback(async (nextPartyId: string) => {
    setLastPrintTransactionId(null);
    if (!nextPartyId) {
      setPosition(null);
      setPositionSource(null);
      setAllocations({});
      return;
    }
    setLoading(true);
    setStatus(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const scope = readActiveOfflineScope();
      if (!scope) {
        setStatus({ kind: "error", message: "Offline tenant scope is unavailable. Reopen the installed ERP while online once, then retry." });
        setPosition(null);
        setPositionSource(null);
        setLoading(false);
        return;
      }
      const savedPosition = await readOfflineFinancialPosition(scope, role, nextPartyId);
      if (!savedPosition) {
        setStatus({ kind: "error", message: "Offline payment balances are not prepared for this party. Reconnect and use Refresh Offline Data, then retry." });
        setPosition(null);
        setPositionSource(null);
        setLoading(false);
        return;
      }
      const normalized = normalizeOfflinePosition(savedPosition);
      setPosition(normalized);
      setPositionSource("offline");
      setAllocations(Object.fromEntries(normalized.openItems.map((item) => [item.targetTransactionId, centsToRupees(item.dueCents)])));
      setLoading(false);
      return;
    }

    const result = await getHardwareJson<PartyFinancialPosition>(`/api/hardware/financial/position?role=${role}&partyId=${encodeURIComponent(nextPartyId)}`);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.message });
      setPosition(null);
      setPositionSource(null);
      setLoading(false);
      return;
    }
    setPosition(result.data);
    setPositionSource("online");
    setAllocations(Object.fromEntries(result.data.openItems.map((item) => [item.targetTransactionId, centsToRupees(item.dueCents)])));
    setLoading(false);
  }, [role]);

  const hydrateQueuedPayments = useCallback(async () => {
    const scope = readActiveOfflineScope();
    if (!scope) {
      setQueuedPayments([]);
      return;
    }
    const payments = await listQueuedOfflinePartyPayments(scope, role);
    setQueuedPayments(payments);
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    const synced = payments.filter((payment) => payment.queueStatus === "synced");
    const receiptEntries = await Promise.all(synced.map(async (payment) => {
      try {
        return [payment.queueItemId, await readOfflinePaymentReceipt(scope, payment.queueItemId)] as const;
      } catch {
        return [payment.queueItemId, null] as const;
      }
    }));
    setSyncedReceipts((current) => ({
      ...current,
      ...Object.fromEntries(receiptEntries.filter((entry): entry is readonly [string, OfflinePaymentReceipt] => Boolean(entry[1]))),
    }));
  }, [role]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    const handleQueueChange = () => {
      void hydrateQueuedPayments();
      if (navigator.onLine && partyId) void loadPosition(partyId);
    };
    queueMicrotask(() => {
      updateConnection();
      void hydrateQueuedPayments();
    });
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("trustfirst:offline-queue-changed", handleQueueChange);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("trustfirst:offline-queue-changed", handleQueueChange);
    };
  }, [hydrateQueuedPayments, loadPosition, partyId]);

  const allocationTotalCents = useMemo(
    () => Object.values(allocations).reduce((total, value) => total + rupeesToCents(value), 0),
    [allocations],
  );
  const amountCents = rupeesToCents(amount);
  const excessCents = Math.max(amountCents - allocationTotalCents, 0);

  async function onSubmit(values: PaymentValues) {
    setStatus(null);
    setLastPrintTransactionId(null);
    if (!position) {
      setStatus({ kind: "error", message: "Load the selected party's financial position before posting." });
      return;
    }
    const selectedAllocations = Object.entries(allocations)
      .map(([targetTransactionId, value]) => ({ amountCents: rupeesToCents(value), targetTransactionId }))
      .filter((allocation) => allocation.amountCents > 0);
    const expectedTargets = buildExpectedPaymentTargets(position, selectedAllocations);
    const selectedParty = parties.find((party) => party.id === values.partyId);
    const body = {
      allocations: selectedAllocations,
      amountCents: rupeesToCents(values.amount),
      excessAsAdvance: values.excessAsAdvance,
      idempotencyKey: `manual-${role}-${crypto.randomUUID()}`,
      mode: values.mode,
      notes: values.notes || undefined,
      partyId: values.partyId,
      reference: values.reference || undefined,
    };
    const result = await postHardwarePartyPaymentJson<PaymentPostResult>(
      role,
      body,
      expectedTargets,
      {
        documentNumbers: expectedTargets.map((target) => target.documentNumber ?? "").filter(Boolean),
        partyName: selectedParty?.name ?? position.partyName,
      },
    );
    if (!result.ok) {
      setStatus({ kind: "error", message: result.message });
      return;
    }

    resetField("amount");
    resetField("excessAsAdvance");
    if (isQueuedPayment(result.data)) {
      setQueuedPayments((current) => mergeQueuedPaymentRows(current, [result.data]));
      setStatus({
        kind: "success",
        message: `${role === "supplier" ? "Supplier payment" : "Customer receipt"} saved offline. Final number and print will be available after reconnect sync.`,
      });
      return;
    }

    setLastPrintTransactionId(result.data.printTransactionId);
    setStatus({ kind: "success", message: `${role === "supplier" ? "Payment voucher" : "Receipt"} ${result.data.receiptNumber ?? ""} posted.`.trim() });
    await loadPosition(values.partyId);
    await hydrateQueuedPayments();
  }

  async function refreshWorkbench() {
    await hydrateQueuedPayments();
    if (partyId) await loadPosition(partyId);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{role === "supplier" ? "Supplier payment" : "Customer payment receipt"}</CardTitle>
          <Badge className={isOnline ? "" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"}>
            {isOnline ? "Online" : "Offline queue"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium lg:col-span-2">
            {role === "supplier" ? "Supplier" : "Customer"}
            <select
              className={selectClassName}
              {...register("partyId", { onChange: (event) => void loadPosition(event.target.value) })}
            >
              <option value="">Select party</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
            {errors.partyId?.message ? <span className="text-xs font-normal text-red-700">{errors.partyId.message}</span> : null}
          </label>
          <Field error={errors.amount?.message} label="Amount received / paid">
            <Input inputMode="decimal" min="0.01" step="0.01" type="number" {...register("amount")} />
          </Field>
          <label className="grid gap-1.5 text-sm font-medium">
            Mode
            <select className={selectClassName} {...register("mode")}>
              {paymentModes.map((mode) => <option key={mode} value={mode}>{humanize(mode)}</option>)}
            </select>
          </label>
          <Field error={errors.reference?.message} label="Reference number"><Input autoComplete="off" {...register("reference")} /></Field>
          <Field error={errors.notes?.message} label="Notes"><Input autoComplete="off" {...register("notes")} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Allocation</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {positionSource === "offline" ? <Badge>Offline snapshot</Badge> : null}
            <span>{loading ? "Loading balances..." : position ? `${money(position.totalOutstandingCents)} outstanding` : "Select a party"}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!position ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Select a party to load open invoices or bills.</div>
          ) : position.openItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No open items. Any posted amount must be confirmed as advance.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Document</th><th>Date</th><th>Original</th><th>Paid</th><th>Due</th><th>Allocate</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {position.openItems.map((item) => (
                    <tr key={item.targetTransactionId}>
                      <td className="py-3 font-medium">{item.invoiceNumber ?? item.documentNumber}</td>
                      <td>{new Date(item.occurredAt).toLocaleDateString("en-IN")}</td>
                      <td>{money(item.originalCents)}</td>
                      <td>{money(item.paidCents)}</td>
                      <td>{money(item.dueCents)}</td>
                      <td>
                        <Input
                          className="max-w-36"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={allocations[item.targetTransactionId] ?? ""}
                          onChange={(event) => setAllocations((current) => ({ ...current, [item.targetTransactionId]: event.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid gap-3 rounded-md bg-muted p-4 text-sm sm:grid-cols-3">
            <Summary label="Entered amount" value={amountCents} />
            <Summary label="Allocated" value={allocationTotalCents} />
            <Summary label="Excess advance" value={excessCents} />
          </div>
          {excessCents > 0 ? (
            <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <input className="mt-1" type="checkbox" {...register("excessAsAdvance")} />
              Confirm {money(excessCents)} as {role === "supplier" ? "supplier advance" : "customer advance"}.
            </label>
          ) : null}
          {positionSource === "offline" ? (
            <p className="text-xs text-muted-foreground">Saved balances remain unchanged locally. Reconnect sync rechecks every selected invoice or bill before posting.</p>
          ) : null}
        </CardContent>
      </Card>

      {queuedPayments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Offline payment queue</CardTitle>
            <p className="text-sm text-muted-foreground">Pending rows are instructions only. Final receipt or voucher numbers come from the server after reconciliation.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Party</th><th className="px-3 py-3">Documents</th><th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3">Split</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Receipt</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queuedPayments.map((payment) => {
                    const receipt = syncedReceipts[payment.queueItemId];
                    return (
                      <tr key={payment.queueItemId}>
                        <td className="px-3 py-3">{payment.occurredAt.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-3 font-medium">{payment.partyName}</td>
                        <td className="px-3 py-3">{payment.documentNumbers.join(", ") || "Advance"}</td>
                        <td className="px-3 py-3 text-right">{money(payment.amountCents)}</td>
                        <td className="px-3 py-3">Allocated {money(payment.allocatedCents)}{payment.advanceCents > 0 ? ` · Advance ${money(payment.advanceCents)}` : ""}</td>
                        <td className="px-3 py-3">
                          <Badge className={payment.queueStatus === "failed" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" : ""}>
                            {queueStatusLabel(payment.queueStatus)}
                          </Badge>
                          {payment.error ? <p className="mt-1 max-w-72 text-xs text-red-700">{payment.error}</p> : null}
                        </td>
                        <td className="px-3 py-3">
                          {receipt ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{receipt.receiptNumber ?? "Posted"}</span>
                              <Button
                                disabled={!receipt.printTransactionId}
                                onClick={() => receipt.printTransactionId && printTransaction(receipt.printTransactionId)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Printer className="size-3.5" />Print
                              </Button>
                            </div>
                          ) : payment.queueStatus === "synced" ? "Loading final receipt..." : "After sync"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {status ? (
        <p className={`rounded-md border p-3 text-sm ${status.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={status.kind === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button disabled={!position || isSubmitting} type="submit"><ReceiptText className="size-4" />{isSubmitting ? "Saving..." : isOnline ? "Post" : "Save offline"}</Button>
        <Button
          disabled={!lastPrintTransactionId}
          onClick={() => lastPrintTransactionId && printTransaction(lastPrintTransactionId)}
          type="button"
          variant="outline"
        >
          <Printer className="size-4" />Print / reprint
        </Button>
        <Button onClick={() => void refreshWorkbench()} type="button" variant="ghost"><RefreshCcw className="size-4" />Refresh</Button>
      </div>
    </form>
  );
}

export function buildExpectedPaymentTargets(
  position: PartyFinancialPosition,
  allocations: Array<{ amountCents: number; targetTransactionId: string }>,
): OfflinePaymentExpectedTarget[] {
  const openItems = new Map(position.openItems.map((item) => [item.targetTransactionId, item]));
  return allocations.map((allocation) => {
    const item = openItems.get(allocation.targetTransactionId);
    if (!item) throw new Error("A selected invoice or bill is no longer available in the loaded financial position.");
    return {
      documentNumber: item.invoiceNumber ?? item.documentNumber,
      dueCents: item.dueCents,
      targetTransactionId: item.targetTransactionId,
    };
  });
}

export function mergeQueuedPaymentRows(
  current: QueuedOfflinePartyPayment[],
  next: QueuedOfflinePartyPayment[],
) {
  const rows = new Map(current.map((payment) => [payment.queueItemId, payment]));
  for (const payment of next) rows.set(payment.queueItemId, payment);
  return [...rows.values()].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

function normalizeOfflinePosition(position: OfflineSnapshotFinancialPosition): PartyFinancialPosition {
  return {
    ...position,
    openItems: position.openItems.map((item) => ({ ...item, occurredAt: new Date(item.occurredAt) })),
  };
}

function isQueuedPayment(value: PaymentPostResult): value is QueuedOfflinePartyPayment {
  return "offlineQueued" in value && value.offlineQueued === true;
}

function queueStatusLabel(status: QueuedOfflinePartyPayment["queueStatus"]) {
  if (status === "failed") return "Conflict / failed";
  if (status === "syncing") return "Syncing";
  if (status === "synced") return "Synced";
  return "Pending sync";
}

function printTransaction(transactionId: string) {
  window.open(`/admin/hardware/payments/print/${transactionId}?format=80mm`, "_blank", "noopener,noreferrer");
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string | undefined; label: string }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}</label>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><div className="text-muted-foreground">{label}</div><div className="font-semibold">{money(value)}</div></div>;
}

function rupeesToCents(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function centsToRupees(value: number) {
  return (value / 100).toFixed(2);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value / 100);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

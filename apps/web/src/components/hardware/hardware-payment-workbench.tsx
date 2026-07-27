"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Printer, ReceiptText, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { HardwarePartySummary, PartyFinancialPosition } from "@/server/hardware";
import { getHardwareJson, postHardwareJson } from "./hardware-api-client";

const paymentModes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"] as const;

const paymentSchema = z.object({
  amount: z.string().refine((value) => Number(value) > 0, "Enter a positive amount."),
  excessAsAdvance: z.boolean(),
  mode: z.enum(paymentModes),
  notes: z.string(),
  partyId: z.string().min(1, "Select a party."),
  reference: z.string(),
});

const adjustmentSchema = z.object({
  amount: z.string().refine((value) => Number(value) > 0, "Enter a positive amount."),
  direction: z.enum(["debit", "credit"]),
  effectiveDate: z.string().min(1, "Select an effective date."),
  notes: z.string(),
  partyId: z.string().min(1, "Select a party."),
  reason: z.string().min(3, "Reason is required."),
  reference: z.string(),
  role: z.enum(["customer", "supplier"]),
});

type PaymentValues = z.infer<typeof paymentSchema>;
type AdjustmentValues = z.infer<typeof adjustmentSchema>;

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
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [lastPrintTransactionId, setLastPrintTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPosition(nextPartyId: string) {
    setLastPrintTransactionId(null);
    if (!nextPartyId) {
      setPosition(null);
      setAllocations({});
      return;
    }
    setLoading(true);
    setStatus(null);
    const result = await getHardwareJson<PartyFinancialPosition>(`/api/hardware/financial/position?role=${role}&partyId=${encodeURIComponent(nextPartyId)}`);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.message });
      setPosition(null);
      setLoading(false);
      return;
    }
    setPosition(result.data);
    setAllocations(Object.fromEntries(result.data.openItems.map((item) => [item.targetTransactionId, centsToRupees(item.dueCents)])));
    setLoading(false);
  }

  const allocationTotalCents = useMemo(
    () => Object.values(allocations).reduce((total, value) => total + rupeesToCents(value), 0),
    [allocations],
  );
  const amountCents = rupeesToCents(amount);
  const excessCents = Math.max(amountCents - allocationTotalCents, 0);

  async function onSubmit(values: PaymentValues) {
    setStatus(null);
    setLastPrintTransactionId(null);
    const selectedAllocations = Object.entries(allocations)
      .map(([targetTransactionId, value]) => ({ amountCents: rupeesToCents(value), targetTransactionId }))
      .filter((allocation) => allocation.amountCents > 0);
    const result = await postHardwareJson<{ printTransactionId: string | null; receiptNumber: string | null }>(
      role === "supplier" ? "/api/hardware/financial/supplier-payments" : "/api/hardware/financial/customer-payments",
      {
        allocations: selectedAllocations,
        amountCents: rupeesToCents(values.amount),
        excessAsAdvance: values.excessAsAdvance,
        idempotencyKey: `manual-${role}-${crypto.randomUUID()}`,
        mode: values.mode,
        notes: values.notes || undefined,
        partyId: values.partyId,
        reference: values.reference || undefined,
      },
    );
    if (!result.ok) {
      setStatus({ kind: "error", message: result.message });
      return;
    }
    setLastPrintTransactionId(result.data.printTransactionId);
    setStatus({ kind: "success", message: `${role === "supplier" ? "Payment voucher" : "Receipt"} ${result.data.receiptNumber ?? ""} posted.`.trim() });
    resetField("amount");
    resetField("excessAsAdvance");
    await loadPosition(values.partyId);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>{role === "supplier" ? "Supplier payment" : "Customer payment receipt"}</CardTitle></CardHeader>
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
          <Field label="Reference number"><Input autoComplete="off" {...register("reference")} /></Field>
          <Field label="Notes"><Input autoComplete="off" {...register("notes")} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Allocation</CardTitle>
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading balances..." : position ? `${money(position.totalOutstandingCents)} outstanding` : "Select a party"}
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
        </CardContent>
      </Card>

      {status ? (
        <p className={`rounded-md border p-3 text-sm ${status.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={status.kind === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button disabled={!position || isSubmitting} type="submit"><ReceiptText className="size-4" />{isSubmitting ? "Posting..." : "Post"}</Button>
        <Button
          disabled={!lastPrintTransactionId}
          onClick={() => {
            if (lastPrintTransactionId) window.open(`/admin/hardware/payments/print/${lastPrintTransactionId}?format=80mm`, "_blank", "noopener,noreferrer");
          }}
          type="button"
          variant="outline"
        >
          <Printer className="size-4" />Print / reprint
        </Button>
        <Button onClick={() => partyId && void loadPosition(partyId)} type="button" variant="ghost"><RefreshCcw className="size-4" />Refresh</Button>
      </div>
    </form>
  );
}

export function HardwareLedgerAdjustmentForm({
  customers,
  suppliers,
}: {
  customers: HardwarePartySummary[];
  suppliers: HardwarePartySummary[];
}) {
  const {
    formState: { errors, isSubmitting },
    control,
    handleSubmit,
    register,
    reset,
  } = useForm<AdjustmentValues>({
    defaultValues: {
      amount: "",
      direction: "debit",
      effectiveDate: new Date().toISOString().slice(0, 10),
      notes: "",
      partyId: "",
      reason: "",
      reference: "",
      role: "customer",
    },
    resolver: zodResolver(adjustmentSchema),
  });
  const role = useWatch({ control, name: "role" });
  const parties = role === "supplier" ? suppliers : customers;
  const [status, setStatus] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function onSubmit(values: AdjustmentValues) {
    setStatus(null);
    const result = await postHardwareJson<{ transactionNumber: string }>("/api/hardware/financial/adjustments", {
      amountCents: rupeesToCents(values.amount),
      direction: values.direction,
      effectiveDate: new Date(`${values.effectiveDate}T00:00:00.000+05:30`).toISOString(),
      idempotencyKey: `manual-adjustment-${crypto.randomUUID()}`,
      notes: values.notes || undefined,
      partyId: values.partyId,
      reason: values.reason,
      reference: values.reference || undefined,
      role: values.role,
    });
    if (!result.ok) {
      setStatus({ kind: "error", message: result.message });
      return;
    }
    setStatus({ kind: "success", message: `Adjustment ${result.data.transactionNumber} posted. Ledger updated without stock impact.` });
    reset({ ...values, amount: "", notes: "", reason: "", reference: "" });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle>Manual ledger adjustment</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Ledger
            <select className={selectClassName} {...register("role")}>
              <option value="customer">Customer ledger</option>
              <option value="supplier">Supplier ledger</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium lg:col-span-2">
            Party
            <select className={selectClassName} {...register("partyId")}>
              <option value="">Select party</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
            {errors.partyId?.message ? <span className="text-xs font-normal text-red-700">{errors.partyId.message}</span> : null}
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Adjustment type
            <select className={selectClassName} {...register("direction")}>
              <option value="debit">{role === "supplier" ? "Increase payable" : "Increase receivable"}</option>
              <option value="credit">{role === "supplier" ? "Reduce payable" : "Reduce receivable"}</option>
            </select>
          </label>
          <Field error={errors.amount?.message} label="Amount">
            <Input inputMode="decimal" min="0.01" step="0.01" type="number" {...register("amount")} />
          </Field>
          <Field error={errors.effectiveDate?.message} label="Effective date">
            <Input type="date" {...register("effectiveDate")} />
          </Field>
          <Field label="Reference"><Input autoComplete="off" {...register("reference")} /></Field>
          <Field error={errors.reason?.message} label="Mandatory reason">
            <Input autoComplete="off" {...register("reason")} />
          </Field>
          <label className="grid gap-1.5 text-sm font-medium lg:col-span-4">
            Notes
            <Input autoComplete="off" {...register("notes")} />
          </label>
        </CardContent>
      </Card>
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        Adjustments create immutable financial entries only. They do not change stock, returns, or posted bills.
      </div>
      {status ? (
        <p className={`rounded-md border p-3 text-sm ${status.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={status.kind === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Posting..." : "Post adjustment"}</Button>
      </div>
    </form>
  );
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

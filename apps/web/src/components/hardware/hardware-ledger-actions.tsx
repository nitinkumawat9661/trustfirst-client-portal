"use client";

import { Button, Input, Textarea } from "@trustfirst/ui";
import { Eye, PencilLine, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HardwarePartyRole, HardwarePartySummary, LedgerEntry } from "@/server/hardware";
import { DirectPrintButton } from "./direct-print-button";
import { patchHardwareJson, postHardwareJson } from "./hardware-api-client";

type Notice = { kind: "error" | "success"; message: string } | null;

export function HardwarePartyEditButton({ party, role }: { party: HardwarePartySummary; role: HardwarePartyRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState({
    address: party.address ?? "",
    creditLimit: centsToRupees(party.creditLimitCents),
    gstin: party.gstin ?? "",
    mobile: party.contact ?? "",
    name: party.name,
    notes: party.notes ?? "",
  });

  async function save() {
    setSubmitting(true);
    setNotice(null);
    const result = await patchHardwareJson<HardwarePartySummary>(`/api/hardware/parties/${party.id}`, {
      address: values.address || undefined,
      creditLimitCents: rupeesToCents(values.creditLimit),
      gstin: values.gstin ? values.gstin.toUpperCase() : undefined,
      mobile: values.mobile || undefined,
      name: values.name,
      notes: values.notes || undefined,
      role,
    });
    setSubmitting(false);
    if (!result.ok) {
      setNotice({ kind: "error", message: result.message });
      return;
    }
    setNotice({ kind: "success", message: `${role === "supplier" ? "Supplier" : "Customer"} details updated.` });
    router.refresh();
    window.setTimeout(() => setOpen(false), 400);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        <PencilLine className="size-4" />Edit {role === "supplier" ? "supplier" : "customer"}
      </Button>
      {open ? (
        <Modal title={`Edit ${role === "supplier" ? "supplier" : "customer"}`} onClose={() => setOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="Mobile"><Input value={values.mobile} onChange={(event) => setValues((current) => ({ ...current, mobile: event.target.value }))} /></Field>
            <Field label="GSTIN"><Input className="uppercase" value={values.gstin} onChange={(event) => setValues((current) => ({ ...current, gstin: event.target.value }))} /></Field>
            <Field label="Credit limit"><Input inputMode="decimal" min="0" step="0.01" type="number" value={values.creditLimit} onChange={(event) => setValues((current) => ({ ...current, creditLimit: event.target.value }))} /></Field>
            <Field label="Address" wide><Textarea rows={3} value={values.address} onChange={(event) => setValues((current) => ({ ...current, address: event.target.value }))} /></Field>
            <Field label="Notes" wide><Textarea rows={3} value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} /></Field>
          </div>
          {notice ? <NoticeView notice={notice} /> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">Cancel</Button>
            <Button disabled={submitting || values.name.trim().length < 2} onClick={save} type="button">{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function LedgerEntryActions({ entry, role }: { entry: LedgerEntry; role: HardwarePartyRole }) {
  const router = useRouter();
  const [mode, setMode] = useState<"correct" | "reverse" | "view" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const originalDirection = entry.debitCents > 0 ? "debit" : "credit";
  const [correction, setCorrection] = useState({
    amount: centsToRupees(entry.amountCents),
    direction: originalDirection,
    effectiveDate: toDateInput(entry.date),
    reason: "",
    reference: entry.reference === "OPENING" ? "" : entry.reference,
  });

  async function correctEntry() {
    if (!entry.transactionId) return;
    setSubmitting(true);
    setNotice(null);
    const result = await postHardwareJson<unknown>(`/api/hardware/financial/transactions/${entry.transactionId}/correct-adjustment`, {
      amountCents: rupeesToCents(correction.amount),
      confirm: true,
      direction: correction.direction,
      effectiveDate: new Date(`${correction.effectiveDate}T00:00:00.000+05:30`).toISOString(),
      idempotencyKey: `ledger-correction-${crypto.randomUUID()}`,
      reason: correction.reason,
      reference: correction.reference || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setNotice({ kind: "error", message: result.message });
      return;
    }
    setNotice({ kind: "success", message: "Corrected entry posted. Original entry was reversed and preserved." });
    router.refresh();
  }

  async function reverseEntry() {
    if (!entry.transactionId) return;
    const reason = window.prompt("Reason");
    if (!reason?.trim()) return;
    setSubmitting(true);
    setNotice(null);
    const result = await postHardwareJson<unknown>(`/api/hardware/financial/transactions/${entry.transactionId}/reverse-adjustment`, {
      confirm: true,
      idempotencyKey: `ledger-reversal-${crypto.randomUUID()}`,
      reason,
    });
    setSubmitting(false);
    if (!result.ok) {
      setNotice({ kind: "error", message: result.message });
      return;
    }
    setNotice({ kind: "success", message: "Entry reversed. Original entry was preserved." });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button onClick={() => setMode("view")} size="sm" type="button" variant="ghost"><Eye className="size-3.5" />View</Button>
      {entry.isCorrectable && entry.transactionId ? (
        <Button onClick={() => setMode("correct")} size="sm" type="button" variant="ghost"><PencilLine className="size-3.5" />Correct entry</Button>
      ) : null}
      {entry.isReversible && entry.transactionId ? (
        <Button disabled={submitting} onClick={reverseEntry} size="sm" type="button" variant="ghost"><RotateCcw className="size-3.5" />Reverse entry</Button>
      ) : null}
      {entry.transactionId ? <DirectPrintButton format="80mm" label="Print voucher" url={`/admin/hardware/payments/print/${entry.transactionId}`} /> : null}
      {mode === "view" ? (
        <Modal title="Ledger entry" onClose={() => setMode(null)}>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Detail label="Original amount" value={money(entry.amountCents)} />
            <Detail label="Type" value={entry.transactionType ?? entry.description} />
            <Detail label="Date" value={entry.date.getTime() === 0 ? "-" : entry.date.toLocaleDateString("en-IN")} />
            <Detail label="Reference" value={entry.reference} />
            <Detail label="Debit" value={entry.debitCents ? money(entry.debitCents) : "-"} />
            <Detail label="Credit" value={entry.creditCents ? money(entry.creditCents) : "-"} />
          </dl>
        </Modal>
      ) : null}
      {mode === "correct" ? (
        <Modal title={entry.isOpeningBalance ? "Correct opening balance" : "Correct entry"} onClose={() => setMode(null)}>
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="font-medium">Original amount: {money(entry.amountCents)}</div>
            <div className="text-muted-foreground">Type: {entry.transactionType ?? entry.description} · Reference: {entry.reference}</div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Corrected amount"><Input inputMode="decimal" min="0.01" step="0.01" type="number" value={correction.amount} onChange={(event) => setCorrection((current) => ({ ...current, amount: event.target.value }))} /></Field>
            <Field label="Direction">
              <select className={selectClassName} value={correction.direction} onChange={(event) => setCorrection((current) => ({ ...current, direction: event.target.value as "debit" | "credit" }))}>
                <option value="debit">{role === "supplier" ? "पैसा देना है" : "पैसा लेना है"}</option>
                <option value="credit">{role === "supplier" ? "Advance / reduce payable" : "Advance / reduce receivable"}</option>
              </select>
            </Field>
            <Field label="Date"><Input type="date" value={correction.effectiveDate} onChange={(event) => setCorrection((current) => ({ ...current, effectiveDate: event.target.value }))} /></Field>
            <Field label="Reference"><Input value={correction.reference} onChange={(event) => setCorrection((current) => ({ ...current, reference: event.target.value }))} /></Field>
            <Field label="Reason" wide><Textarea rows={3} value={correction.reason} onChange={(event) => setCorrection((current) => ({ ...current, reason: event.target.value }))} /></Field>
          </div>
          {notice ? <NoticeView notice={notice} /> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setMode(null)} type="button" variant="outline">Cancel</Button>
            <Button disabled={submitting || correction.reason.trim().length < 3} onClick={correctEntry} type="button">{submitting ? "Posting..." : "Post correction"}</Button>
          </div>
        </Modal>
      ) : null}
      {notice ? <span className={notice.kind === "error" ? "text-xs text-red-700" : "text-xs text-emerald-700"}>{notice.message}</span> : null}
    </div>
  );
}

export function OpeningBalanceCorrectionButton({ party, role }: { party: HardwarePartySummary; role: HardwarePartyRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState({ amount: "", direction: "debit" as "debit" | "credit", reason: "", reference: "OPENING-CORRECTION" });

  async function postCorrection() {
    setSubmitting(true);
    setNotice(null);
    const result = await postHardwareJson<{ transactionNumber: string }>("/api/hardware/financial/adjustments", {
      amountCents: rupeesToCents(values.amount),
      direction: values.direction,
      idempotencyKey: `opening-balance-correction-${crypto.randomUUID()}`,
      partyId: party.id,
      reason: values.reason,
      reference: values.reference,
      role,
    });
    setSubmitting(false);
    if (!result.ok) {
      setNotice({ kind: "error", message: result.message });
      return;
    }
    setNotice({ kind: "success", message: `Opening balance correction ${result.data.transactionNumber} posted.` });
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">Correct opening balance</Button>
      {open ? (
        <Modal title="Correct opening balance" onClose={() => setOpen(false)}>
          <p className="text-sm text-muted-foreground">Current opening balance is {money(party.openingBalanceCents)}. This action posts a durable correction entry and does not overwrite history.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Corrected amount"><Input inputMode="decimal" min="0.01" step="0.01" type="number" value={values.amount} onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))} /></Field>
            <Field label="Direction">
              <select className={selectClassName} value={values.direction} onChange={(event) => setValues((current) => ({ ...current, direction: event.target.value as "debit" | "credit" }))}>
                <option value="debit">{role === "supplier" ? "पैसा देना है" : "पैसा लेना है"}</option>
                <option value="credit">{role === "supplier" ? "Advance / reduce payable" : "Advance / reduce receivable"}</option>
              </select>
            </Field>
            <Field label="Reference"><Input value={values.reference} onChange={(event) => setValues((current) => ({ ...current, reference: event.target.value }))} /></Field>
            <Field label="Reason" wide><Textarea rows={3} value={values.reason} onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))} /></Field>
          </div>
          {notice ? <NoticeView notice={notice} /> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">Cancel</Button>
            <Button disabled={submitting || values.reason.trim().length < 3} onClick={postCorrection} type="button">{submitting ? "Posting..." : "Post correction"}</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button aria-label="Close" onClick={onClose} size="sm" type="button" variant="ghost"><X className="size-4" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ children, label, wide }: { children: React.ReactNode; label: string; wide?: boolean }) {
  return <label className={`grid gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function NoticeView({ notice }: { notice: Exclude<Notice, null> }) {
  return <p className={`mt-3 rounded-md border p-3 text-sm ${notice.kind === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>{notice.message}</p>;
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

function toDateInput(value: Date) {
  if (value.getTime() === 0) return new Date().toISOString().slice(0, 10);
  return value.toISOString().slice(0, 10);
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { useEffect, useMemo, useState } from "react";
import {
  resolveBillPayment,
  type BillPaymentChoice,
  type ResolvedBillPayment,
} from "../../lib/hardware/payment-choice";

type PaymentModeOption = {
  label: string;
  value: string;
};

type BillPaymentConfirmationDialogProps = {
  creditAllowed: boolean;
  defaultChoice?: BillPaymentChoice;
  defaultMode: string;
  direction: "payable" | "receivable";
  onCancel: () => void;
  onConfirm: (result: {
    choice: Exclude<BillPaymentChoice, "">;
    payment: ResolvedBillPayment;
  }) => void;
  open: boolean;
  partyName: string;
  paymentModes: PaymentModeOption[];
  totalCents: number;
};

export function BillPaymentConfirmationDialog({
  creditAllowed,
  defaultChoice = "",
  defaultMode,
  direction,
  onCancel,
  onConfirm,
  open,
  partyName,
  paymentModes,
  totalCents,
}: BillPaymentConfirmationDialogProps) {
  const [choice, setChoice] = useState<BillPaymentChoice>(defaultChoice);
  const [mode, setMode] = useState(defaultMode);
  const [partialAmount, setPartialAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the confirmation draft when the dialog opens
    setChoice(defaultChoice);
    setMode(defaultMode);
    setPartialAmount("");
    setError(null);
  }, [defaultChoice, defaultMode, open]);

  const preview = useMemo(() => {
    if (choice === "paid") return { paidCents: totalCents, balanceCents: 0 };
    if (choice === "partial") {
      const paidCents = Math.max(Math.round((Number(partialAmount) || 0) * 100), 0);
      return { paidCents, balanceCents: Math.max(totalCents - paidCents, 0) };
    }
    return { paidCents: 0, balanceCents: totalCents };
  }, [choice, partialAmount, totalCents]);

  if (!open) return null;

  const partyRole = direction === "receivable" ? "customer" : "supplier";
  const outstandingLabel = direction === "receivable" ? "Customer outstanding" : "Supplier payable";

  function confirm() {
    setError(null);
    if (!choice) {
      setError("Select Paid, Unpaid, or Partially paid.");
      return;
    }
    if ((choice === "unpaid" || choice === "partial") && !creditAllowed) {
      setError(`Select or enter a ${partyRole} before saving credit or a remaining balance.`);
      return;
    }
    try {
      const payment = resolveBillPayment({
        choice,
        enteredPaidAmountCents: partialAmount.trim()
          ? Math.round(Number(partialAmount) * 100)
          : null,
        paymentMode: mode,
        totalCents,
      });
      onConfirm({ choice, payment });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment status could not be confirmed.");
    }
  }

  return (
    <div
      aria-labelledby="bill-payment-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
    >
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle id="bill-payment-confirmation-title">
            {direction === "receivable" ? "How was this bill paid?" : "How was this purchase paid?"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirm this before final posting. The selected status controls the payment entry, party ledger and remaining balance.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Party</span>
              <strong>{partyName.trim() || `Walk-in ${partyRole}`}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-lg font-semibold">
              <span>Bill total</span>
              <span>{money(totalCents)}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ChoiceButton
              active={choice === "paid"}
              description={direction === "receivable"
                ? "Payment receipt posts now; customer outstanding becomes zero."
                : "Supplier payment voucher posts now; payable becomes zero."}
              label="Paid in full"
              onClick={() => { setChoice("paid"); setPartialAmount(""); setError(null); }}
            />
            <ChoiceButton
              active={choice === "unpaid"}
              description={direction === "receivable"
                ? "The full bill is added to customer outstanding."
                : "The full purchase is added to supplier payable."}
              label="Unpaid / credit"
              onClick={() => { setChoice("unpaid"); setPartialAmount(""); setError(null); }}
            />
            <ChoiceButton
              active={choice === "partial"}
              description="The paid amount posts now and only the remaining balance stays outstanding."
              label="Partially paid"
              onClick={() => { setChoice("partial"); setError(null); }}
            />
          </div>

          {choice === "paid" || choice === "partial" ? (
            <label className="grid gap-2 text-sm font-medium">
              Payment mode
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setMode(event.target.value)}
                value={mode}
              >
                {paymentModes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          {choice === "partial" ? (
            <label className="grid gap-2 text-sm font-medium">
              Amount paid now
              <Input
                autoFocus
                inputMode="decimal"
                max={(totalCents - 1) / 100}
                min="0.01"
                onChange={(event) => setPartialAmount(event.target.value)}
                step="0.01"
                type="number"
                value={partialAmount}
              />
            </label>
          ) : null}

          <div className="grid gap-2 rounded-md border border-border p-4 text-sm">
            <SummaryRow label="Paid now" value={preview.paidCents} />
            <SummaryRow label={outstandingLabel} value={preview.balanceCents} strong />
          </div>

          {error ? (
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onCancel} type="button" variant="outline">Back to bill</Button>
            <Button onClick={confirm} type="button">Confirm and save accounting</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChoiceButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-md border p-4 text-left transition ${
        active
          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
          : "border-border bg-background hover:border-primary/50"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="block font-semibold">{label}</span>
      <span className="mt-2 block text-xs leading-5 text-muted-foreground">{description}</span>
    </button>
  );
}

function SummaryRow({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

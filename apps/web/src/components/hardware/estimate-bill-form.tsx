"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Plus, Save, Trash2, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateEstimateMoneyTotals } from "@/lib/hardware/estimate-money";
import { queueReservedTradeDraft } from "@/lib/offline-data";
import type { OfflineQueueScope } from "@/lib/offline-queue";
import type {
  HardwareEstimateEditData,
  HardwarePartySummary,
  HardwareProductSummary,
} from "@/server/hardware";
import { nextBillingLineAction } from "./billing-keyboard";
import { canPostBillingLines, completedBillingLines } from "./billing-lines";
import { CreatableCombobox } from "./creatable-combobox";
import { patchHardwareJson, postHardwareJson } from "./hardware-api-client";
import { HardwareProductCombobox } from "./hardware-product-combobox";
import { normalizeProductSearchText } from "./product-search";

type LocationOption = { id: string; name: string };
type EstimateLine = {
  discountPercent: string;
  gstRate: string;
  hsnCode: string;
  productId: string;
  productName: string;
  quantity: string;
  unitCode: string;
  unitRate: string;
};

const emptyLine: EstimateLine = {
  discountPercent: "0",
  gstRate: "0",
  hsnCode: "",
  productId: "",
  productName: "",
  quantity: "1",
  unitCode: "",
  unitRate: "",
};

export function EstimateBillForm({
  initialDocument,
  locations,
  offlineScope,
  parties,
  products,
}: {
  initialDocument?: HardwareEstimateEditData;
  locations: LocationOption[];
  offlineScope?: OfflineQueueScope;
  parties: HardwarePartySummary[];
  products: HardwareProductSummary[];
}) {
  const router = useRouter();
  const [availableParties, setAvailableParties] = useState(parties);
  const [customerId, setCustomerId] = useState(initialDocument?.customerId ?? "");
  const [customerName, setCustomerName] = useState(initialDocument?.customerName ?? "");
  const [customerAddress, setCustomerAddress] = useState(initialDocument?.customerAddress ?? "");
  const [documentDate, setDocumentDate] = useState(initialDocument?.documentDate ?? new Date().toISOString().slice(0, 10));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<EstimateLine[]>(
    initialDocument?.items.map((item) => ({
      discountPercent: String(item.discountPercent),
      gstRate: String(item.gstRate),
      hsnCode: item.hsnCode,
      productId: item.productId,
      productName: item.productName,
      quantity: String(item.quantity),
      unitCode: item.unitCode,
      unitRate: String(item.unitRateCents / 100),
    })) ?? [{ ...emptyLine }],
  );
  const [locationId, setLocationId] = useState(initialDocument?.locationId ?? locations[0]?.id ?? "");
  const [online, setOnline] = useState(true);
  const [paidAmount, setPaidAmount] = useState(
    initialDocument && initialDocument.paidAmountCents > 0
      ? String(initialDocument.paidAmountCents / 100)
      : "",
  );
  const [paymentMode, setPaymentMode] = useState(initialDocument?.paymentMode ?? "Cash");
  const [queuedDocumentNumber, setQueuedDocumentNumber] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState(initialDocument?.referenceNumber ?? "");
  const [taxMode, setTaxMode] = useState<"intra-state" | "inter-state">(initialDocument?.taxMode ?? "intra-state");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const discountInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const gstInputRefs = useRef<Array<HTMLSelectElement | null>>([]);
  const normalizedLines = useMemo(() => lines.map((line) => ({ ...line, rate: line.unitRate })), [lines]);
  const completedLines = useMemo(() => completedBillingLines(normalizedLines), [normalizedLines]);
  const canSaveEstimate = canPostBillingLines(normalizedLines) && completedLines.every(
    (line) => Number.isInteger(Number(line.quantity)) && Number(line.unitRate) > 0,
  );
  const totals = useMemo(() => calculateEstimateTotals(completedLines), [completedLines]);

  useEffect(() => {
    const updateOnlineState = () => setOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  function updateLine(index: number, patch: Partial<EstimateLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function clearProduct(index: number, query: string) {
    updateLine(index, {
      discountPercent: "0",
      gstRate: "0",
      hsnCode: "",
      productId: "",
      productName: query,
      unitCode: "",
      unitRate: "",
    });
  }

  function applyProduct(index: number, product: HardwareProductSummary) {
    updateLine(index, {
      discountPercent: formatRateBps(product.salesDiscountBps),
      gstRate: formatRateBps(product.gstRateBps ?? 0),
      hsnCode: product.hsnCode ?? "",
      productId: product.id,
      productName: product.name,
      unitCode: product.unitCode ?? "",
      unitRate: product.salesPriceCents > 0 ? String(product.salesPriceCents / 100) : "",
    });
    window.requestAnimationFrame(() => {
      const input = quantityInputRefs.current[index];
      input?.focus();
      input?.select();
    });
  }

  function focusProduct(index: number) {
    window.setTimeout(() => productInputRefs.current[index]?.focus(), 0);
  }

  function advanceFromQuantity(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    if (!lines[index]?.productId) {
      productInputRefs.current[index]?.focus();
      return;
    }
    const discountInput = discountInputRefs.current[index];
    discountInput?.focus();
    discountInput?.select();
  }

  function advanceFromDiscount(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    gstInputRefs.current[index]?.focus();
  }

  function advanceFromGst(index: number, event: KeyboardEvent<HTMLSelectElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) setLines((current) => [...current, { ...emptyLine }]);
    focusProduct(action.nextIndex);
  }

  async function resolveCustomer(allowCreate: boolean) {
    if (customerId) return customerId;
    const normalizedName = normalizeProductSearchText(customerName);
    if (!normalizedName) throw new Error("Enter or select a customer name.");
    const exact = availableParties.find(
      (party) => normalizeProductSearchText(party.name) === normalizedName,
    );
    if (exact) {
      setCustomerId(exact.id);
      setCustomerName(exact.name);
      return exact.id;
    }
    if (!allowCreate) {
      throw new Error("Offline Estimate Bills require an existing saved customer. Connect once to create this customer, then retry offline.");
    }
    const created = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
      name: customerName.trim(),
      role: "customer",
    });
    if (!created.ok) throw new Error(created.message);
    setAvailableParties((current) => [created.data, ...current]);
    setCustomerId(created.data.id);
    setCustomerName(created.data.name);
    return created.data.id;
  }

  function buildTradeInput(resolvedCustomerId: string) {
    const items = completedLines.map((line) => {
      const grossCents = Math.round(Number(line.quantity) * Number(line.unitRate) * 100);
      const discountCents = Math.round(grossCents * Number(line.discountPercent) / 100);
      return {
        discountCents,
        metadata: {
          discountPercent: Number(line.discountPercent) || 0,
          hsnCode: line.hsnCode || null,
          unitCode: line.unitCode || null,
        },
        productId: line.productId,
        quantity: Number(line.quantity),
        taxRateBps: Math.round(Number(line.gstRate) * 100),
        unitAmountCents: Math.round(Number(line.unitRate) * 100),
      };
    });
    const metadata = {
      customerAddress: customerAddress.trim() || null,
      documentDate,
      estimateBill: true,
      gstFilingEligible: completedLines.some((line) => Number(line.gstRate) > 0),
      paidAmountCents: paidAmount.trim()
        ? Math.round(Number(paidAmount) * 100)
        : paymentMode === "Credit"
          ? 0
          : totals.totalCents,
      paymentMode,
      referenceNumber: referenceNumber.trim() || null,
      stockMovementOnConfirm: true,
      taxMode,
    };
    return {
      currency: "INR",
      customerId: resolvedCustomerId,
      items,
      metadata,
      roundOffCents: totals.roundOffCents,
      type: "SALES_QUOTATION",
    };
  }

  async function queueOfflineEstimate(tradeInput: Record<string, unknown>) {
    if (!offlineScope) {
      throw new Error("Offline setup is unavailable for this session. Reopen the Estimate Bill from the installed ERP app while online.");
    }
    const queued = await queueReservedTradeDraft(offlineScope, {
      confirm: true,
      input: tradeInput,
      locationId,
      series: "HSQ",
    });
    setQueuedDocumentNumber(queued.documentNumber);
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed"));
  }

  async function saveAndPrint() {
    setServerError(null);
    if (!locationId) return setServerError("Select a stock location.");
    if (!canSaveEstimate) return setServerError("Select every product and enter valid quantity and rate. Untouched blank rows are allowed.");
    const enteredPaidCents = paidAmount.trim() ? Math.round(Number(paidAmount) * 100) : null;
    const paidAmountCents = enteredPaidCents ?? (paymentMode === "Credit" ? 0 : totals.totalCents);
    if (!Number.isFinite(paidAmountCents) || paidAmountCents < 0 || paidAmountCents > totals.totalCents) {
      return setServerError("Paid amount must be between zero and the Estimate Bill total.");
    }

    setSaving(true);
    try {
      const offlineNow = !navigator.onLine;
      if (initialDocument && offlineNow) {
        throw new Error("Existing Estimate Bills cannot be edited offline yet. Reconnect before updating this bill.");
      }
      const resolvedCustomerId = await resolveCustomer(!offlineNow);
      const tradeInput = buildTradeInput(resolvedCustomerId);
      if (offlineNow) {
        await queueOfflineEstimate(tradeInput);
        return;
      }

      const payload = {
        ...tradeInput,
        idempotencyKey,
        locationId,
      };
      const result = initialDocument
        ? await patchHardwareJson<{ id: string }>(
            `/api/hardware/trade/${initialDocument.id}/estimate`,
            payload,
          )
        : await postHardwareJson<{ id: string }>("/api/hardware/sales", payload);
      if (!result.ok) throw new Error(result.message);

      if (!initialDocument) {
        const confirmed = await postHardwareJson<{ id: string }>(
          `/api/hardware/trade/${result.data.id}/confirm`,
          { locationId },
        );
        if (!confirmed.ok) throw new Error(confirmed.message);
      }

      router.push(`/admin/hardware/print/${result.data.id}`);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Estimate Bill could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {!online && !initialDocument ? (
        <p className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          <WifiOff className="size-4 shrink-0" />
          Offline mode: this device will use its next reserved HSQ number and sync the final sale automatically after reconnection.
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{initialDocument ? `Edit ${initialDocument.documentNumber}` : "Estimate Bill details"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <CreatableCombobox
              createLabel="Use new customer"
              label="Customer"
              onCreate={(name) => {
                setCustomerId("");
                setCustomerName(name);
              }}
              onQueryChange={(query) => {
                setCustomerName(query);
                const exact = availableParties.find(
                  (party) => normalizeProductSearchText(party.name) === normalizeProductSearchText(query),
                );
                setCustomerId(exact?.id ?? "");
              }}
              onSelect={(id) => {
                const selected = availableParties.find((party) => party.id === id);
                setCustomerId(id);
                setCustomerName(selected?.name ?? "");
              }}
              options={availableParties.map((party) => ({
                id: party.id,
                keywords: [party.contact ?? ""],
                label: party.name,
              }))}
              placeholder="Search or enter customer"
              value={customerName}
            />
          </div>
          <Field label="Customer address">
            <Input onChange={(event) => setCustomerAddress(event.target.value)} value={customerAddress} />
          </Field>
          <Field label="Document date">
            <Input onChange={(event) => setDocumentDate(event.target.value)} type="date" value={documentDate} />
          </Field>
          <Field label="Customer reference">
            <Input onChange={(event) => setReferenceNumber(event.target.value)} value={referenceNumber} />
          </Field>
          <Field label="Tax treatment">
            <select className={selectClassName} onChange={(event) => setTaxMode(event.target.value as typeof taxMode)} value={taxMode}>
              <option value="intra-state">Intra-state (CGST + SGST)</option>
              <option value="inter-state">Inter-state (IGST)</option>
            </select>
          </Field>
          <Field label="Stock location">
            <select className={selectClassName} onChange={(event) => setLocationId(event.target.value)} value={locationId}>
              <option value="">Select stock location</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>
          <Field label="Payment mode">
            <select className={selectClassName} onChange={(event) => setPaymentMode(event.target.value)} value={paymentMode}>
              {["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other", "Credit"].map((option) => <option key={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Paid amount (blank = full for non-credit)">
            <Input inputMode="decimal" min="0" onChange={(event) => setPaidAmount(event.target.value)} step="0.01" type="number" value={paidAmount} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Items</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Product → Enter selects the first match without a mouse and restores its last discount/GST. Then Enter moves through quantity → discount → GST → next product.
            </p>
          </div>
          <Button onClick={() => { setLines((current) => [...current, { ...emptyLine }]); focusProduct(lines.length); }} type="button" variant="outline">
            <Plus className="size-4" />Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <fieldset className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-12" key={index}>
              <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
              <div className="lg:col-span-4">
                <HardwareProductCombobox
                  inputRef={(node) => { productInputRefs.current[index] = node; }}
                  label="Product"
                  onQueryChange={(query) => clearProduct(index, query)}
                  onSelect={(product) => applyProduct(index, product)}
                  products={products}
                  storageKey="trustfirst.hardware.estimate.product-search"
                  value={line.productName}
                />
              </div>
              <Field className="lg:col-span-1" label="Qty">
                <Input
                  ref={(node) => { quantityInputRefs.current[index] = node; }}
                  inputMode="numeric"
                  min="1"
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  onKeyDown={(event) => advanceFromQuantity(index, event)}
                  step="1"
                  type="number"
                  value={line.quantity}
                />
              </Field>
              <Field className="lg:col-span-1" label="Unit">
                <Input onChange={(event) => updateLine(index, { unitCode: event.target.value })} value={line.unitCode} />
              </Field>
              <Field className="lg:col-span-2" label="Rate">
                <Input inputMode="decimal" min="0" onChange={(event) => updateLine(index, { unitRate: event.target.value })} step="0.01" type="number" value={line.unitRate} />
              </Field>
              <Field className="lg:col-span-1" label="Disc. %">
                <Input
                  ref={(node) => { discountInputRefs.current[index] = node; }}
                  inputMode="decimal"
                  max="100"
                  min="0"
                  onChange={(event) => updateLine(index, { discountPercent: event.target.value })}
                  onKeyDown={(event) => advanceFromDiscount(index, event)}
                  step="0.01"
                  type="number"
                  value={line.discountPercent}
                />
              </Field>
              <Field className="lg:col-span-1" label="GST %">
                <select
                  ref={(node) => { gstInputRefs.current[index] = node; }}
                  className={selectClassName}
                  onChange={(event) => updateLine(index, { gstRate: event.target.value })}
                  onKeyDown={(event) => advanceFromGst(index, event)}
                  value={line.gstRate}
                >
                  {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </Field>
              <div className="flex items-end lg:col-span-1">
                <Button aria-label={`Remove item ${index + 1}`} className="w-full" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} type="button" variant="ghost">
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Field className="lg:col-span-2" label="HSN / SAC">
                <Input onChange={(event) => updateLine(index, { hsnCode: event.target.value })} value={line.hsnCode} />
              </Field>
              <div className="flex items-end justify-end text-sm font-semibold lg:col-span-10">
                Line total: {money(calculateLineTotal(line))}
              </div>
            </fieldset>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <Field label="Automatic round-off">
            <Input className="max-w-48" readOnly value={(totals.roundOffCents / 100).toFixed(2)} />
          </Field>
          <dl className="space-y-2 text-sm">
            <TotalRow label="Gross value" value={totals.grossCents} />
            <TotalRow label="Line discounts" value={-totals.discountCents} />
            <TotalRow label="Taxable value" value={totals.taxableCents} />
            <TotalRow label="GST" value={totals.taxCents} />
            <TotalRow label="Round-off" value={totals.roundOffCents} />
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Grand total</dt><dd>{money(totals.totalCents)}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {queuedDocumentNumber ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          Estimate Bill <strong>{queuedDocumentNumber}</strong> is saved safely on this device. It will sync automatically in number order after the internet returns. Server print/PDF becomes available after sync.
        </p>
      ) : null}
      {serverError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p> : null}
      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-md border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <span className="text-xs text-muted-foreground">
          {!online && !initialDocument ? "Reserved offline HSQ numbering active" : "Online validation and posting active"}
        </span>
        <Button disabled={saving || Boolean(queuedDocumentNumber)} onClick={saveAndPrint} type="button">
          <Save className="size-4" />
          {saving
            ? "Saving..."
            : queuedDocumentNumber
              ? `${queuedDocumentNumber} queued`
              : initialDocument
                ? "Update and print Estimate Bill"
                : online
                  ? "Save and print Estimate Bill"
                  : "Save Estimate Bill offline"}
        </Button>
      </div>
    </div>
  );
}

function isPlainEnter(event: KeyboardEvent<HTMLElement>) {
  return event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
}

function formatRateBps(value: number) {
  return String(value / 100);
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return <label className={`grid content-start gap-1.5 text-sm font-medium ${className ?? ""}`}><span>{label}</span>{children}</label>;
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd>{money(value)}</dd></div>;
}

function calculateLineTotal(line: EstimateLine) {
  const gross = Math.round((Number(line.quantity) || 0) * (Number(line.unitRate) || 0) * 100);
  const discount = Math.round(gross * (Number(line.discountPercent) || 0) / 100);
  const taxable = Math.max(gross - discount, 0);
  const tax = Math.round(taxable * (Number(line.gstRate) || 0) / 100);
  return taxable + tax;
}

function calculateEstimateTotals(lines: EstimateLine[]) {
  return calculateEstimateMoneyTotals(lines.map((line) => {
    const grossCents = Math.round((Number(line.quantity) || 0) * (Number(line.unitRate) || 0) * 100);
    return {
      discountCents: Math.round(grossCents * (Number(line.discountPercent) || 0) / 100),
      quantity: Number(line.quantity) || 0,
      taxRateBps: Math.round((Number(line.gstRate) || 0) * 100),
      unitAmountCents: Math.round((Number(line.unitRate) || 0) * 100),
    };
  }));
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

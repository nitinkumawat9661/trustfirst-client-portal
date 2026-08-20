"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import type { HardwareBillEditData, HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";
import { nextBillingLineAction } from "./billing-keyboard";
import { patchHardwareJson } from "./hardware-api-client";
import { HardwareProductCombobox } from "./hardware-product-combobox";

type EditLine = HardwareBillEditData["items"][number];

const paymentModes = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"] as const;

export function HardwareBillEditForm({
  bill,
  locations,
  parties,
  products,
}: {
  bill: HardwareBillEditData;
  locations: Array<{ id: string; name: string }>;
  parties: HardwarePartySummary[];
  products: HardwareProductSummary[];
}) {
  const router = useRouter();
  const purchase = bill.type === "PURCHASE_ENTRY" || bill.type === "SUPPLIER_BILL";
  const [partyId, setPartyId] = useState(bill.customerId);
  const [documentDate, setDocumentDate] = useState(bill.documentDate);
  const [customerAddress, setCustomerAddress] = useState(bill.customerAddress);
  const [referenceNumber, setReferenceNumber] = useState(bill.referenceNumber);
  const [notes, setNotes] = useState(bill.notes);
  const [taxMode, setTaxMode] = useState(bill.taxMode);
  const [locationId, setLocationId] = useState(bill.locationId);
  const [invoiceDiscount, setInvoiceDiscount] = useState(String(bill.invoiceDiscountCents / 100));
  const [roundOff, setRoundOff] = useState(String(bill.roundOffCents / 100));
  const [paidAmount, setPaidAmount] = useState(String(bill.paidAmountCents / 100));
  const [paymentMode, setPaymentMode] = useState(normalizePaymentMode(bill.paymentMode));
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<EditLine[]>(bill.items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const discountInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const gstInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const totals = useMemo(() => calculateTotals(lines, roundOff, purchase ? "0" : invoiceDiscount), [invoiceDiscount, lines, purchase, roundOff]);

  function updateLine(index: number, patch: Partial<EditLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function applyProduct(index: number, product: HardwareProductSummary) {
    updateLine(index, {
      gstRate: product.gstRateBps ? product.gstRateBps / 100 : 0,
      hsnCode: product.hsnCode ?? "",
      productId: product.id,
      productName: product.name,
      unitCode: product.unitCode ?? "",
      unitRateCents: purchase ? product.purchaseCostCents : product.salesPriceCents,
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
    const line = lines[index];
    if (!line?.productId) {
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
    const gstInput = gstInputRefs.current[index];
    gstInput?.focus();
    gstInput?.select();
  }

  function advanceFromGst(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) {
      setLines((current) => [...current, emptyLine()]);
    }
    focusProduct(action.nextIndex);
  }

  async function save() {
    setError(null);
    if (!locationId) return setError("Select a stock location.");
    if (purchase && !partyId) return setError("Select a supplier.");
    if (reason.trim().length < 3) return setError("Enter a reason for this correction (at least 3 characters).");
    if (!lines.length || lines.some((line) => !line.productId || line.quantity <= 0 || line.unitRateCents < 0)) {
      return setError("Every line needs a product, positive quantity, and valid rate.");
    }
    const paidAmountCents = Math.round(Number(paidAmount) * 100);
    if (!Number.isFinite(paidAmountCents) || paidAmountCents < 0) return setError("Paid amount must be zero or higher.");

    setSaving(true);
    const idempotencyKey = `bill-edit-${bill.id}-${Date.now()}`;
    const result = await patchHardwareJson<{ id: string }>(`/api/hardware/trade/${bill.id}/bill`, {
      currency: "INR",
      ...(purchase ? { supplierId: partyId } : { customerId: partyId || undefined }),
      idempotencyKey,
      invoiceDiscountCents: Math.max(Math.round(Number(invoiceDiscount || 0) * 100), 0),
      items: lines.map((line) => {
        const grossCents = line.quantity * line.unitRateCents;
        return {
          discountCents: Math.round(grossCents * line.discountPercent / 100),
          metadata: { discountPercent: line.discountPercent, hsnCode: line.hsnCode || null, unitCode: line.unitCode || null },
          productId: line.productId,
          quantity: line.quantity,
          taxRateBps: Math.round(line.gstRate * 100),
          unitAmountCents: line.unitRateCents,
        };
      }),
      locationId,
      metadata: {
        customerAddress: purchase ? null : customerAddress.trim() || null,
        documentDate,
        estimateBill: bill.type === "SALES_QUOTATION",
        notes: notes.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        taxMode,
      },
      paidAmountCents,
      paymentMode: paidAmountCents > 0 ? paymentMode : undefined,
      reason: reason.trim(),
      roundOffCents: Math.round(Number(roundOff || 0) * 100),
      type: bill.type,
    });
    setSaving(false);
    if (!result.ok) return setError(result.message);
    router.push(`/admin/hardware/print/${bill.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>{displayName(bill.type)} correction</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Document number (locked)">
            <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 font-medium" data-testid="locked-document-number">{bill.documentNumber}</div>
          </Field>
          {bill.invoiceNumber ? <Field label="Invoice number (locked)"><div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 font-medium">{bill.invoiceNumber}</div></Field> : null}
          <Field label={purchase ? "Supplier" : "Customer"}>
            <select className={selectClassName} onChange={(event) => setPartyId(event.target.value)} value={partyId}>
              {!purchase ? <option value="">Walk-in customer</option> : <option value="">Select supplier</option>}
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </Field>
          <Field label="Document date"><Input onChange={(event) => setDocumentDate(event.target.value)} type="date" value={documentDate} /></Field>
          <Field label={purchase ? "Supplier reference" : "Customer reference"}><Input onChange={(event) => setReferenceNumber(event.target.value)} value={referenceNumber} /></Field>
          {!purchase ? <Field label="Customer address"><Input onChange={(event) => setCustomerAddress(event.target.value)} value={customerAddress} /></Field> : null}
          <Field label="Stock location">
            <select className={selectClassName} onChange={(event) => setLocationId(event.target.value)} value={locationId}>
              <option value="">Select location</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>
          <Field label="Tax treatment"><select className={selectClassName} onChange={(event) => setTaxMode(event.target.value as typeof taxMode)} value={taxMode}><option value="intra-state">Intra-state (CGST + SGST)</option><option value="inter-state">Inter-state (IGST)</option></select></Field>
          <Field label="Paid amount (INR)"><Input min="0" onChange={(event) => setPaidAmount(event.target.value)} step="0.01" type="number" value={paidAmount} /><span className="text-xs text-muted-foreground">Previously posted: {money(bill.alreadyPaidAmountCents)}. Reductions are retained as auditable corrections; overpayment becomes credit automatically.</span></Field>
          <Field label="Payment mode"><select className={selectClassName} onChange={(event) => setPaymentMode(event.target.value as typeof paymentMode)} value={paymentMode}>{paymentModes.map((mode) => <option key={mode} value={mode}>{humanize(mode)}</option>)}</select></Field>
          <Field label="Notes"><Input onChange={(event) => setNotes(event.target.value)} value={notes} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Line items</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Press Enter to move through product, quantity, discount, GST, and then directly to the next item, matching new bill entry.</p>
          </div>
          <Button onClick={() => setLines((current) => [...current, emptyLine()])} size="sm" type="button" variant="outline"><Plus className="size-4" />Add line</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <fieldset className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-12" key={`${index}-${line.productId}`}>
              <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
              <div className="lg:col-span-4">
                <HardwareProductCombobox
                  inputRef={(node) => { productInputRefs.current[index] = node; }}
                  label="Product"
                  onQueryChange={(query) => updateLine(index, { productId: "", productName: query })}
                  onSelect={(product) => applyProduct(index, product)}
                  products={products}
                  storageKey={`trustfirst.hardware.bill-edit.${purchase ? "purchase" : "sale"}`}
                  value={line.productName}
                />
              </div>
              <Field className="lg:col-span-1" label="Qty"><Input ref={(node) => { quantityInputRefs.current[index] = node; }} min="1" onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} onKeyDown={(event) => advanceFromQuantity(index, event)} step="1" type="number" value={line.quantity} /></Field>
              <Field className="lg:col-span-1" label="Unit"><Input onChange={(event) => updateLine(index, { unitCode: event.target.value })} value={line.unitCode} /></Field>
              <Field className="lg:col-span-2" label="Rate"><Input min="0" onChange={(event) => updateLine(index, { unitRateCents: Math.round(Number(event.target.value) * 100) })} step="0.01" type="number" value={line.unitRateCents / 100} /></Field>
              <Field className="lg:col-span-1" label="Disc. %"><Input ref={(node) => { discountInputRefs.current[index] = node; }} max="100" min="0" onChange={(event) => updateLine(index, { discountPercent: Number(event.target.value) })} onKeyDown={(event) => advanceFromDiscount(index, event)} step="0.01" type="number" value={line.discountPercent} /></Field>
              <Field className="lg:col-span-1" label="GST %"><Input ref={(node) => { gstInputRefs.current[index] = node; }} max="100" min="0" onChange={(event) => updateLine(index, { gstRate: Number(event.target.value) })} onKeyDown={(event) => advanceFromGst(index, event)} step="0.01" type="number" value={line.gstRate} /></Field>
              <Field className="lg:col-span-1" label="HSN"><Input onChange={(event) => updateLine(index, { hsnCode: event.target.value })} value={line.hsnCode} /></Field>
              <div className="flex items-end lg:col-span-1"><Button aria-label={`Remove item ${index + 1}`} className="w-full" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} type="button" variant="ghost"><Trash2 className="size-4" /></Button></div>
            </fieldset>
          ))}
        </CardContent>
      </Card>

      <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><div className="space-y-4">{!purchase ? <Field label="Invoice discount (INR)"><Input min="0" onChange={(event) => setInvoiceDiscount(event.target.value)} step="0.01" type="number" value={invoiceDiscount} /></Field> : null}<Field label="Round-off (INR)"><Input onChange={(event) => setRoundOff(event.target.value)} step="0.01" type="number" value={roundOff} /></Field><Field label="Required correction reason"><textarea className="min-h-24 rounded-md border border-input bg-background p-3 text-sm" onChange={(event) => setReason(event.target.value)} placeholder="Why is this confirmed bill being corrected?" value={reason} /></Field></div><dl className="space-y-2 text-sm"><Total label="Subtotal" value={totals.subtotalCents} /><Total label="Discount" value={-totals.discountCents} /><Total label="GST" value={totals.taxCents} /><Total label="Round-off" value={totals.roundOffCents} /><div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Corrected total</dt><dd>{money(totals.totalCents)}</dd></div>{totals.totalCents < bill.alreadyPaidAmountCents ? <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">A {purchase ? "supplier" : "customer"} credit of {money(bill.alreadyPaidAmountCents - totals.totalCents)} will be posted automatically.</p> : null}</dl></CardContent></Card>
      {error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <div className="flex justify-end"><Button data-testid="save-bill-edit" disabled={saving} onClick={save} type="button"><Save className="size-4" />{saving ? "Saving correction..." : "Save correction"}</Button></div>
    </div>
  );
}

function Field({ children, className = "", label }: { children: React.ReactNode; className?: string; label: string }) { return <label className={`grid content-start gap-1.5 text-sm font-medium ${className}`}><span>{label}</span>{children}</label>; }
function Total({ label, value }: { label: string; value: number }) { return <div className="flex justify-between"><dt className="text-muted-foreground">{label}</dt><dd>{money(value)}</dd></div>; }
function emptyLine(): EditLine { return { discountPercent: 0, gstRate: 0, hsnCode: "", productId: "", productName: "", quantity: 1, unitCode: "", unitRateCents: 0 }; }
function calculateTotals(lines: EditLine[], roundOff: string, invoiceDiscount: string) { const base = lines.reduce((sum, line) => { const gross = line.quantity * line.unitRateCents; const discount = Math.round(gross * line.discountPercent / 100); const taxable = Math.max(gross - discount, 0); return { discountCents: sum.discountCents + discount, subtotalCents: sum.subtotalCents + gross, taxCents: sum.taxCents + Math.round(taxable * line.gstRate / 100), taxableCents: sum.taxableCents + taxable }; }, { discountCents: 0, subtotalCents: 0, taxCents: 0, taxableCents: 0 }); const invoiceDiscountCents = Math.max(Math.round(Number(invoiceDiscount || 0) * 100), 0); const roundOffCents = Math.round(Number(roundOff || 0) * 100); return { ...base, discountCents: base.discountCents + invoiceDiscountCents, roundOffCents, totalCents: Math.max(base.taxableCents + base.taxCents + roundOffCents - invoiceDiscountCents, 0) }; }
function isPlainEnter(event: KeyboardEvent<HTMLElement>) { return event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey; }
function normalizePaymentMode(value: string) { const normalized = value.toUpperCase().replaceAll(" ", "_"); return paymentModes.includes(normalized as typeof paymentModes[number]) ? normalized as typeof paymentModes[number] : "CASH"; }
function displayName(type: HardwareBillEditData["type"]) { if (type === "SALES_QUOTATION") return "Estimate Bill"; if (type === "PURCHASE_ENTRY" || type === "SUPPLIER_BILL") return "Purchase Bill"; return "Sales Bill"; }
function humanize(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^./u, (character) => character.toUpperCase()); }
function money(value: number) { return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value / 100); }
const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const hardwareBillEditFormTestUtils = { calculateTotals };

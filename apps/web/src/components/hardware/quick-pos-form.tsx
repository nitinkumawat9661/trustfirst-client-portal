"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Check, FileText, MessageCircle, Printer, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";
import { resolveBillPayment, type BillPaymentChoice } from "../../lib/hardware/payment-choice";
import { buildWhatsAppBillUrl } from "@/server/hardware/whatsapp";
import { nextBillingLineAction } from "./billing-keyboard";
import { canPostBillingLines, completedBillingLines } from "./billing-lines";
import { CreatableCombobox } from "./creatable-combobox";
import { HardwareProductCombobox } from "./hardware-product-combobox";
import { normalizeProductSearchText } from "./product-search";
import { postHardwareJson } from "./hardware-api-client";

type LocationOption = { id: string; name: string };
type LookupOption = { id: string; name: string };
type UnitOption = { code: string; id: string; name: string };
type FirmPrintDetails = {
  address: string | null;
  email: string | null;
  firmName: string;
  gstin: string | null;
  phone: string | null;
  tagline: string;
  termsFooter: string;
};
type PosLine = {
  barcode: string | null;
  discountPercent: string;
  gstRate: string;
  hsnCode: string | null;
  productId: string;
  productName: string;
  quantity: string;
  rate: string;
  sku: string | null;
  unitCode: string | null;
};
type PostedSale = {
  documentId: string;
  documentNumber: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  paymentStatus: string;
  totalCents: number;
};

const emptyLine: PosLine = {
  barcode: null,
  discountPercent: "0",
  gstRate: "0",
  hsnCode: null,
  productId: "",
  productName: "",
  quantity: "1",
  rate: "",
  sku: null,
  unitCode: null,
};

export function QuickPosForm({
  customers,
  brands,
  cashierName,
  categories,
  defaultFirm,
  locations,
  productSearchStorageKey,
  products,
  units,
}: {
  brands: LookupOption[];
  cashierName: string;
  categories: LookupOption[];
  customers: HardwarePartySummary[];
  defaultFirm: FirmPrintDetails;
  locations: LocationOption[];
  productSearchStorageKey: string;
  products: HardwareProductSummary[];
  units: UnitOption[];
}) {
  const [availableProducts, setAvailableProducts] = useState(products);
  const [availableCustomers, setAvailableCustomers] = useState(customers);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [lines, setLines] = useState<PosLine[]>([{ ...emptyLine }]);
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<BillPaymentChoice>("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posted, setPosted] = useState<PostedSale | null>(null);
  const [postingPrint, setPostingPrint] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ index: number; name: string } | null>(null);
  const [quickCustomer, setQuickCustomer] = useState<string | null>(null);
  const [whatsAppMobile, setWhatsAppMobile] = useState("");
  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const discountInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const gstInputRefs = useRef<Array<HTMLSelectElement | null>>([]);
  const completedLines = useMemo(() => completedBillingLines(lines), [lines]);
  const canPost = canPostBillingLines(lines);
  const totals = useMemo(
    () => calculateTotals(completedLines, paid, invoiceDiscount, paymentChoice),
    [completedLines, invoiceDiscount, paid, paymentChoice],
  );
  const pendingStockProducts = completedLines
    .map((line) => availableProducts.find((product) => product.id === line.productId))
    .filter((product): product is HardwareProductSummary => product?.stockSetupStatus === "PENDING");

  function updateLine(index: number, patch: Partial<PosLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function clearProductSelection(index: number, productName: string) {
    updateLine(index, {
      barcode: null,
      discountPercent: "0",
      gstRate: "0",
      hsnCode: null,
      productId: "",
      productName,
      rate: "",
      sku: null,
      unitCode: null,
    });
  }

  function applyProduct(index: number, product: HardwareProductSummary) {
    updateLine(index, {
      barcode: product.barcode,
      discountPercent: formatRateBps(product.salesDiscountBps),
      gstRate: formatRateBps(product.gstRateBps ?? 0),
      hsnCode: product.hsnCode,
      productId: product.id,
      productName: product.name,
      rate: product.salesPriceCents > 0 ? String(product.salesPriceCents / 100) : "",
      sku: product.sku,
      unitCode: product.unitCode,
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
    gstInputRefs.current[index]?.focus();
  }

  function advanceFromGst(index: number, event: KeyboardEvent<HTMLSelectElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) {
      setLines((current) => [...current, { ...emptyLine }]);
    }
    focusProduct(action.nextIndex);
  }

  async function postBill(options: { printAfterPost?: boolean } = {}) {
    setServerError(null);
    setPrintStatus(null);
    let resolvedPayment: ReturnType<typeof resolveBillPayment>;
    try {
      resolvedPayment = resolveBillPayment({
        choice: paymentChoice,
        enteredPaidAmountCents: paid.trim() ? Math.round(Number(paid) * 100) : null,
        paymentMode,
        totalCents: totals.totalCents,
      });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Select the bill payment status.");
      return;
    }
    setSaving(true);
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customerName.trim()) {
      const normalizedName = normalizeProductSearchText(customerName);
      const exactCustomer = availableCustomers.find(
        (customer) => normalizeProductSearchText(customer.name) === normalizedName,
      );
      if (exactCustomer) {
        resolvedCustomerId = exactCustomer.id;
        setCustomerId(exactCustomer.id);
        setCustomerName(exactCustomer.name);
      } else {
        const createdCustomer = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
          name: customerName.trim(),
          role: "customer",
        });
        if (!createdCustomer.ok) {
          setSaving(false);
          setServerError(createdCustomer.message);
          return;
        }
        resolvedCustomerId = createdCustomer.data.id;
        setAvailableCustomers((current) => [createdCustomer.data, ...current]);
        setCustomerId(createdCustomer.data.id);
        setCustomerName(createdCustomer.data.name);
      }
    }
    const result = await postHardwareJson<PostedSale>("/api/hardware/pos/sale", {
      clientTotalCents: totals.totalCents,
      ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
      ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
      idempotencyKey,
      invoiceDiscountCents: totals.invoiceDiscountCents,
      items: completedLines.map((line) => {
        const grossCents = Math.round(Number(line.quantity) * Number(line.rate) * 100);
        return {
          discountCents: Math.round(grossCents * Number(line.discountPercent) / 100),
          metadata: {
            barcode: line.barcode,
            discountPercent: Number(line.discountPercent) || 0,
            hsnCode: line.hsnCode,
            sku: line.sku,
            unitCode: line.unitCode,
          },
          productId: line.productId,
          quantity: Number(line.quantity),
          taxRateBps: Math.round(Number(line.gstRate) * 100),
          unitAmountCents: Math.round(Number(line.rate) * 100),
        };
      }),
      locationId,
      notes: notes.trim() || undefined,
      paidAmountCents: resolvedPayment.paidAmountCents,
      paymentMode: resolvedPayment.paidAmountCents > 0 ? resolvedPayment.paymentMode : undefined,
      roundOffCents: totals.roundOffCents,
      taxMode: "intra-state",
    });
    setSaving(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setPosted(result.data);
    setConfirmed(true);
    if (options.printAfterPost) {
      printCurrentBill({ postedSale: result.data });
    }
  }

  const selectedCustomer = availableCustomers.find((customer) => customer.id === customerId);
  const waUrl = buildWhatsAppBillUrl({
    balanceCents: totals.balanceCents,
    firmName: defaultFirm.firmName,
    invoiceNumber: posted?.invoiceNumber ?? posted?.documentNumber ?? "Draft bill",
    mobile: whatsAppMobile || selectedCustomer?.contact || "",
    paidCents: totals.paidCents,
    totalCents: totals.totalCents,
  });
  const preview = buildBillPreview({
    cashierName,
    customer: selectedCustomer,
    customerAddress,
    customerName,
    firm: defaultFirm,
    lines: completedLines,
    notes,
    paidCents: totals.paidCents,
    paymentMode,
    posted,
    totals,
  });

  function printCurrentBill(input?: { postedSale?: PostedSale; test?: boolean }) {
    const bill = input?.test
      ? buildTestPrintPreview({ cashierName, firm: defaultFirm })
      : {
          ...preview,
          documentNumber: input?.postedSale?.invoiceNumber ?? input?.postedSale?.documentNumber ?? preview.documentNumber,
          statusLabel: input?.postedSale ? "FINAL INVOICE" : preview.statusLabel,
        };
    setPrintStatus(openA4PrintWindow(bill));
  }

  async function postAndPrint() {
    if (confirmed && posted) {
      printCurrentBill({ postedSale: posted });
      return;
    }
    setPostingPrint(true);
    await postBill({ printAfterPost: true });
    setPostingPrint(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Fast bill</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <CreatableCombobox
                createLabel="Use new customer"
                label="Customer"
                onCreate={(name) => {
                  setCustomerId("");
                  setCustomerName(name);
                  setQuickCustomer(name);
                }}
                onQueryChange={(query) => {
                  setCustomerName(query);
                  const exact = availableCustomers.find(
                    (customer) => normalizeProductSearchText(customer.name) === normalizeProductSearchText(query),
                  );
                  setCustomerId(exact?.id ?? "");
                }}
                onSelect={(id) => {
                  const selected = availableCustomers.find((customer) => customer.id === id);
                  setCustomerId(id);
                  setCustomerName(selected?.name ?? "");
                }}
                options={availableCustomers.map((customer) => ({ id: customer.id, keywords: [customer.contact ?? ""], label: customer.name }))}
                placeholder="Walk-in customer or type customer name"
                value={customerName || selectedCustomer?.name || ""}
              />
              <p className="mt-1 text-xs text-muted-foreground">A new name is saved automatically as a customer when the bill is posted.</p>
              <button className="mt-2 text-xs font-medium text-primary" onClick={() => { setCustomerId(""); setCustomerName(""); }} type="button">Use walk-in customer</button>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Address
              <Input autoComplete="street-address" placeholder="Address for this bill" value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Stock location
              <select className={selectClassName} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Items</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Type a product and press Enter. The first match is selected without a mouse, the last saved discount and GST are filled, then Enter moves through quantity, discount, GST, and the next product.</p>
            </div>
            <Button onClick={() => setLines((current) => [...current, { ...emptyLine }])} type="button" variant="outline">Add line</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, index) => (
              <fieldset className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-12" key={index}>
                <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
                <div className="md:col-span-5">
                  <HardwareProductCombobox
                    inputRef={(node) => { productInputRefs.current[index] = node; }}
                    label="Product name / SKU"
                    onCreate={(name) => setQuickAdd({ index, name })}
                    onQueryChange={(query) => clearProductSelection(index, query)}
                    onSelect={(product) => applyProduct(index, product)}
                    products={availableProducts}
                    storageKey={productSearchStorageKey}
                    value={line.productName}
                  />
                </div>
                <NumberField
                  className="md:col-span-1"
                  inputRef={(node) => { quantityInputRefs.current[index] = node; }}
                  label="Qty"
                  onChange={(value) => updateLine(index, { quantity: value })}
                  onKeyDown={(event) => advanceFromQuantity(index, event)}
                  value={line.quantity}
                />
                <NumberField label="Rate" value={line.rate} onChange={(value) => updateLine(index, { rate: value })} className="md:col-span-2" />
                <NumberField
                  className="md:col-span-1"
                  inputRef={(node) => { discountInputRefs.current[index] = node; }}
                  label="Disc. %"
                  onChange={(value) => updateLine(index, { discountPercent: value })}
                  onKeyDown={(event) => advanceFromDiscount(index, event)}
                  value={line.discountPercent}
                />
                <label className="grid gap-2 text-sm font-medium md:col-span-1">
                  GST %
                  <select
                    ref={(node) => { gstInputRefs.current[index] = node; }}
                    className={selectClassName}
                    value={line.gstRate}
                    onChange={(event) => updateLine(index, { gstRate: event.target.value })}
                    onKeyDown={(event) => advanceFromGst(index, event)}
                  >
                    {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </label>
                <div className="flex items-end md:col-span-2">
                  <Button aria-label={`Remove item ${index + 1}`} className="w-full" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} type="button" variant="ghost">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </fieldset>
            ))}
          </CardContent>
        </Card>
        {serverError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p> : null}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle>A4 invoice</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">All bills print in A4 portrait. Thermal formats have been removed.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setPreviewOpen((current) => !current)} type="button" variant="outline">{previewOpen ? "Hide preview" : "Preview A4"}</Button>
              <Button onClick={() => printCurrentBill({ test: true })} type="button" variant="outline">Test A4</Button>
            </div>
            {printStatus ? <p className="rounded-md border border-border bg-muted p-2 text-xs" role="status">{printStatus}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Preview bill</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <TotalRow label="Subtotal" value={totals.subtotalCents} />
            <TotalRow label="Discount" value={-totals.discountCents} />
            <label className="grid gap-2 font-medium">
              Invoice discount
              <Input inputMode="decimal" min="0" step="0.01" type="number" value={invoiceDiscount} onChange={(event) => setInvoiceDiscount(event.target.value)} />
            </label>
            <TotalRow label="GST" value={totals.taxCents} />
            <TotalRow label="Round-off" value={totals.roundOffCents} />
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span>{money(totals.totalCents)}</span></div>
            <label className="grid gap-2 font-medium">
              Payment status
              <select
                className={selectClassName}
                value={paymentChoice}
                onChange={(event) => {
                  const choice = event.target.value as BillPaymentChoice;
                  setPaymentChoice(choice);
                  if (choice !== "partial") setPaid("");
                }}
              >
                <option value="">Select paid or unpaid</option>
                <option value="unpaid">Unpaid / credit</option>
                <option value="paid">Paid in full</option>
                <option value="partial">Partially paid</option>
              </select>
            </label>
            {paymentChoice === "paid" || paymentChoice === "partial" ? (
              <label className="grid gap-2 font-medium">
                Payment mode
                <select className={selectClassName} value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            ) : null}
            {paymentChoice === "partial" ? (
              <label className="grid gap-2 font-medium">
                Paid amount
                <Input inputMode="decimal" min="0.01" step="0.01" type="number" value={paid} onChange={(event) => setPaid(event.target.value)} />
              </label>
            ) : null}
            {paymentChoice === "paid" ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
                Full payment of {money(totals.totalCents)} will be recorded.
              </p>
            ) : null}
            {paymentChoice === "unpaid" ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                The full balance will remain outstanding for this customer.
              </p>
            ) : null}
            <TotalRow label="Balance" value={totals.balanceCents} />
            <label className="grid gap-2 font-medium">
              Notes
              <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <Button className="w-full" disabled={saving || confirmed || !canPost || !locationId || !paymentChoice} onClick={() => postBill()} type="button">
              <Check className="size-4" />{saving ? "Posting..." : confirmed ? "Posted" : "Post bill"}
            </Button>
            <Button className="w-full" disabled={saving || postingPrint || (!confirmed && (!canPost || !locationId || !paymentChoice))} onClick={postAndPrint} type="button" variant="outline">
              <Printer className="size-4" />{postingPrint ? "Posting..." : confirmed ? "Print A4 invoice" : "Post and print A4"}
            </Button>
          </CardContent>
        </Card>
        {previewOpen ? <BillPreviewCard bill={preview} /> : null}
        {pendingStockProducts.length ? (
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <p className="font-medium">This product needs stock setup.</p>
              {pendingStockProducts.map((product) => <p className="text-muted-foreground" key={product.id}>{product.name}</p>)}
              <div className="flex gap-2">
                <Button asChild size="sm"><Link href="/admin/hardware/stock?setup=1">Update now</Link></Button>
                <Button size="sm" type="button" variant="outline">Later</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {confirmed && posted ? (
          <Card>
            <CardHeader><CardTitle>After issue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" variant="outline"><Link href={`/admin/hardware/print/${posted.documentId}`}><FileText className="size-4" />Open A4 invoice</Link></Button>
              <Button className="w-full" onClick={() => printCurrentBill({ postedSale: posted })} type="button" variant="outline"><Printer className="size-4" />Print A4 invoice</Button>
              <Input placeholder="WhatsApp mobile if customer has none" value={whatsAppMobile} onChange={(event) => setWhatsAppMobile(event.target.value)} />
              <Button asChild className="w-full" disabled={!waUrl}>
                <a href={waUrl ?? "#"} rel="noreferrer" target="_blank"><MessageCircle className="size-4" />Send to WhatsApp</a>
              </Button>
              <p className="text-xs text-muted-foreground">WhatsApp opened. Message delivery is not automated.</p>
            </CardContent>
          </Card>
        ) : null}
      </aside>

      {quickAdd ? (
        <QuickAddDialog
          initialName={quickAdd.name}
          initialRate={lines[quickAdd.index]?.rate ?? ""}
          brands={brands}
          categories={categories}
          locations={locations}
          onClose={() => setQuickAdd(null)}
          onCreated={(product) => {
            setAvailableProducts((current) => [product, ...current]);
            applyProduct(quickAdd.index, product);
            setQuickAdd(null);
          }}
          units={units}
        />
      ) : null}
      {quickCustomer ? (
        <QuickPartyDialog
          initialName={quickCustomer}
          onClose={() => setQuickCustomer(null)}
          onCreated={(party) => {
            setAvailableCustomers((current) => [party, ...current.filter((customer) => customer.id !== party.id)]);
            setCustomerId(party.id);
            setCustomerName(party.name);
            setQuickCustomer(null);
          }}
          role="customer"
        />
      ) : null}
    </div>
  );
}

function QuickAddDialog({
  initialName,
  initialRate,
  brands,
  categories,
  locations,
  onClose,
  onCreated,
  units,
}: {
  brands: LookupOption[];
  categories: LookupOption[];
  initialName: string;
  initialRate: string;
  locations: LocationOption[];
  onClose: () => void;
  onCreated: (product: HardwareProductSummary) => void;
  units: UnitOption[];
}) {
  const [availableBrands, setAvailableBrands] = useState(brands);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [availableUnits, setAvailableUnits] = useState(units);
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [name, setName] = useState(initialName);
  const [purchaseRate, setPurchaseRate] = useState("");
  const [rate, setRate] = useState(initialRate);
  const [gst, setGst] = useState("");
  const [openingStock, setOpeningStock] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [unitId, setUnitId] = useState(units.find((unit) => unit.code === "PCS")?.id ?? units[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedBrand = availableBrands.find((brand) => brand.id === brandId);
  const selectedCategory = availableCategories.find((category) => category.id === categoryId);
  const selectedUnit = availableUnits.find((unit) => unit.id === unitId);

  async function createCategory(name: string) {
    const result = await postHardwareJson<LookupOption>("/api/hardware/categories/quick-add", { name });
    if (!result.ok) return setError(result.message);
    setAvailableCategories((current) => [result.data, ...current.filter((category) => category.id !== result.data.id)]);
    setCategoryId(result.data.id);
  }

  async function createBrand(name: string) {
    const result = await postHardwareJson<LookupOption>("/api/hardware/brands/quick-add", { name });
    if (!result.ok) return setError(result.message);
    setAvailableBrands((current) => [result.data, ...current.filter((brand) => brand.id !== result.data.id)]);
    setBrandId(result.data.id);
  }

  async function createUnit(name: string) {
    const result = await postHardwareJson<UnitOption>("/api/hardware/units/quick-add", { name });
    if (!result.ok) return setError(result.message);
    setAvailableUnits((current) => [result.data, ...current.filter((unit) => unit.id !== result.data.id)]);
    setUnitId(result.data.id);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await postHardwareJson<HardwareProductSummary>("/api/hardware/products/quick-add", {
      ...(gst ? { gstRateBps: Math.round(Number(gst) * 100) } : {}),
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(hsnCode ? { hsnCode } : {}),
      name,
      ...(openingStock ? { openingStock: { locationId, quantity: Number(openingStock) } } : {}),
      ...(purchaseRate ? { purchaseCostCents: Math.round(Number(purchaseRate) * 100) } : {}),
      salesPriceCents: Math.round(Number(rate) * 100),
      ...(unitId ? { unitId } : {}),
    });
    setSaving(false);
    if (!result.ok) return setError(result.message);
    onCreated(result.data);
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-md border border-border bg-card p-4 shadow-xl">
        <h2 className="text-lg font-semibold">Add product quickly</h2>
        <div className="mt-4 space-y-3">
          <label className="grid gap-2 text-sm font-medium">Product name<Input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Sale rate<Input inputMode="decimal" min="0.01" required step="0.01" type="number" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
          <CreatableCombobox createLabel="Create category" label="Category" onCreate={createCategory} onSelect={setCategoryId} options={availableCategories.map((category) => ({ id: category.id, label: category.name }))} placeholder="Search or add category" value={selectedCategory?.name ?? ""} />
          <CreatableCombobox createLabel="Create brand" label="Brand" onCreate={createBrand} onSelect={setBrandId} options={availableBrands.map((brand) => ({ id: brand.id, label: brand.name }))} placeholder="Search or add brand" value={selectedBrand?.name ?? ""} />
          <CreatableCombobox createLabel="Create unit" label="Unit" onCreate={createUnit} onSelect={setUnitId} options={availableUnits.map((unit) => ({ id: unit.id, keywords: [unit.code], label: `${unit.name} (${unit.code})` }))} placeholder="Search or add unit" value={selectedUnit ? `${selectedUnit.name} (${selectedUnit.code})` : ""} />
          <label className="grid gap-2 text-sm font-medium">GST %<Input inputMode="decimal" max="100" min="0" step="0.01" type="number" value={gst} onChange={(event) => setGst(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">HSN<Input value={hsnCode} onChange={(event) => setHsnCode(event.target.value.toUpperCase())} /></label>
          <label className="grid gap-2 text-sm font-medium">Purchase rate<Input inputMode="decimal" min="0" step="0.01" type="number" value={purchaseRate} onChange={(event) => setPurchaseRate(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Opening stock<Input inputMode="numeric" min="0" step="1" type="number" value={openingStock} onChange={(event) => setOpeningStock(event.target.value)} /></label>
          {openingStock ? <label className="grid gap-2 text-sm font-medium">Stock location<select className={selectClassName} value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label> : null}
        </div>
        {error ? <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button disabled={saving || name.trim().length < 2 || Number(rate) <= 0} onClick={save} type="button">{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

function QuickPartyDialog({
  initialName,
  onClose,
  onCreated,
  role,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (party: HardwarePartySummary) => void;
  role: "customer" | "supplier";
}) {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [balanceDirection, setBalanceDirection] = useState<"DR" | "CR">("DR");
  const [gstin, setGstin] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
      ...(address ? { address } : {}),
      ...(balance ? { balanceDirection, openingBalanceCents: Math.round(Number(balance) * 100) } : {}),
      ...(gstin ? { gstin } : {}),
      ...(mobile ? { mobile } : {}),
      name,
      role,
    });
    setSaving(false);
    if (!result.ok) return setError(result.message);
    onCreated(result.data);
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-4 shadow-xl">
        <h2 className="text-lg font-semibold">Create {role === "supplier" ? "supplier" : "customer"}</h2>
        <div className="mt-4 space-y-3">
          <label className="grid gap-2 text-sm font-medium">Name<Input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Mobile<Input inputMode="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">GSTIN<Input value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase())} /></label>
          <label className="grid gap-2 text-sm font-medium">Address<Input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="grid gap-2 text-sm font-medium">Opening balance<Input inputMode="decimal" min="0" step="0.01" type="number" value={balance} onChange={(event) => setBalance(event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-medium">Side<select className={selectClassName} value={balanceDirection} onChange={(event) => setBalanceDirection(event.target.value as "DR" | "CR")}><option value="DR">Debit</option><option value="CR">Credit</option></select></label>
          </div>
        </div>
        {error ? <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button disabled={saving || name.trim().length < 2} onClick={save} type="button">{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

type BillPreviewLine = {
  barcode: string | null;
  cgstCents: number;
  discountCents: number;
  gstRate: string;
  hsnCode: string | null;
  lineTotalCents: number;
  name: string;
  quantity: string;
  rateCents: number;
  sgstCents: number;
  sku: string | null;
  taxableCents: number;
  taxCents: number;
  unitCode: string | null;
};

type BillPreview = {
  balanceCents: number;
  cashierName: string;
  customerAddress: string | null;
  customerGstin: string | null;
  customerMobile: string | null;
  customerName: string;
  dateTime: Date;
  discountCents: number;
  documentNumber: string;
  firm: FirmPrintDetails;
  footer: string;
  grandTotalCents: number;
  invoiceDiscountCents: number;
  lines: BillPreviewLine[];
  notes: string | null;
  paidCents: number;
  paymentMode: string;
  roundOffCents: number;
  sgstCents: number;
  cgstCents: number;
  statusLabel: string;
  subtotalCents: number;
  taxableCents: number;
  taxCents: number;
};

function BillPreviewCard({ bill }: { bill: BillPreview }) {
  return (
    <Card>
      <CardHeader><CardTitle>A4 preview</CardTitle></CardHeader>
      <CardContent>
        <div className="rounded-md border border-border bg-white p-4 text-xs text-black">
          <InvoiceMarkup bill={bill} />
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceMarkup({ bill }: { bill: BillPreview }) {
  return (
    <div className="space-y-2">
      <header className="text-center">
        <Image alt="Mangalam Sanitary approved logo" className="mx-auto mb-1 h-14 w-14 object-contain" height={56} src="/api/public/branding/mangalam-sanitary-logo" unoptimized width={56} />
        <p className="text-sm font-bold tracking-normal">{bill.firm.firmName}</p>
        <p className="text-[10px] font-semibold">{bill.firm.tagline}</p>
        {bill.firm.address ? <p className="text-[10px]">{bill.firm.address}</p> : null}
        <p className="text-[10px]">{[bill.firm.phone, bill.firm.email].filter(Boolean).join(" | ")}</p>
        <p className="text-[10px] font-semibold">GSTIN: {bill.firm.gstin ?? "Not provided"}</p>
      </header>
      <div className="border-y border-black py-1 text-[10px]">
        <div className="flex justify-between"><span>{bill.statusLabel}</span><span>{bill.documentNumber}</span></div>
        <div className="flex justify-between"><span>{formatDateTime(bill.dateTime)}</span><span>{bill.cashierName}</span></div>
        <div>Customer: {bill.customerName}</div>
        {bill.customerAddress ? <div>Address: {bill.customerAddress}</div> : null}
        {bill.customerMobile ? <div>Mobile: {bill.customerMobile}</div> : null}
        {bill.customerGstin ? <div>GSTIN: {bill.customerGstin}</div> : null}
      </div>
      <table className="w-full table-fixed border-collapse text-[10px]">
        <colgroup><col className="w-[36%]" /><col className="w-[12%]" /><col className="w-[8%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[20%]" /></colgroup>
        <thead><tr className="border-b border-black text-left"><th className="py-1">Item</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
        <tbody>{bill.lines.map((line, index) => (
          <tr className="border-b border-zinc-300 align-top" key={`${line.name}-${index}`}>
            <td className="break-words py-1 pr-1"><div className="font-medium">{line.name}</div><div className="text-[9px]">{[line.sku, line.unitCode].filter(Boolean).join(" / ")}</div></td>
            <td>{line.hsnCode ?? "-"}</td><td className="text-right">{line.quantity}</td><td className="text-right">{money(line.rateCents)}</td><td className="text-right">{line.gstRate}%</td><td className="text-right font-medium">{money(line.lineTotalCents)}</td>
          </tr>
        ))}</tbody>
      </table>
      <dl className="space-y-1 text-[10px]">
        <PreviewRow label="Subtotal" value={bill.subtotalCents} /><PreviewRow label="Line discount" value={-bill.discountCents} /><PreviewRow label="Invoice discount" value={-bill.invoiceDiscountCents} /><PreviewRow label="Taxable" value={bill.taxableCents} /><PreviewRow label="CGST" value={bill.cgstCents} /><PreviewRow label="SGST" value={bill.sgstCents} /><PreviewRow label="Round-off" value={bill.roundOffCents} />
        <div className="flex justify-between border-t border-black pt-1 text-sm font-bold"><dt>Grand total</dt><dd>{money(bill.grandTotalCents)}</dd></div>
        <PreviewRow label={`Paid (${humanize(bill.paymentMode)})`} value={bill.paidCents} /><div className="flex justify-between text-sm font-bold"><dt>Balance</dt><dd>{money(bill.balanceCents)}</dd></div>
      </dl>
      {bill.notes ? <p className="border-t border-zinc-300 pt-1 text-[10px]">Notes: {bill.notes}</p> : null}
      <footer className="border-t border-black pt-2 text-center text-[10px]"><p>{bill.footer}</p><p>Invoice ref: {bill.documentNumber}</p></footer>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-3"><dt>{label}</dt><dd>{money(value)}</dd></div>;
}

function isPlainEnter(event: KeyboardEvent<HTMLElement>) {
  return event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
}

function formatRateBps(value: number) {
  return String(value / 100);
}

function NumberField({
  className,
  inputRef,
  label,
  onChange,
  onKeyDown,
  value,
}: {
  className?: string;
  inputRef?: (node: HTMLInputElement | null) => void;
  label: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>
      {label}
      <Input
        ref={inputRef}
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        step="0.01"
        type="number"
        value={value}
      />
    </label>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span>{money(value)}</span></div>;
}

function calculateTotals(lines: PosLine[], paid: string, invoiceDiscount: string, paymentChoice: BillPaymentChoice) {
  const totals = lines.reduce((result, line) => {
    const gross = Math.round((Number(line.quantity) || 0) * (Number(line.rate) || 0) * 100);
    const discount = Math.round(gross * (Number(line.discountPercent) || 0) / 100);
    const taxable = Math.max(gross - discount, 0);
    const tax = Math.round(taxable * (Number(line.gstRate) || 0) / 100);
    return { discountCents: result.discountCents + discount, subtotalCents: result.subtotalCents + gross, taxCents: result.taxCents + tax };
  }, { discountCents: 0, subtotalCents: 0, taxCents: 0 });
  const invoiceDiscountCents = Math.min(Math.round((Number(invoiceDiscount) || 0) * 100), totals.subtotalCents - totals.discountCents + totals.taxCents);
  const rawTotal = totals.subtotalCents - totals.discountCents - invoiceDiscountCents + totals.taxCents;
  const roundedTotal = Math.round(rawTotal / 100) * 100;
  const enteredPaidCents = Math.round((Number(paid) || 0) * 100);
  const paidCents = paymentChoice === "paid"
    ? roundedTotal
    : paymentChoice === "partial"
      ? enteredPaidCents
      : 0;
  return { ...totals, balanceCents: Math.max(roundedTotal - paidCents, 0), invoiceDiscountCents, paidCents, roundOffCents: roundedTotal - rawTotal, totalCents: roundedTotal };
}

function canSave(lines: PosLine[]) {
  return lines.every((line) => line.productId && Number(line.quantity) > 0 && Number(line.rate) > 0);
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function buildBillPreview(input: {
  cashierName: string;
  customer: HardwarePartySummary | undefined;
  customerAddress: string;
  customerName: string;
  firm: FirmPrintDetails;
  lines: PosLine[];
  notes: string;
  paidCents: number;
  paymentMode: string;
  posted: PostedSale | null;
  totals: ReturnType<typeof calculateTotals>;
}): BillPreview {
  const lines = input.lines.map((line) => {
    const quantity = Number(line.quantity) || 0;
    const rateCents = Math.round((Number(line.rate) || 0) * 100);
    const grossCents = quantity * rateCents;
    const discountCents = Math.round(grossCents * (Number(line.discountPercent) || 0) / 100);
    const taxableCents = Math.max(grossCents - discountCents, 0);
    const taxCents = Math.round(taxableCents * (Number(line.gstRate) || 0) / 100);
    const cgstCents = Math.floor(taxCents / 2);
    return { barcode: line.barcode, cgstCents, discountCents, gstRate: line.gstRate || "0", hsnCode: line.hsnCode, lineTotalCents: taxableCents + taxCents, name: line.productName || "Item pending", quantity: line.quantity || "0", rateCents, sgstCents: taxCents - cgstCents, sku: line.sku, taxableCents, taxCents, unitCode: line.unitCode };
  });
  const cgstCents = Math.floor(input.totals.taxCents / 2);
  return {
    balanceCents: input.totals.balanceCents,
    cashierName: input.cashierName,
    cgstCents,
    customerAddress: input.customerAddress.trim() || null,
    customerGstin: input.customer?.gstin ?? null,
    customerMobile: input.customer?.contact ?? null,
    customerName: input.customer?.name ?? (input.customerName.trim() || "Walk-in Customer"),
    dateTime: new Date(),
    discountCents: input.totals.discountCents,
    documentNumber: input.posted?.invoiceNumber ?? input.posted?.documentNumber ?? "DRAFT PREVIEW",
    firm: input.firm,
    footer: input.firm.termsFooter,
    grandTotalCents: input.totals.totalCents,
    invoiceDiscountCents: input.totals.invoiceDiscountCents,
    lines,
    notes: input.notes.trim() || null,
    paidCents: input.paidCents,
    paymentMode: input.paidCents > 0 ? input.paymentMode : "UNPAID",
    roundOffCents: input.totals.roundOffCents,
    sgstCents: input.totals.taxCents - cgstCents,
    statusLabel: input.posted ? "FINAL INVOICE" : "DRAFT PREVIEW",
    subtotalCents: input.totals.subtotalCents,
    taxableCents: lines.reduce((total, line) => total + line.taxableCents, 0),
    taxCents: input.totals.taxCents,
  };
}

function buildTestPrintPreview(input: { cashierName: string; firm: FirmPrintDetails; format?: string }): BillPreview {
  const now = new Date();
  return {
    balanceCents: 0, cashierName: input.cashierName, cgstCents: 0, customerAddress: null, customerGstin: null, customerMobile: null, customerName: "TEST CUSTOMER", dateTime: now, discountCents: 0, documentNumber: `TEST-A4-${now.getTime()}`, firm: input.firm, footer: "TEST A4 PRINT ONLY. No sale, payment, stock, or ledger entry was created.", grandTotalCents: 0, invoiceDiscountCents: 0,
    lines: [{ barcode: "TEST", cgstCents: 0, discountCents: 0, gstRate: "0", hsnCode: null, lineTotalCents: 0, name: "TEST A4 INVOICE", quantity: "1", rateCents: 0, sgstCents: 0, sku: "TEST-A4", taxableCents: 0, taxCents: 0, unitCode: "PCS" }],
    notes: "TEST INVOICE", paidCents: 0, paymentMode: "TEST", roundOffCents: 0, sgstCents: 0, statusLabel: "TEST PRINT", subtotalCents: 0, taxableCents: 0, taxCents: 0,
  };
}

function openA4PrintWindow(bill: BillPreview) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1050,height=850");
  if (!printWindow) return "Popup blocked. Allow popups for this site, then try Print A4 invoice again.";
  printWindow.document.open();
  printWindow.document.write(printDocumentHtml(bill));
  printWindow.document.close();
  const images = Array.from(printWindow.document.images);
  const ready = images.length ? Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); }))) : Promise.resolve();
  ready.finally(() => { printWindow.focus(); printWindow.print(); });
  return "A4 print window opened. Save as PDF or select the A4 printer in the browser dialog.";
}

function printDocumentHtml(bill: BillPreview, _legacyFormat?: string, _legacyTitle?: string) {
  const title = buildInvoiceFilename(bill.documentNumber, bill.customerName);
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${printCss()}</style></head><body><main class="invoice">${invoiceHtml(bill)}</main></body></html>`;
}

function printCss(_legacyFormat?: string) {
  return `
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    main { width: 190mm; margin: 0 auto; }
    .center { text-align: center; }
    .logo { width: 72px; height: 72px; object-fit: contain; }
    h1, p { margin: 0; }
    h1 { font-size: 22px; }
    .muted { font-size: 10px; }
    .block { border-top: 1px solid #000; padding: 5px 0; }
    table { border-collapse: collapse; table-layout: fixed; width: 100%; }
    thead { display: table-header-group; }
    th, td { overflow-wrap: anywhere; padding: 4px 3px; vertical-align: top; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th { border-bottom: 1px solid #000; text-align: left; }
    td.right, th.right { text-align: right; }
    .item-meta { font-size: 9px; }
    .totals { break-inside: avoid; border-top: 1px solid #000; margin-top: 6px; padding-top: 4px; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .grand { border-top: 2px solid #000; font-size: 16px; font-weight: 700; padding-top: 4px; }
    .footer { break-inside: avoid; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; text-align: center; }
    @media screen { body { padding: 12px; background: #ddd; } main { background: #fff; padding: 20px; box-shadow: 0 2px 18px rgb(0 0 0 / 15%); } }
    @media print { html, body { height: auto; overflow: visible; } body { background: #fff; } main { box-shadow: none; } }
  `;
}

function invoiceHtml(bill: BillPreview) {
  const rows = bill.lines.map((line, index) => `<tr><td><strong>${index + 1}. ${escapeHtml(line.name)}</strong><div class="item-meta">${escapeHtml([line.sku, line.unitCode].filter(Boolean).join(" / "))}</div></td><td>${escapeHtml(line.hsnCode ?? "-")}</td><td class="right">${escapeHtml(line.quantity)}</td><td class="right">${escapeHtml(money(line.rateCents))}</td><td class="right">${escapeHtml(line.gstRate)}%</td><td class="right"><strong>${escapeHtml(money(line.lineTotalCents))}</strong></td></tr>`).join("");
  return `<header class="center"><img alt="Mangalam Sanitary approved logo" class="logo" src="/api/public/branding/mangalam-sanitary-logo" /><h1>${escapeHtml(bill.firm.firmName)}</h1><p class="muted"><strong>${escapeHtml(bill.firm.tagline)}</strong></p>${bill.firm.address ? `<p class="muted">${escapeHtml(bill.firm.address)}</p>` : ""}<p class="muted">${escapeHtml([bill.firm.phone, bill.firm.email].filter(Boolean).join(" | "))}</p><p class="muted"><strong>GSTIN: ${escapeHtml(bill.firm.gstin ?? "Not provided")}</strong></p></header><section class="block"><div class="row"><span>${escapeHtml(bill.statusLabel)}</span><strong>${escapeHtml(bill.documentNumber)}</strong></div><div class="row"><span>${escapeHtml(formatDateTime(bill.dateTime))}</span><span>${escapeHtml(bill.cashierName)}</span></div><p>Customer: ${escapeHtml(bill.customerName)}</p>${bill.customerAddress ? `<p>Address: ${escapeHtml(bill.customerAddress)}</p>` : ""}${bill.customerMobile ? `<p>Mobile: ${escapeHtml(bill.customerMobile)}</p>` : ""}${bill.customerGstin ? `<p>GSTIN: ${escapeHtml(bill.customerGstin)}</p>` : ""}</section><table><colgroup><col style="width:36%"><col style="width:12%"><col style="width:8%"><col style="width:14%"><col style="width:10%"><col style="width:20%"></colgroup><thead><tr><th>Item</th><th>HSN</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">GST</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody></table><section class="totals">${amountHtml("Subtotal", bill.subtotalCents)}${amountHtml("Line discount", -bill.discountCents)}${amountHtml("Invoice discount", -bill.invoiceDiscountCents)}${amountHtml("Taxable", bill.taxableCents)}${amountHtml("CGST", bill.cgstCents)}${amountHtml("SGST", bill.sgstCents)}${amountHtml("Round-off", bill.roundOffCents)}<div class="row grand"><span>Grand total</span><span>${escapeHtml(money(bill.grandTotalCents))}</span></div>${amountHtml(`Paid (${humanize(bill.paymentMode)})`, bill.paidCents)}<div class="row grand"><span>Balance</span><span>${escapeHtml(money(bill.balanceCents))}</span></div></section>${bill.notes ? `<p class="block">Notes: ${escapeHtml(bill.notes)}</p>` : ""}<footer class="footer"><p>${escapeHtml(bill.footer)}</p><p>Invoice ref: ${escapeHtml(bill.documentNumber)}</p></footer>`;
}

function amountHtml(label: string, value: number) {
  return `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(money(value))}</span></div>`;
}

function buildInvoiceFilename(documentNumber: string, customerName: string) {
  return sanitizeFilename(`${documentNumber} - ${customerName}`) || "Mangalam Sanitary Invoice";
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/gu, "-").replace(/\s+/gu, " ").trim().slice(0, 150);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

export const quickPosPrintTestUtils = { buildBillPreview, buildInvoiceFilename, buildTestPrintPreview, calculateTotals, printCss, printDocumentHtml, sanitizeFilename };

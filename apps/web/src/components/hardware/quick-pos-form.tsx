"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Check, MessageCircle, Printer, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";
import { buildWhatsAppBillUrl } from "@/server/hardware/whatsapp";
import { CreatableCombobox } from "./creatable-combobox";
import { postHardwareJson } from "./hardware-api-client";

type LocationOption = { id: string; name: string };
type LookupOption = { id: string; name: string };
type UnitOption = { code: string; id: string; name: string };
type PaperFormat = "58mm" | "80mm" | "a4";
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
type PostedSale = { documentId: string; documentNumber: string; invoiceId: string | null; invoiceNumber: string | null; paymentStatus: string; totalCents: number };

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
  printerStorageKey,
  products,
  units,
}: {
  brands: LookupOption[];
  cashierName: string;
  categories: LookupOption[];
  customers: HardwarePartySummary[];
  defaultFirm: FirmPrintDetails;
  locations: LocationOption[];
  printerStorageKey: string;
  products: HardwareProductSummary[];
  units: UnitOption[];
}) {
  const [availableProducts, setAvailableProducts] = useState(products);
  const [availableCustomers, setAvailableCustomers] = useState(customers);
  const [customerId, setCustomerId] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [lines, setLines] = useState<PosLine[]>([{ ...emptyLine }]);
  const [notes, setNotes] = useState("");
  const [paperFormat, setPaperFormat] = useState<PaperFormat>(() => readStoredPaperFormat(printerStorageKey));
  const [paid, setPaid] = useState("0");
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
  const totals = useMemo(() => calculateTotals(lines, paid, invoiceDiscount), [invoiceDiscount, lines, paid]);
  const pendingStockProducts = lines
    .map((line) => availableProducts.find((product) => product.id === line.productId))
    .filter((product): product is HardwareProductSummary => product?.stockSetupStatus === "PENDING");

  function updateLine(index: number, patch: Partial<PosLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function applyProduct(index: number, product: HardwareProductSummary) {
    updateLine(index, {
      barcode: product.barcode,
      gstRate: product.gstRateBps === null ? "0" : String(product.gstRateBps / 100),
      hsnCode: product.hsnCode,
      productId: product.id,
      productName: product.name,
      rate: product.salesPriceCents ? String(product.salesPriceCents / 100) : lines[index]?.rate ?? "",
      sku: product.sku,
      unitCode: product.unitCode,
    });
  }

  async function postBill(options: { printAfterPost?: boolean } = {}) {
    setServerError(null);
    setPrintStatus(null);
    setSaving(true);
    const result = await postHardwareJson<PostedSale>("/api/hardware/pos/sale", {
      clientTotalCents: totals.totalCents,
      ...(customerId ? { customerId } : {}),
      idempotencyKey,
      invoiceDiscountCents: totals.invoiceDiscountCents,
      items: lines.map((line) => {
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
      paidAmountCents: totals.paidCents,
      paymentMode: totals.paidCents > 0 ? paymentMode : undefined,
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
    firm: defaultFirm,
    lines,
    notes,
    paidCents: totals.paidCents,
    paymentMode,
    posted,
    totals,
  });

  function updatePaperFormat(format: PaperFormat) {
    setPaperFormat(format);
    try {
      window.localStorage.setItem(printerStorageKey, format);
    } catch {
      setPrintStatus("Paper format saved for this screen only. Browser storage is unavailable.");
    }
  }

  function printCurrentBill(input?: { postedSale?: PostedSale; test?: boolean }) {
    const bill = input?.test
      ? buildTestPrintPreview({ cashierName, firm: defaultFirm, format: paperFormat })
      : { ...preview, documentNumber: input?.postedSale?.invoiceNumber ?? input?.postedSale?.documentNumber ?? preview.documentNumber, statusLabel: input?.postedSale ? "FINAL INVOICE" : preview.statusLabel };
    const result = openPrintWindow({
      bill,
      format: paperFormat,
      title: input?.test ? "TEST PRINT" : bill.documentNumber,
    });
    setPrintStatus(result);
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
                createLabel="Create customer"
                label="Customer"
                onCreate={setQuickCustomer}
                onSelect={setCustomerId}
                options={availableCustomers.map((customer) => ({ id: customer.id, keywords: [customer.contact ?? ""], label: customer.name }))}
                placeholder="Walk-in customer or type customer name"
                value={selectedCustomer?.name ?? ""}
              />
              <button className="mt-2 text-xs font-medium text-primary" onClick={() => setCustomerId("")} type="button">Use walk-in customer</button>
            </div>
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
            <CardTitle>Items</CardTitle>
            <Button onClick={() => setLines((current) => [...current, { ...emptyLine }])} type="button" variant="outline">Add line</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, index) => {
              return (
                <fieldset className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-12" key={index}>
                  <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
                  <div className="md:col-span-5">
                    <CreatableCombobox
                      createLabel="Create product"
                      label="Product name / SKU / barcode"
                      onCreate={(name) => setQuickAdd({ index, name })}
                      onSelect={(id) => {
                        const product = availableProducts.find((candidate) => candidate.id === id);
                        if (product) applyProduct(index, product);
                        else updateLine(index, { productId: "" });
                      }}
                      options={availableProducts.map((product) => ({
                        id: product.id,
                        keywords: [product.sku, product.barcode ?? ""],
                        label: product.name,
                      }))}
                      value={line.productName}
                    />
                  </div>
                  <NumberField label="Qty" value={line.quantity} onChange={(value) => updateLine(index, { quantity: value })} className="md:col-span-1" />
                  <NumberField label="Rate" value={line.rate} onChange={(value) => updateLine(index, { rate: value })} className="md:col-span-2" />
                  <NumberField label="Disc. %" value={line.discountPercent} onChange={(value) => updateLine(index, { discountPercent: value })} className="md:col-span-1" />
                  <NumberField label="GST %" value={line.gstRate} onChange={(value) => updateLine(index, { gstRate: value })} className="md:col-span-1" />
                  <div className="flex items-end md:col-span-2">
                    <Button aria-label={`Remove item ${index + 1}`} className="w-full" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} type="button" variant="ghost">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </fieldset>
              );
            })}
          </CardContent>
        </Card>
        {serverError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p> : null}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Printer</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <label className="grid gap-2 font-medium">
              Paper format
              <select className={selectClassName} value={paperFormat} onChange={(event) => updatePaperFormat(event.target.value as PaperFormat)}>
                <option value="58mm">58 mm thermal</option>
                <option value="80mm">80 mm thermal</option>
                <option value="a4">A4 invoice</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setPreviewOpen((current) => !current)} type="button" variant="outline">{previewOpen ? "Hide preview" : "Preview bill"}</Button>
              <Button onClick={() => printCurrentBill({ test: true })} type="button" variant="outline">Test print</Button>
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
              Paid
              <Input inputMode="decimal" min="0" step="0.01" type="number" value={paid} onChange={(event) => setPaid(event.target.value)} />
            </label>
            <label className="grid gap-2 font-medium">
              Payment mode
              <select className={selectClassName} disabled={totals.paidCents <= 0} value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <TotalRow label="Balance" value={totals.balanceCents} />
            <label className="grid gap-2 font-medium">
              Notes
              <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <Button className="w-full" disabled={saving || confirmed || !canSave(lines) || !locationId} onClick={() => postBill()} type="button">
              <Check className="size-4" />{saving ? "Posting..." : confirmed ? "Posted" : "Post bill"}
            </Button>
            <Button className="w-full" disabled={saving || postingPrint || (!confirmed && (!canSave(lines) || !locationId))} onClick={postAndPrint} type="button" variant="outline">
              <Printer className="size-4" />{postingPrint ? "Posting..." : confirmed ? "Print receipt" : "Post and print"}
            </Button>
          </CardContent>
        </Card>
        {previewOpen ? <BillPreviewCard bill={preview} format={paperFormat} /> : null}
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
              <Button asChild className="w-full" variant="outline"><Link href={`/admin/hardware/print/${posted.documentId}`}><Printer className="size-4" />Download / Print bill</Link></Button>
              <Button className="w-full" onClick={() => printCurrentBill({ postedSale: posted })} type="button" variant="outline"><Printer className="size-4" />Reprint receipt</Button>
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
            setAvailableCustomers((current) => [party, ...current]);
            setCustomerId(party.id);
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
  const [barcode, setBarcode] = useState("");
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
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAvailableCategories((current) => [result.data, ...current.filter((category) => category.id !== result.data.id)]);
    setCategoryId(result.data.id);
  }

  async function createBrand(name: string) {
    const result = await postHardwareJson<LookupOption>("/api/hardware/brands/quick-add", { name });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAvailableBrands((current) => [result.data, ...current.filter((brand) => brand.id !== result.data.id)]);
    setBrandId(result.data.id);
  }

  async function createUnit(name: string) {
    const result = await postHardwareJson<UnitOption>("/api/hardware/units/quick-add", { name });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAvailableUnits((current) => [result.data, ...current.filter((unit) => unit.id !== result.data.id)]);
    setUnitId(result.data.id);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await postHardwareJson<HardwareProductSummary>("/api/hardware/products/quick-add", {
      ...(gst ? { gstRateBps: Math.round(Number(gst) * 100) } : {}),
      ...(barcode ? { barcode } : {}),
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(hsnCode ? { hsnCode } : {}),
      name,
      ...(openingStock ? { openingStock: { locationId, quantity: Number(openingStock) } } : {}),
      ...(purchaseRate ? { purchaseCostCents: Math.round(Number(purchaseRate) * 100) } : {}),
      ...(rate ? { salesPriceCents: Math.round(Number(rate) * 100) } : {}),
      ...(unitId ? { unitId } : {}),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data);
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-4 shadow-xl">
        <h2 className="text-lg font-semibold">Add product quickly</h2>
        <div className="mt-4 space-y-3">
          <label className="grid gap-2 text-sm font-medium">Product name<Input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Sale rate<Input inputMode="decimal" required step="0.01" type="number" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Barcode<Input value={barcode} onChange={(event) => setBarcode(event.target.value)} /></label>
          <CreatableCombobox
            createLabel="Create category"
            label="Category"
            onCreate={createCategory}
            onSelect={setCategoryId}
            options={availableCategories.map((category) => ({ id: category.id, label: category.name }))}
            placeholder="Search or add category"
            value={selectedCategory?.name ?? ""}
          />
          <CreatableCombobox
            createLabel="Create brand"
            label="Brand"
            onCreate={createBrand}
            onSelect={setBrandId}
            options={availableBrands.map((brand) => ({ id: brand.id, label: brand.name }))}
            placeholder="Search or add brand"
            value={selectedBrand?.name ?? ""}
          />
          <CreatableCombobox
            createLabel="Create unit"
            label="Unit"
            onCreate={createUnit}
            onSelect={setUnitId}
            options={availableUnits.map((unit) => ({ id: unit.id, keywords: [unit.code], label: `${unit.name} (${unit.code})` }))}
            placeholder="Search or add unit"
            value={selectedUnit ? `${selectedUnit.name} (${selectedUnit.code})` : ""}
          />
          <label className="grid gap-2 text-sm font-medium">GST %<Input inputMode="decimal" max="100" min="0" step="0.01" type="number" value={gst} onChange={(event) => setGst(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">HSN<Input value={hsnCode} onChange={(event) => setHsnCode(event.target.value.toUpperCase())} /></label>
          <label className="grid gap-2 text-sm font-medium">Purchase rate<Input inputMode="decimal" step="0.01" type="number" value={purchaseRate} onChange={(event) => setPurchaseRate(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Opening stock<Input inputMode="numeric" min="0" step="1" type="number" value={openingStock} onChange={(event) => setOpeningStock(event.target.value)} /></label>
          {openingStock ? <label className="grid gap-2 text-sm font-medium">Stock location<select className={selectClassName} value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label> : null}
        </div>
        {error ? <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button disabled={saving || name.trim().length < 2 || !rate} onClick={save} type="button">{saving ? "Saving..." : "Save"}</Button>
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
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data);
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-4 shadow-xl">
        <h2 className="text-lg font-semibold">Create customer</h2>
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

function BillPreviewCard({ bill, format }: { bill: BillPreview; format: PaperFormat }) {
  const thermal = format !== "a4";
  return (
    <Card>
      <CardHeader><CardTitle>{thermal ? "Thermal preview" : "A4 preview"}</CardTitle></CardHeader>
      <CardContent>
        <div className={thermal ? "mx-auto max-w-[320px] rounded-md border border-border bg-white p-3 text-[11px] text-black" : "rounded-md border border-border bg-white p-4 text-xs text-black"}>
          <ReceiptMarkup bill={bill} compact={thermal} />
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiptMarkup({ bill, compact }: { bill: BillPreview; compact: boolean }) {
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
        {bill.customerMobile ? <div>Mobile: {bill.customerMobile}</div> : null}
        {bill.customerGstin ? <div>GSTIN: {bill.customerGstin}</div> : null}
      </div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1">Item</th>
            {!compact ? <th>HSN</th> : null}
            <th className="text-right">Qty</th>
            <th className="text-right">Rate</th>
            {!compact ? <th className="text-right">GST</th> : null}
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.lines.map((line, index) => (
            <tr className="border-b border-zinc-300 align-top" key={`${line.name}-${index}`}>
              <td className="py-1 pr-1">
                <div className="font-medium">{line.name}</div>
                <div className="text-[9px]">{[line.sku, line.barcode, line.unitCode].filter(Boolean).join(" / ")}</div>
                {compact ? <div className="text-[9px]">GST {line.gstRate}% · Disc {money(line.discountCents)}</div> : null}
              </td>
              {!compact ? <td>{line.hsnCode ?? "-"}</td> : null}
              <td className="text-right">{line.quantity}</td>
              <td className="text-right">{money(line.rateCents)}</td>
              {!compact ? <td className="text-right">{line.gstRate}%</td> : null}
              <td className="text-right font-medium">{money(line.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="space-y-1 text-[10px]">
        <PreviewRow label="Subtotal" value={bill.subtotalCents} />
        <PreviewRow label="Line discount" value={-bill.discountCents} />
        <PreviewRow label="Invoice discount" value={-bill.invoiceDiscountCents} />
        <PreviewRow label="Taxable" value={bill.taxableCents} />
        <PreviewRow label="CGST" value={bill.cgstCents} />
        <PreviewRow label="SGST" value={bill.sgstCents} />
        <PreviewRow label="Round-off" value={bill.roundOffCents} />
        <div className="flex justify-between border-t border-black pt-1 text-sm font-bold"><dt>Grand total</dt><dd>{money(bill.grandTotalCents)}</dd></div>
        <PreviewRow label={`Paid (${humanize(bill.paymentMode)})`} value={bill.paidCents} />
        <div className="flex justify-between text-sm font-bold"><dt>Balance</dt><dd>{money(bill.balanceCents)}</dd></div>
      </dl>
      {bill.notes ? <p className="border-t border-zinc-300 pt-1 text-[10px]">Notes: {bill.notes}</p> : null}
      <footer className="border-t border-black pt-2 text-center text-[10px]">
        <p>{bill.footer}</p>
        <p>Receipt ref: {bill.documentNumber}</p>
      </footer>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-3"><dt>{label}</dt><dd>{money(value)}</dd></div>;
}

function NumberField({ className, label, onChange, value }: { className?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>{label}<Input inputMode="decimal" min="0" step="0.01" type="number" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span>{money(value)}</span></div>;
}

function calculateTotals(lines: PosLine[], paid: string, invoiceDiscount: string) {
  const totals = lines.reduce((result, line) => {
    const gross = Math.round((Number(line.quantity) || 0) * (Number(line.rate) || 0) * 100);
    const discount = Math.round(gross * (Number(line.discountPercent) || 0) / 100);
    const taxable = Math.max(gross - discount, 0);
    const tax = Math.round(taxable * (Number(line.gstRate) || 0) / 100);
    return {
      discountCents: result.discountCents + discount,
      subtotalCents: result.subtotalCents + gross,
      taxCents: result.taxCents + tax,
    };
  }, { discountCents: 0, subtotalCents: 0, taxCents: 0 });
  const invoiceDiscountCents = Math.min(Math.round((Number(invoiceDiscount) || 0) * 100), totals.subtotalCents - totals.discountCents + totals.taxCents);
  const rawTotal = totals.subtotalCents - totals.discountCents - invoiceDiscountCents + totals.taxCents;
  const roundedTotal = Math.round(rawTotal / 100) * 100;
  const paidCents = Math.round((Number(paid) || 0) * 100);
  return {
    ...totals,
    balanceCents: Math.max(roundedTotal - paidCents, 0),
    invoiceDiscountCents,
    paidCents,
    roundOffCents: roundedTotal - rawTotal,
    totalCents: roundedTotal,
  };
}

function canSave(lines: PosLine[]) {
  return lines.every((line) => line.productId && Number(line.quantity) > 0 && Number(line.rate) >= 0);
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function buildBillPreview(input: {
  cashierName: string;
  customer: HardwarePartySummary | undefined;
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
    return {
      barcode: line.barcode,
      cgstCents,
      discountCents,
      gstRate: line.gstRate || "0",
      hsnCode: line.hsnCode,
      lineTotalCents: taxableCents + taxCents,
      name: line.productName || "Item pending",
      quantity: line.quantity || "0",
      rateCents,
      sgstCents: taxCents - cgstCents,
      sku: line.sku,
      taxableCents,
      taxCents,
      unitCode: line.unitCode,
    };
  });
  const cgstCents = Math.floor(input.totals.taxCents / 2);
  return {
    balanceCents: input.totals.balanceCents,
    cashierName: input.cashierName,
    cgstCents,
    customerGstin: input.customer?.gstin ?? null,
    customerMobile: input.customer?.contact ?? null,
    customerName: input.customer?.name ?? "Walk-in customer",
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

function buildTestPrintPreview(input: { cashierName: string; firm: FirmPrintDetails; format: PaperFormat }): BillPreview {
  const now = new Date();
  return {
    balanceCents: 0,
    cashierName: input.cashierName,
    cgstCents: 0,
    customerGstin: null,
    customerMobile: null,
    customerName: "TEST CUSTOMER",
    dateTime: now,
    discountCents: 0,
    documentNumber: `TEST-${input.format.toUpperCase()}-${now.getTime()}`,
    firm: input.firm,
    footer: "TEST PRINT ONLY. No sale, payment, stock, or ledger entry was created.",
    grandTotalCents: 0,
    invoiceDiscountCents: 0,
    lines: [{
      barcode: "TEST",
      cgstCents: 0,
      discountCents: 0,
      gstRate: "0",
      hsnCode: null,
      lineTotalCents: 0,
      name: `TEST PRINT ${input.format}`,
      quantity: "1",
      rateCents: 0,
      sgstCents: 0,
      sku: "TEST-RECEIPT",
      taxableCents: 0,
      taxCents: 0,
      unitCode: "PCS",
    }],
    notes: "TEST RECEIPT",
    paidCents: 0,
    paymentMode: "TEST",
    roundOffCents: 0,
    sgstCents: 0,
    statusLabel: "TEST PRINT",
    subtotalCents: 0,
    taxableCents: 0,
    taxCents: 0,
  };
}

function openPrintWindow(input: { bill: BillPreview; format: PaperFormat; title: string }) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");
  if (!printWindow) {
    return "Popup blocked. Allow popups for this site, then use Print receipt or Test print again.";
  }
  printWindow.document.open();
  printWindow.document.write(printDocumentHtml(input.bill, input.format, input.title));
  printWindow.document.close();
  const images = Array.from(printWindow.document.images);
  const ready = images.length
    ? Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      })))
    : Promise.resolve();
  ready.then(() => {
    printWindow.focus();
    printWindow.print();
  }).catch(() => {
    printWindow.focus();
    printWindow.print();
  });
  return "Print window opened. Confirm the browser print dialog and check the printer queue for physical output.";
}

function printDocumentHtml(bill: BillPreview, format: PaperFormat, title: string) {
  const compact = format !== "a4";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${printCss(format)}</style>
</head>
<body>
  <main class="${compact ? "receipt" : "invoice"}">
    ${receiptHtml(bill, compact)}
  </main>
  <script>
    window.onafterprint = () => { setTimeout(() => window.close(), 300); };
  </script>
</body>
</html>`;
}

function printCss(format: PaperFormat) {
  const page = format === "58mm"
    ? "@page { size: 58mm auto; margin: 2mm; }"
    : format === "80mm"
      ? "@page { size: 80mm auto; margin: 3mm; }"
      : "@page { size: A4 portrait; margin: 10mm; }";
  const width = format === "58mm" ? "54mm" : format === "80mm" ? "74mm" : "190mm";
  const fontSize = format === "58mm" ? "10px" : format === "80mm" ? "11px" : "12px";
  return `
    ${page}
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: ${fontSize}; }
    main { width: ${width}; margin: 0 auto; }
    .invoice { min-height: 270mm; }
    .receipt { padding-bottom: 12mm; }
    .center { text-align: center; }
    .logo { width: ${format === "a4" ? "72px" : "44px"}; height: ${format === "a4" ? "72px" : "44px"}; object-fit: contain; }
    h1, p { margin: 0; }
    h1 { font-size: ${format === "a4" ? "22px" : "14px"}; letter-spacing: 0; }
    .muted { font-size: ${format === "a4" ? "11px" : "9px"}; }
    .block { border-top: 1px solid #000; padding: 5px 0; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group; }
    th, td { padding: 4px 2px; vertical-align: top; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th { border-bottom: 1px solid #000; text-align: left; }
    td.right, th.right { text-align: right; }
    .item-meta { font-size: 9px; }
    .totals { border-top: 1px solid #000; margin-top: 6px; padding-top: 4px; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .grand { border-top: 2px solid #000; font-size: ${format === "a4" ? "16px" : "13px"}; font-weight: 700; padding-top: 4px; }
    .footer { border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; text-align: center; }
    @media screen { body { padding: 12px; background: #ddd; } main { background: #fff; padding: ${format === "a4" ? "20px" : "6px"}; } }
    @media print { .no-print { display: none !important; } body { background: #fff; } main { box-shadow: none; } }
  `;
}

function receiptHtml(bill: BillPreview, compact: boolean) {
  const rows = bill.lines.map((line, index) => `
    <tr>
      <td>
        <strong>${index + 1}. ${escapeHtml(line.name)}</strong>
        <div class="item-meta">${escapeHtml([line.sku, line.barcode, line.unitCode].filter(Boolean).join(" / "))}</div>
        ${compact ? `<div class="item-meta">GST ${escapeHtml(line.gstRate)}% | Disc ${escapeHtml(money(line.discountCents))}</div>` : ""}
      </td>
      ${compact ? "" : `<td>${escapeHtml(line.hsnCode ?? "-")}</td>`}
      <td class="right">${escapeHtml(line.quantity)}</td>
      <td class="right">${escapeHtml(money(line.rateCents))}</td>
      ${compact ? "" : `<td class="right">${escapeHtml(line.gstRate)}%</td>`}
      <td class="right"><strong>${escapeHtml(money(line.lineTotalCents))}</strong></td>
    </tr>
  `).join("");
  return `
    <header class="center">
      <img alt="Mangalam Sanitary approved logo" class="logo" src="/api/public/branding/mangalam-sanitary-logo" />
      <h1>${escapeHtml(bill.firm.firmName)}</h1>
      <p class="muted"><strong>${escapeHtml(bill.firm.tagline)}</strong></p>
      ${bill.firm.address ? `<p class="muted">${escapeHtml(bill.firm.address)}</p>` : ""}
      <p class="muted">${escapeHtml([bill.firm.phone, bill.firm.email].filter(Boolean).join(" | "))}</p>
      <p class="muted"><strong>GSTIN: ${escapeHtml(bill.firm.gstin ?? "Not provided")}</strong></p>
    </header>
    <section class="block">
      <div class="row"><span>${escapeHtml(bill.statusLabel)}</span><strong>${escapeHtml(bill.documentNumber)}</strong></div>
      <div class="row"><span>${escapeHtml(formatDateTime(bill.dateTime))}</span><span>${escapeHtml(bill.cashierName)}</span></div>
      <p>Customer: ${escapeHtml(bill.customerName)}</p>
      ${bill.customerMobile ? `<p>Mobile: ${escapeHtml(bill.customerMobile)}</p>` : ""}
      ${bill.customerGstin ? `<p>GSTIN: ${escapeHtml(bill.customerGstin)}</p>` : ""}
    </section>
    <table>
      <thead><tr><th>Item</th>${compact ? "" : "<th>HSN</th>"}<th class="right">Qty</th><th class="right">Rate</th>${compact ? "" : "<th class=\"right\">GST</th>"}<th class="right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="totals">
      ${amountHtml("Subtotal", bill.subtotalCents)}
      ${amountHtml("Line discount", -bill.discountCents)}
      ${amountHtml("Invoice discount", -bill.invoiceDiscountCents)}
      ${amountHtml("Taxable", bill.taxableCents)}
      ${amountHtml("CGST", bill.cgstCents)}
      ${amountHtml("SGST", bill.sgstCents)}
      ${amountHtml("Round-off", bill.roundOffCents)}
      <div class="row grand"><span>Grand total</span><span>${escapeHtml(money(bill.grandTotalCents))}</span></div>
      ${amountHtml(`Paid (${humanize(bill.paymentMode)})`, bill.paidCents)}
      <div class="row grand"><span>Balance</span><span>${escapeHtml(money(bill.balanceCents))}</span></div>
    </section>
    ${bill.notes ? `<p class="block">Notes: ${escapeHtml(bill.notes)}</p>` : ""}
    <footer class="footer">
      <p>${escapeHtml(bill.footer)}</p>
      <p>Receipt ref: ${escapeHtml(bill.documentNumber)}</p>
    </footer>
  `;
}

function amountHtml(label: string, value: number) {
  return `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(money(value))}</span></div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function readStoredPaperFormat(key: string): PaperFormat {
  try {
    const value = window.localStorage.getItem(key);
    return value === "58mm" || value === "80mm" || value === "a4" ? value : "80mm";
  } catch {
    return "80mm";
  }
}

export const quickPosPrintTestUtils = {
  buildBillPreview,
  buildTestPrintPreview,
  calculateTotals,
  printCss,
  printDocumentHtml,
};

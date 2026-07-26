"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Check, MessageCircle, PackagePlus, Printer, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";
import { buildWhatsAppBillUrl } from "@/server/hardware/whatsapp";
import { postHardwareJson } from "./hardware-api-client";

type LocationOption = { id: string; name: string };
type PosLine = {
  discountPercent: string;
  gstRate: string;
  productId: string;
  productName: string;
  quantity: string;
  rate: string;
};
type SavedDocument = { documentNumber: string; id: string; totalCents: number };

const emptyLine: PosLine = {
  discountPercent: "0",
  gstRate: "0",
  productId: "",
  productName: "",
  quantity: "1",
  rate: "",
};

export function QuickPosForm({
  customers,
  defaultFirmName,
  locations,
  products,
}: {
  customers: HardwarePartySummary[];
  defaultFirmName: string;
  locations: LocationOption[];
  products: HardwareProductSummary[];
}) {
  const [availableProducts, setAvailableProducts] = useState(products);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<PosLine[]>([{ ...emptyLine }]);
  const [paid, setPaid] = useState("0");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState<SavedDocument | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ index: number; name: string } | null>(null);
  const [whatsAppMobile, setWhatsAppMobile] = useState("");
  const totals = useMemo(() => calculateTotals(lines, paid), [lines, paid]);
  const pendingStockProducts = lines
    .map((line) => availableProducts.find((product) => product.id === line.productId))
    .filter((product): product is HardwareProductSummary => product?.stockSetupStatus === "PENDING");

  function updateLine(index: number, patch: Partial<PosLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function applyProduct(index: number, product: HardwareProductSummary) {
    updateLine(index, {
      gstRate: product.gstRateBps === null ? "0" : String(product.gstRateBps / 100),
      productId: product.id,
      productName: product.name,
      rate: product.salesPriceCents ? String(product.salesPriceCents / 100) : lines[index]?.rate ?? "",
    });
  }

  async function saveDraft() {
    setServerError(null);
    setSaving(true);
    const result = await postHardwareJson<SavedDocument>("/api/hardware/sales", {
      currency: "INR",
      ...(customerId ? { customerId } : {}),
      items: lines.map((line) => {
        const grossCents = Math.round(Number(line.quantity) * Number(line.rate) * 100);
        return {
          discountCents: Math.round(grossCents * Number(line.discountPercent) / 100),
          productId: line.productId,
          quantity: Number(line.quantity),
          taxRateBps: Math.round(Number(line.gstRate) * 100),
          unitAmountCents: Math.round(Number(line.rate) * 100),
        };
      }),
      metadata: {
        paymentMode: totals.balanceCents > 0 ? "Credit" : "Cash",
        posFlow: "quick-pos",
        walkInCustomer: !customerId,
      },
      type: "SALES_ORDER",
    });
    setSaving(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setSaved(result.data);
  }

  async function confirmBill() {
    if (!saved) return;
    setServerError(null);
    setConfirming(true);
    const result = await postHardwareJson<SavedDocument>(`/api/hardware/trade/${saved.id}/confirm`, { locationId });
    setConfirming(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setConfirmed(true);
    setSaved(result.data);
  }

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const waUrl = buildWhatsAppBillUrl({
    balanceCents: totals.balanceCents,
    firmName: defaultFirmName,
    invoiceNumber: saved?.documentNumber ?? "Draft bill",
    mobile: whatsAppMobile || selectedCustomer?.contact || "",
    paidCents: totals.paidCents,
    totalCents: totals.totalCents,
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Fast bill</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium md:col-span-2">
              Customer
              <select className={selectClassName} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
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
            <CardTitle>Items</CardTitle>
            <Button onClick={() => setLines((current) => [...current, { ...emptyLine }])} type="button" variant="outline">Add line</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, index) => {
              const matches = line.productName.trim()
                ? availableProducts.filter((product) => product.name.toLowerCase().includes(line.productName.trim().toLowerCase())).slice(0, 6)
                : [];
              const exactMatch = availableProducts.some((product) => product.name.toLowerCase() === line.productName.trim().toLowerCase());
              return (
                <fieldset className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-12" key={index}>
                  <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
                  <label className="relative grid gap-2 text-sm font-medium md:col-span-5">
                    Product name
                    <Search className="pointer-events-none absolute left-3 top-9 size-4 text-muted-foreground" />
                    <Input
                      autoComplete="off"
                      className="pl-9"
                      value={line.productName}
                      onChange={(event) => updateLine(index, { productId: "", productName: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const first = matches[0];
                          if (first) applyProduct(index, first);
                          else if (line.productName.trim()) setQuickAdd({ index, name: line.productName.trim() });
                        }
                      }}
                    />
                    {line.productName && !line.productId ? (
                      <div className="rounded-md border border-border bg-card p-2 shadow-sm">
                        {matches.map((product) => (
                          <button className="block min-h-9 w-full rounded px-2 text-left text-sm hover:bg-muted" key={product.id} onClick={() => applyProduct(index, product)} type="button">
                            {product.name}
                          </button>
                        ))}
                        {!exactMatch ? (
                          <button className="flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-sm font-medium text-primary hover:bg-muted" onClick={() => setQuickAdd({ index, name: line.productName.trim() })} type="button">
                            <PackagePlus className="size-4" />Add &quot;{line.productName.trim()}&quot; as new product
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </label>
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
          <CardHeader><CardTitle>Preview bill</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <TotalRow label="Subtotal" value={totals.subtotalCents} />
            <TotalRow label="Discount" value={-totals.discountCents} />
            <TotalRow label="GST" value={totals.taxCents} />
            <TotalRow label="Round-off" value={totals.roundOffCents} />
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span>{money(totals.totalCents)}</span></div>
            <label className="grid gap-2 font-medium">
              Paid
              <Input inputMode="decimal" min="0" step="0.01" type="number" value={paid} onChange={(event) => setPaid(event.target.value)} />
            </label>
            <TotalRow label="Balance" value={totals.balanceCents} />
            <Button className="w-full" disabled={saving || !canSave(lines)} onClick={saveDraft} type="button">
              {saving ? "Saving..." : saved ? "Save another draft" : "Save draft"}
            </Button>
            <Button className="w-full" disabled={!saved || confirming || confirmed || !locationId} onClick={confirmBill} type="button" variant="outline">
              <Check className="size-4" />{confirming ? "Confirming..." : confirmed ? "Confirmed" : "Confirm bill"}
            </Button>
          </CardContent>
        </Card>
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
        {confirmed && saved ? (
          <Card>
            <CardHeader><CardTitle>After issue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" variant="outline"><Link href={`/admin/hardware/print/${saved.id}`}><Printer className="size-4" />Download / Print bill</Link></Button>
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
          locations={locations}
          onClose={() => setQuickAdd(null)}
          onCreated={(product) => {
            setAvailableProducts((current) => [product, ...current]);
            applyProduct(quickAdd.index, product);
            setQuickAdd(null);
          }}
        />
      ) : null}
    </div>
  );
}

function QuickAddDialog({
  initialName,
  initialRate,
  locations,
  onClose,
  onCreated,
}: {
  initialName: string;
  initialRate: string;
  locations: LocationOption[];
  onClose: () => void;
  onCreated: (product: HardwareProductSummary) => void;
}) {
  const [name, setName] = useState(initialName);
  const [rate, setRate] = useState(initialRate);
  const [gst, setGst] = useState("");
  const [openingStock, setOpeningStock] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await postHardwareJson<HardwareProductSummary>("/api/hardware/products/quick-add", {
      ...(gst ? { gstRateBps: Math.round(Number(gst) * 100) } : {}),
      name,
      ...(openingStock ? { openingStock: { locationId, quantity: Number(openingStock) } } : {}),
      ...(rate ? { salesPriceCents: Math.round(Number(rate) * 100) } : {}),
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
          <label className="grid gap-2 text-sm font-medium">Sale rate<Input inputMode="decimal" step="0.01" type="number" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">GST %<Input inputMode="decimal" max="100" min="0" step="0.01" type="number" value={gst} onChange={(event) => setGst(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Opening stock<Input inputMode="numeric" min="0" step="1" type="number" value={openingStock} onChange={(event) => setOpeningStock(event.target.value)} /></label>
          {openingStock ? <label className="grid gap-2 text-sm font-medium">Stock location<select className={selectClassName} value={locationId} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label> : null}
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

function NumberField({ className, label, onChange, value }: { className?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>{label}<Input inputMode="decimal" min="0" step="0.01" type="number" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span>{money(value)}</span></div>;
}

function calculateTotals(lines: PosLine[], paid: string) {
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
  const rawTotal = totals.subtotalCents - totals.discountCents + totals.taxCents;
  const roundedTotal = Math.round(rawTotal / 100) * 100;
  const paidCents = Math.round((Number(paid) || 0) * 100);
  return {
    ...totals,
    balanceCents: Math.max(roundedTotal - paidCents, 0),
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

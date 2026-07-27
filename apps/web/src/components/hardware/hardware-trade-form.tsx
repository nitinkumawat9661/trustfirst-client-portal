"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Plus, Save, ScanLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";
import { postHardwareJson } from "./hardware-api-client";

const numericString = z.string().refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, {
  message: "Enter a valid non-negative number.",
});

const tradeFormSchema = z.object({
  documentDate: z.string().min(1, "Date is required."),
  documentType: z.enum(["PURCHASE_ENTRY", "PURCHASE_ORDER", "SALES_ORDER", "SALES_QUOTATION", "SUPPLIER_BILL"]),
  items: z.array(z.object({
    barcode: z.string(),
    discountType: z.enum(["percent", "flat"]),
    discountValue: numericString,
    gstRate: z.string().refine((value) => Number(value) >= 0 && Number(value) <= 100, {
      message: "Use 0 to 100.",
    }),
    hsnCode: z.string(),
    productId: z.string().min(1, "Select a product."),
    productGstRate: z.string(),
    quantity: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "Quantity must be a positive whole number.",
    }),
    unitCode: z.string(),
    unitRate: numericString,
  })).min(1),
  partyId: z.string().min(1, "Select a party."),
  paidAmount: z.string().refine((value) => value === "" || Number(value) >= 0, {
    message: "Paid amount must be zero or higher.",
  }),
  paymentMode: z.enum(["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other", "Credit"]),
  quotationIncludesGst: z.boolean(),
  referenceNumber: z.string().max(120),
  roundOff: z.string().refine((value) => value === "" || (Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 100), {
    message: "Round-off must be between -100 and 100.",
  }),
  taxMode: z.enum(["intra-state", "inter-state"]),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;
type TradeMode = "purchase" | "quotation" | "sale";

const emptyItem = {
  barcode: "",
  discountType: "percent" as const,
  discountValue: "0",
  gstRate: "0",
  hsnCode: "",
  productId: "",
  productGstRate: "0",
  quantity: "1",
  unitCode: "",
  unitRate: "",
};

export function HardwareTradeForm({
  mode,
  parties,
  products,
}: {
  mode: TradeMode;
  parties: HardwarePartySummary[];
  products: HardwareProductSummary[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = useForm<TradeFormValues>({
    defaultValues: {
      documentDate: new Date().toISOString().slice(0, 10),
      documentType: defaultDocumentType(mode),
      items: [{ ...emptyItem }],
      partyId: "",
      paidAmount: "",
      paymentMode: mode === "purchase" ? "Credit" : "Cash",
      quotationIncludesGst: false,
      referenceNumber: "",
      roundOff: "0",
      taxMode: "intra-state",
    },
    resolver: zodResolver(tradeFormSchema),
  });
  const { append, fields, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const quotationIncludesGst = useWatch({ control, name: "quotationIncludesGst" });
  const watchedRoundOff = useWatch({ control, name: "roundOff" });
  const totals = useMemo(() => calculatePreview(watchedItems, watchedRoundOff), [watchedItems, watchedRoundOff]);
  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : parties.length === 0
        ? `Add at least one ${mode === "purchase" ? "supplier" : "customer"} before creating a document.`
        : null;

  useEffect(() => {
    if (mode !== "quotation") return;
    watchedItems?.forEach((item, index) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const productGstRate = product?.gstRateBps === null || product?.gstRateBps === undefined ? "0" : String(product.gstRateBps / 100);
      setValue(`items.${index}.productGstRate`, productGstRate);
      setValue(`items.${index}.gstRate`, quotationIncludesGst ? productGstRate : "0", { shouldValidate: true });
    });
  }, [mode, products, quotationIncludesGst, setValue, watchedItems]);

  function applyProduct(index: number, productId: string) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    const rateCents = mode === "purchase" ? product.purchaseCostCents : product.salesPriceCents;
    const productGstRate = product.gstRateBps === null ? "0" : String(product.gstRateBps / 100);
    setValue(`items.${index}.barcode`, product.barcode ?? "");
    setValue(`items.${index}.gstRate`, mode === "quotation" && !quotationIncludesGst ? "0" : productGstRate);
    setValue(`items.${index}.hsnCode`, product.hsnCode ?? "");
    setValue(`items.${index}.productGstRate`, productGstRate);
    setValue(`items.${index}.unitCode`, product.unitCode ?? "");
    setValue(`items.${index}.unitRate`, rateCents ? String(rateCents / 100) : "");
  }

  function applyBarcode(index: number, barcode: string) {
    const product = products.find((candidate) => candidate.barcode === barcode.trim());
    if (!product) return;
    setValue(`items.${index}.productId`, product.id, { shouldValidate: true });
    applyProduct(index, product.id);
  }

  async function onSubmit(values: TradeFormValues) {
    setServerError(null);
    const endpoint = mode === "purchase" ? "/api/hardware/purchases" : "/api/hardware/sales";
    const payload = {
      currency: "INR",
      ...(mode === "purchase" ? { supplierId: values.partyId } : { customerId: values.partyId }),
      items: values.items.map((item) => {
        const amounts = calculateItemPreview(item);
        const discountValue = Number(item.discountValue) || 0;
        return {
          discountCents: amounts.discountCents,
          metadata: {
            discountFlatCents: item.discountType === "flat" ? amounts.discountCents : null,
            discountPercent: item.discountType === "percent" ? discountValue : null,
            discountType: item.discountType,
            discountValue,
            hsnCode: item.hsnCode || null,
            productGstRateBps: Math.round(Number(item.productGstRate || 0) * 100),
            unitCode: item.unitCode || null,
          },
          productId: item.productId,
          quantity: Number(item.quantity),
          taxRateBps: Math.round(Number(item.gstRate) * 100),
          unitAmountCents: Math.round(Number(item.unitRate) * 100),
        };
      }),
      metadata: {
        documentDate: values.documentDate,
        paidAmountCents: mode === "purchase" ? Math.round(Number(values.paidAmount || 0) * 100) : undefined,
        paymentMode: values.paymentMode,
        referenceNumber: values.referenceNumber || null,
        taxMode: values.taxMode,
        ...(mode === "quotation" ? { quotationGstIncluded: values.quotationIncludesGst } : {}),
      },
      roundOffCents: Math.round(Number(values.roundOff || 0) * 100),
      type: values.documentType,
    };
    const result = await postHardwareJson<{ documentNumber?: string }>(endpoint, payload);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push(mode === "purchase" ? "/admin/hardware/purchases?created=1" : mode === "quotation" ? "/admin/hardware/quotations?created=1" : "/admin/hardware/sales?created=1");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {disabledReason ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" role="status">
          {disabledReason}
        </div>
      ) : null}
      <Card>
        <CardHeader><CardTitle>{documentTitle(mode)}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField error={errors.partyId?.message} label={mode === "purchase" ? "Supplier" : "Customer"} required>
            <select className={selectClassName} {...register("partyId")}>
              <option value="">Select {mode === "purchase" ? "supplier" : "customer"}</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
            </select>
          </FormField>
          <FormField error={errors.documentDate?.message} label="Document date" required>
            <Input type="date" {...register("documentDate")} />
          </FormField>
          <FormField label={mode === "purchase" ? "Supplier invoice / reference" : "Customer reference"}>
            <Input autoComplete="off" {...register("referenceNumber")} />
          </FormField>
          {mode === "purchase" ? (
            <FormField label="Purchase document type">
              <select className={selectClassName} {...register("documentType")}>
                <option value="PURCHASE_ENTRY">Purchase entry</option>
                <option value="SUPPLIER_BILL">Supplier bill</option>
                <option value="PURCHASE_ORDER">Purchase order</option>
              </select>
            </FormField>
          ) : null}
          <FormField label="Tax treatment">
            <select className={selectClassName} {...register("taxMode")}>
              <option value="intra-state">Intra-state (CGST + SGST)</option>
              <option value="inter-state">Inter-state (IGST)</option>
            </select>
          </FormField>
          {mode === "quotation" ? (
            <label className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
              <input className="size-4 accent-primary" type="checkbox" {...register("quotationIncludesGst")} />
              Include GST in quotation
            </label>
          ) : null}
          {mode !== "quotation" ? (
            <FormField label="Payment mode">
              <select className={selectClassName} {...register("paymentMode")}>
                {["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other", "Credit"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </FormField>
          ) : null}
          {mode === "purchase" ? (
            <FormField error={errors.paidAmount?.message} label="Paid amount (INR)">
              <Input inputMode="decimal" min="0" step="0.01" type="number" {...register("paidAmount")} />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Line items</CardTitle>
          <Button onClick={() => append({ ...emptyItem })} size="sm" type="button" variant="outline"><Plus className="size-4" />Add line</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const itemPreview = calculateItemPreview(watchedItems?.[index]);
            const itemProductGstRate = watchedItems?.[index]?.productGstRate ?? "0";
            return (
            <fieldset className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-12" key={field.id}>
              <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
              <div className="lg:col-span-2">
                <FormField label="Barcode">
                  <div className="relative">
                    <ScanLine className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      {...register(`items.${index}.barcode`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyBarcode(index, event.currentTarget.value);
                        }
                      }}
                    />
                  </div>
                </FormField>
              </div>
              <div className="lg:col-span-3">
                <FormField error={errors.items?.[index]?.productId?.message} label="Product" required>
                  <select
                    className={selectClassName}
                    {...register(`items.${index}.productId`, {
                      onChange: (event) => applyProduct(index, event.target.value),
                    })}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                  </select>
                </FormField>
              </div>
              <div className="lg:col-span-1">
                <FormField error={errors.items?.[index]?.quantity?.message} label="Qty" required>
                  <Input inputMode="numeric" min="1" step="1" type="number" {...register(`items.${index}.quantity`)} />
                </FormField>
              </div>
              <div className="lg:col-span-1">
                <FormField label="Unit"><Input {...register(`items.${index}.unitCode`)} /></FormField>
              </div>
              <div className="lg:col-span-2">
                <FormField error={errors.items?.[index]?.unitRate?.message} label="Rate (INR)" required>
                  <Input inputMode="decimal" min="0" step="0.01" type="number" {...register(`items.${index}.unitRate`)} />
                </FormField>
              </div>
              <div className="lg:col-span-2">
                <FormField error={errors.items?.[index]?.discountValue?.message} label="Item discount">
                  <div className="grid grid-cols-[minmax(0,1fr)_68px] gap-2">
                    <Input inputMode="decimal" min="0" step="0.01" type="number" {...register(`items.${index}.discountValue`)} />
                    <select aria-label={`Discount type for item ${index + 1}`} className={selectClassName} {...register(`items.${index}.discountType`)}>
                      <option value="percent">%</option>
                      <option value="flat">₹</option>
                    </select>
                  </div>
                </FormField>
              </div>
              <div className="lg:col-span-1">
                <FormField error={errors.items?.[index]?.gstRate?.message} label="GST %">
                  <Input inputMode="decimal" min="0" max="100" step="0.01" type="number" {...register(`items.${index}.gstRate`)} />
                </FormField>
              </div>
              <div className="flex items-end lg:col-span-1">
                <Button aria-label={`Remove item ${index + 1}`} className="w-full" disabled={fields.length === 1} onClick={() => remove(index)} type="button" variant="ghost">
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="lg:col-span-3">
                <FormField label="HSN / SAC"><Input {...register(`items.${index}.hsnCode`)} /></FormField>
              </div>
              <input type="hidden" {...register(`items.${index}.productGstRate`)} />
              <dl className="grid gap-2 rounded-md bg-muted/60 p-3 text-xs lg:col-span-12 sm:grid-cols-5">
                <LineAmount label="Gross" value={itemPreview.grossCents} />
                <LineAmount label="Discount" value={-itemPreview.discountCents} />
                <LineAmount label="Taxable" value={itemPreview.taxableCents} />
                <LineAmount label="GST" value={itemPreview.taxCents} />
                <LineAmount label="Line total" value={itemPreview.lineTotalCents} strong />
              </dl>
              {mode === "quotation" ? (
                <p className="text-xs text-muted-foreground lg:col-span-12">
                  Product reference: HSN {watchedItems?.[index]?.hsnCode || "-"} · configured GST {itemProductGstRate || "0"}%. {quotationIncludesGst ? "GST is included in this quotation." : "GST not included."}
                </p>
              ) : null}
            </fieldset>
          );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <FormField error={errors.roundOff?.message} label="Round-off (INR)">
            <Input className="max-w-48" inputMode="decimal" step="0.01" type="number" {...register("roundOff")} />
          </FormField>
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
      {serverError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p> : null}
      <div className="flex justify-end">
        <Button disabled={Boolean(disabledReason) || isSubmitting} type="submit">
          <Save className="size-4" />{isSubmitting ? "Saving..." : `Save ${mode === "quotation" ? "quotation" : mode}`}
        </Button>
      </div>
    </form>
  );
}

function FormField({ children, error, label, required }: { children: React.ReactNode; error?: string | undefined; label: string; required?: boolean | undefined }) {
  return (
    <label className="grid content-start gap-1.5 text-sm font-medium">
      <span>{label}{required ? <span className="text-red-600"> *</span> : null}</span>
      {children}
      {error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}
    </label>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd>{money(value)}</dd></div>;
}

function LineAmount({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold text-foreground" : "font-medium"}>{money(value)}</dd>
    </div>
  );
}

function calculateItemPreview(item: TradeFormValues["items"][number] | undefined) {
  const grossCents = Math.round((Number(item?.quantity) || 0) * (Number(item?.unitRate) || 0) * 100);
  const discountInput = Number(item?.discountValue) || 0;
  const rawDiscountCents = item?.discountType === "flat"
    ? Math.round(discountInput * 100)
    : Math.round(grossCents * discountInput / 100);
  const discountCents = Math.min(Math.max(rawDiscountCents, 0), grossCents);
  const taxableCents = Math.max(grossCents - discountCents, 0);
  const taxCents = Math.round(taxableCents * (Number(item?.gstRate) || 0) / 100);
  return {
    discountCents,
    grossCents,
    lineTotalCents: taxableCents + taxCents,
    taxableCents,
    taxCents,
  };
}

function calculatePreview(items: TradeFormValues["items"] | undefined, roundOff: string | undefined) {
  const result = (items ?? []).reduce((totals, item) => {
    const preview = calculateItemPreview(item);
    return {
      discountCents: totals.discountCents + preview.discountCents,
      grossCents: totals.grossCents + preview.grossCents,
      taxCents: totals.taxCents + preview.taxCents,
      taxableCents: totals.taxableCents + preview.taxableCents,
    };
  }, { discountCents: 0, grossCents: 0, taxCents: 0, taxableCents: 0 });
  const roundOffCents = Math.round((Number(roundOff) || 0) * 100);
  return { ...result, roundOffCents, totalCents: result.taxableCents + result.taxCents + roundOffCents };
}

function defaultDocumentType(mode: TradeMode): TradeFormValues["documentType"] {
  if (mode === "purchase") return "PURCHASE_ENTRY";
  if (mode === "quotation") return "SALES_QUOTATION";
  return "SALES_ORDER";
}

function documentTitle(mode: TradeMode) {
  if (mode === "purchase") return "Purchase details";
  if (mode === "quotation") return "Quotation details";
  return "Billing details";
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

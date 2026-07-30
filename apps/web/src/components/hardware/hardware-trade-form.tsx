"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";
import { CreatableCombobox } from "./creatable-combobox";
import { HardwareProductCombobox } from "./hardware-product-combobox";
import { postHardwareJson } from "./hardware-api-client";
import { normalizeProductSearchText } from "./product-search";

const numericString = z.string().refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, {
  message: "Enter a valid non-negative number.",
});

const tradeFormSchema = z.object({
  customerAddress: z.string().max(1000),
  documentDate: z.string().min(1, "Date is required."),
  locationId: z.string(),
  documentType: z.enum(["PURCHASE_ENTRY", "PURCHASE_ORDER", "SALES_ORDER", "SALES_QUOTATION", "SUPPLIER_BILL"]),
  items: z.array(z.object({
    discountPercent: z.string().refine((value) => Number(value) >= 0 && Number(value) <= 100, {
      message: "Use 0 to 100.",
    }),
    gstRate: z.string().refine((value) => Number(value) >= 0 && Number(value) <= 100, {
      message: "Use 0 to 100.",
    }),
    hsnCode: z.string(),
    productId: z.string().min(1, "Select a product."),
    productName: z.string(),
    quantity: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "Quantity must be a positive whole number.",
    }),
    unitCode: z.string(),
    unitRate: numericString,
  })).min(1),
  partyId: z.string(),
  paidAmount: z.string().refine((value) => value === "" || Number(value) >= 0, {
    message: "Paid amount must be zero or higher.",
  }),
  paymentMode: z.enum(["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other", "Credit"]),
  referenceNumber: z.string().max(120),
  roundOff: z.string().refine((value) => value === "" || (Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 100), {
    message: "Round-off must be between -100 and 100.",
  }),
  taxMode: z.enum(["intra-state", "inter-state"]),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;
type TradeMode = "purchase" | "quotation" | "sale";

const emptyItem = {
  discountPercent: "0",
  gstRate: "0",
  hsnCode: "",
  productId: "",
  productName: "",
  quantity: "1",
  unitCode: "",
  unitRate: "",
};

export function HardwareTradeForm({
  locations = [],
  mode,
  parties,
  products,
}: {
  locations?: Array<{ id: string; name: string }>;
  mode: TradeMode;
  parties: HardwarePartySummary[];
  products: HardwareProductSummary[];
}) {
  const router = useRouter();
  const [availableParties, setAvailableParties] = useState(parties);
  const [partyName, setPartyName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = useForm<TradeFormValues>({
    defaultValues: {
      customerAddress: "",
      documentDate: new Date().toISOString().slice(0, 10),
      documentType: defaultDocumentType(mode),
      items: [{ ...emptyItem }],
      locationId: locations[0]?.id ?? "",
      partyId: "",
      paidAmount: "",
      paymentMode: mode === "purchase" ? "Credit" : "Cash",
      referenceNumber: "",
      roundOff: "0",
      taxMode: "intra-state",
    },
    resolver: zodResolver(tradeFormSchema),
  });
  const { append, fields, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedRoundOff = useWatch({ control, name: "roundOff" });
  const totals = useMemo(
    () => calculatePreview(watchedItems, watchedRoundOff),
    [watchedItems, watchedRoundOff],
  );
  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : mode === "quotation" && locations.length === 0
        ? "Add at least one stock location before creating an Estimate Bill."
        : null;

  function applyProduct(index: number, product: HardwareProductSummary) {
    const rateCents = mode === "purchase" ? product.purchaseCostCents : product.salesPriceCents;
    setValue(`items.${index}.productId`, product.id, { shouldDirty: true, shouldValidate: true });
    setValue(`items.${index}.productName`, product.name, { shouldDirty: true });
    setValue(
      `items.${index}.gstRate`,
      mode === "purchase" && product.gstRateBps !== null ? String(product.gstRateBps / 100) : "0",
      { shouldDirty: true },
    );
    setValue(`items.${index}.hsnCode`, product.hsnCode ?? "");
    setValue(`items.${index}.unitCode`, product.unitCode ?? "");
    setValue(`items.${index}.unitRate`, rateCents ? String(rateCents / 100) : "");
  }

  function updateProductQuery(index: number, query: string) {
    setValue(`items.${index}.productName`, query, { shouldDirty: true });
    setValue(`items.${index}.productId`, "", { shouldDirty: true, shouldValidate: Boolean(query) });
  }

  async function createOrSelectParty(name: string, role: "customer" | "supplier") {
    const normalizedName = normalizeProductSearchText(name);
    if (!normalizedName) throw new Error(`Enter or select a ${role} name.`);
    const exact = availableParties.find(
      (party) => normalizeProductSearchText(party.name) === normalizedName,
    );
    if (exact) {
      setPartyName(exact.name);
      setValue("partyId", exact.id, { shouldDirty: true });
      return exact.id;
    }
    const created = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
      name: name.trim(),
      role,
    });
    if (!created.ok) throw new Error(created.message);
    setAvailableParties((current) => [created.data, ...current.filter((party) => party.id !== created.data.id)]);
    setPartyName(created.data.name);
    setValue("partyId", created.data.id, { shouldDirty: true });
    return created.data.id;
  }

  async function resolvePartyId(values: TradeFormValues) {
    if (values.partyId) return values.partyId;
    return createOrSelectParty(partyName, mode === "purchase" ? "supplier" : "customer");
  }

  async function onSubmit(values: TradeFormValues) {
    setServerError(null);
    try {
      const partyId = await resolvePartyId(values);
      if (mode === "quotation" && !values.locationId) {
        setServerError("Select a stock location for this Estimate Bill.");
        return;
      }
      if (!partyId) {
        setServerError(mode === "purchase" ? "Select a supplier." : "Enter or select a customer name.");
        return;
      }

      const endpoint = mode === "purchase" ? "/api/hardware/purchases" : "/api/hardware/sales";
      const payload = {
        currency: "INR",
        ...(mode === "purchase" ? { supplierId: partyId } : { customerId: partyId }),
        items: values.items.map((item) => {
          const grossCents = Math.round(Number(item.quantity) * Number(item.unitRate) * 100);
          const discountCents = Math.round(grossCents * Number(item.discountPercent) / 100);
          return {
            discountCents,
            metadata: {
              discountPercent: Number(item.discountPercent),
              hsnCode: item.hsnCode || null,
              unitCode: item.unitCode || null,
            },
            productId: item.productId,
            quantity: Number(item.quantity),
            taxRateBps: Math.round(Number(item.gstRate) * 100),
            unitAmountCents: Math.round(Number(item.unitRate) * 100),
          };
        }),
        metadata: {
          customerAddress: mode === "purchase" ? undefined : values.customerAddress.trim() || null,
          documentDate: values.documentDate,
          estimateBill: mode === "quotation",
          gstFilingEligible: mode !== "purchase" && values.items.some((item) => Number(item.gstRate) > 0),
          paidAmountCents: mode === "purchase" ? Math.round(Number(values.paidAmount || 0) * 100) : undefined,
          paymentMode: values.paymentMode,
          referenceNumber: values.referenceNumber || null,
          stockMovementOnConfirm: mode === "quotation",
          taxMode: values.taxMode,
        },
        roundOffCents: Math.round(Number(values.roundOff || 0) * 100),
        type: values.documentType,
      };
      const result = await postHardwareJson<{ documentNumber: string; id: string }>(endpoint, payload);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      if (mode === "quotation") {
        const confirmation = await postHardwareJson<unknown>(`/api/hardware/trade/${result.data.id}/confirm`, {
          locationId: values.locationId,
        });
        if (!confirmation.ok) {
          setServerError(`Estimate Bill ${result.data.documentNumber} was saved as a draft, but stock could not be deducted: ${confirmation.message}`);
          return;
        }
        router.push(`/admin/hardware/print/${result.data.id}?print=1`);
      } else {
        router.push(mode === "purchase" ? "/admin/hardware/purchases?created=1" : "/admin/hardware/sales?created=1");
      }
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to save this document.");
    }
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
          <div className="xl:col-span-2">
            <input type="hidden" {...register("partyId")} />
            <CreatableCombobox
              createLabel={mode === "purchase" ? "Use new supplier" : "Use new customer"}
              label={mode === "purchase" ? "Supplier" : "Customer"}
              onCreate={(name) => {
                setServerError(null);
                void createOrSelectParty(name, mode === "purchase" ? "supplier" : "customer").catch((error) => {
                  setServerError(error instanceof Error ? error.message : "Party could not be created.");
                });
              }}
              onQueryChange={(query) => {
                setPartyName(query);
                const exact = availableParties.find(
                  (party) => normalizeProductSearchText(party.name) === normalizeProductSearchText(query),
                );
                setValue("partyId", exact?.id ?? "", { shouldDirty: true });
              }}
              onSelect={(id) => {
                const selected = availableParties.find((party) => party.id === id);
                setValue("partyId", id, { shouldDirty: true });
                setPartyName(selected?.name ?? "");
              }}
              options={availableParties.map((party) => ({
                id: party.id,
                keywords: [party.contact ?? ""],
                label: party.name,
              }))}
              placeholder={mode === "purchase" ? "Search or enter supplier" : "Search or enter customer"}
              value={partyName}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Existing names are selected automatically. A party can act as both customer and supplier without creating a duplicate record.
            </p>
          </div>
          {mode !== "purchase" ? (
            <FormField error={errors.customerAddress?.message} label="Address">
              <Input autoComplete="street-address" placeholder="Address for this document" {...register("customerAddress")} />
            </FormField>
          ) : null}
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
            <>
              <FormField label="Stock location" required>
                <select className={selectClassName} {...register("locationId")}>
                  <option value="">Select stock location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </FormField>
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                <p className="font-medium">Estimate Bill with stock movement</p>
                <p className="mt-1 text-xs text-muted-foreground">Each line starts at 0% GST. Selected GST lines are included in the sales GST report, and confirmed quantities are deducted from this location.</p>
              </div>
            </>
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
          <div>
            <CardTitle>Line items</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Search tolerates spelling mistakes, partial words, and words in any order. Products cannot be created here.
            </p>
          </div>
          <Button onClick={() => append({ ...emptyItem })} size="sm" type="button" variant="outline"><Plus className="size-4" />Add line</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <fieldset className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-12" key={field.id}>
              <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {index + 1}</legend>
              <div className="lg:col-span-4">
                <input type="hidden" {...register(`items.${index}.productId`)} />
                <input type="hidden" {...register(`items.${index}.productName`)} />
                <HardwareProductCombobox
                  label="Product"
                  onQueryChange={(query) => updateProductQuery(index, query)}
                  onSelect={(product) => applyProduct(index, product)}
                  products={products}
                  storageKey={`trustfirst.hardware.${mode}.product-search`}
                  value={watchedItems?.[index]?.productName ?? ""}
                />
                {errors.items?.[index]?.productId?.message ? (
                  <span className="mt-1 block text-xs font-normal text-red-700">
                    {errors.items?.[index]?.productId?.message}
                  </span>
                ) : null}
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
              <div className="lg:col-span-1">
                <FormField error={errors.items?.[index]?.discountPercent?.message} label="Disc. %">
                  <Input inputMode="decimal" min="0" max="100" step="0.01" type="number" {...register(`items.${index}.discountPercent`)} />
                </FormField>
              </div>
              <div className="lg:col-span-1">
                <FormField error={errors.items?.[index]?.gstRate?.message} label="GST %">
                  <GstRateSelect value={watchedItems?.[index]?.gstRate ?? "0"} {...register(`items.${index}.gstRate`)} />
                </FormField>
              </div>
              <div className="flex items-end lg:col-span-1">
                <Button aria-label={`Remove item ${index + 1}`} className="w-full" disabled={fields.length === 1} onClick={() => remove(index)} type="button" variant="ghost">
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="lg:col-span-2">
                <FormField label="HSN / SAC"><Input {...register(`items.${index}.hsnCode`)} /></FormField>
              </div>
            </fieldset>
          ))}
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
          <Save className="size-4" />{isSubmitting ? "Saving..." : mode === "quotation" ? "Save and print Estimate Bill" : `Save ${mode}`}
        </Button>
      </div>
    </form>
  );
}

function GstRateSelect({
  value,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { value: string }) {
  const commonRates = ["0", "5", "12", "18", "28"];
  const rates = commonRates.includes(value) ? commonRates : [value, ...commonRates];
  return (
    <select className={selectClassName} value={value} {...props}>
      {rates.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
    </select>
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

function calculatePreview(
  items: TradeFormValues["items"] | undefined,
  roundOff: string | undefined,
) {
  const result = (items ?? []).reduce((totals, item) => {
    const gross = Math.round((Number(item.quantity) || 0) * (Number(item.unitRate) || 0) * 100);
    const discount = Math.round(gross * (Number(item.discountPercent) || 0) / 100);
    const taxable = Math.max(gross - discount, 0);
    const tax = Math.round(taxable * (Number(item.gstRate) || 0) / 100);
    return {
      discountCents: totals.discountCents + discount,
      grossCents: totals.grossCents + gross,
      taxCents: totals.taxCents + tax,
      taxableCents: totals.taxableCents + taxable,
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
  if (mode === "quotation") return "Estimate Bill details";
  return "Billing details";
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

export const hardwareTradeFormTestUtils = { calculatePreview };

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

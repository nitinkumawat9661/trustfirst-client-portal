from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def path(relative: str) -> Path:
    return ROOT / relative

def read(relative: str) -> str:
    return path(relative).read_text(encoding="utf-8")

def write(relative: str, content: str) -> None:
    path(relative).write_text(content.rstrip() + "\n", encoding="utf-8")

def replace_once(relative: str, before: str, after: str) -> None:
    content = read(relative)
    count = content.count(before)
    if count != 1:
        raise RuntimeError(f"{relative}: expected one occurrence, found {count}: {before[:120]!r}")
    write(relative, content.replace(before, after, 1))


write("apps/web/src/components/hardware/hardware-inventory-panel.tsx", r'''"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { HardwareMovementSummary, HardwareProductSummary } from "@/server/hardware";
import { HardwareProductCombobox } from "./hardware-product-combobox";
import { postHardwareJson } from "./hardware-api-client";

type LocationOption = { code: string; id: string; name: string };

const movementSchema = z.object({
  locationId: z.string().min(1, "Select a location."),
  notes: z.string().max(2000),
  productId: z.string().min(1, "Select a product."),
  quantity: z.number().int().nonnegative(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
}).superRefine((value, context) => {
  if (value.type !== "ADJUSTMENT" && value.quantity === 0) {
    context.addIssue({
      code: "custom",
      message: "Stock in and stock out quantities must be greater than zero.",
      path: ["quantity"],
    });
  }
});

const locationSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
});

export function HardwareInventoryPanel({
  locations,
  movements,
  products,
}: {
  locations: LocationOption[];
  movements: HardwareMovementSummary[];
  products: HardwareProductSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(locations.length === 0);
  const [productName, setProductName] = useState("");
  const movementForm = useForm<z.infer<typeof movementSchema>>({
    defaultValues: { locationId: locations[0]?.id ?? "", notes: "", productId: "", quantity: 1, type: "STOCK_IN" },
    resolver: zodResolver(movementSchema),
  });
  const locationForm = useForm<z.infer<typeof locationSchema>>({
    defaultValues: { code: "", name: "" },
    resolver: zodResolver(locationSchema),
  });
  const movementType = useWatch({ control: movementForm.control, name: "type" });

  async function submitMovement(values: z.infer<typeof movementSchema>) {
    if (
      (values.type === "STOCK_OUT" || values.type === "ADJUSTMENT") &&
      !window.confirm(
        values.type === "ADJUSTMENT"
          ? `Set this product's stock level to ${values.quantity}?`
          : `Record stock outward quantity ${values.quantity}?`,
      )
    ) {
      return;
    }
    setError(null);
    const result = await postHardwareJson<unknown>("/api/hardware/inventory", values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    movementForm.reset({ ...values, notes: "", productId: "", quantity: 1 });
    setProductName("");
    router.refresh();
  }

  async function submitLocation(values: z.infer<typeof locationSchema>) {
    setError(null);
    const result = await postHardwareJson<unknown>("/api/hardware/locations", values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    locationForm.reset();
    setLocationOpen(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Record stock movement</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={movementForm.handleSubmit(submitMovement)}>
              <Field error={movementForm.formState.errors.type?.message} label="Movement">
                <select className={selectClassName} {...movementForm.register("type")}>
                  <option value="STOCK_IN">Stock inward</option>
                  <option value="STOCK_OUT">Stock outward</option>
                  <option value="ADJUSTMENT">Set absolute stock level</option>
                </select>
              </Field>
              <div>
                <input type="hidden" {...movementForm.register("productId")} />
                <HardwareProductCombobox
                  label="Product"
                  onQueryChange={(query) => {
                    setProductName(query);
                    movementForm.setValue("productId", "", { shouldValidate: Boolean(query) });
                  }}
                  onSelect={(product) => {
                    setProductName(product.name);
                    movementForm.setValue("productId", product.id, { shouldDirty: true, shouldValidate: true });
                  }}
                  products={products}
                  storageKey="trustfirst.hardware.inventory.product-search"
                  value={productName}
                />
                {movementForm.formState.errors.productId?.message ? (
                  <span className="mt-1 block text-xs font-normal text-red-700">
                    {movementForm.formState.errors.productId.message}
                  </span>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Typing mistakes, partial names, and words in any order are supported. Products cannot be created here.
                </p>
              </div>
              <Field error={movementForm.formState.errors.locationId?.message} label="Location / godown">
                <select className={selectClassName} {...movementForm.register("locationId")}>
                  <option value="">Select location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
              <Field
                error={movementForm.formState.errors.quantity?.message}
                label={movementType === "ADJUSTMENT" ? "New stock level" : "Quantity"}
              >
                <Input inputMode="numeric" min={movementType === "ADJUSTMENT" ? "0" : "1"} step="1" type="number" {...movementForm.register("quantity", { valueAsNumber: true })} />
              </Field>
              <Field error={movementForm.formState.errors.notes?.message} label="Reference / notes">
                <Input {...movementForm.register("notes")} />
              </Field>
              {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
              <Button className="w-full" disabled={products.length === 0 || locations.length === 0 || movementForm.formState.isSubmitting} type="submit">
                Save movement
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => setLocationOpen((open) => !open)} type="button" variant="outline"><Warehouse className="size-4" />Add stock location</Button>
        {locationOpen ? (
          <Card>
            <CardHeader><CardTitle>New stock location</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={locationForm.handleSubmit(submitLocation)}>
                <Field error={locationForm.formState.errors.name?.message} label="Location name"><Input {...locationForm.register("name")} /></Field>
                <Field error={locationForm.formState.errors.code?.message} label="Location code"><Input className="uppercase" {...locationForm.register("code")} /></Field>
                <Button disabled={locationForm.formState.isSubmitting} type="submit">Save location</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Inventory ledger</CardTitle></CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
              <p className="font-medium">No stock movements have been recorded.</p>
              <p className="mt-1 text-sm text-muted-foreground">Opening stock must be entered from verified client data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Movement</th><th className="px-3 py-3 text-right">Quantity</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {movements.map((movement) => {
                    const Icon = movement.type === "STOCK_IN" ? ArrowDownToLine : movement.type === "STOCK_OUT" ? ArrowUpFromLine : SlidersHorizontal;
                    return (
                      <tr key={movement.id}>
                        <td className="px-3 py-3">{formatDate(movement.occurredAt)}</td>
                        <td className="px-3 py-3 font-medium">{movement.productName}</td>
                        <td className="px-3 py-3">{movement.locationName}</td>
                        <td className="px-3 py-3"><span className="inline-flex items-center gap-2"><Icon className="size-4" />{movement.type.toLowerCase().replaceAll("_", " ")}</span></td>
                        <td className="px-3 py-3 text-right">{movement.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string | undefined; label: string }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}</label>;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
''')

write("apps/web/src/components/hardware/hardware-trade-form.tsx", r'''"use client";

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
  mode,
  parties,
  products,
}: {
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
    () => calculatePreview(watchedItems, watchedRoundOff, mode === "quotation"),
    [mode, watchedItems, watchedRoundOff],
  );
  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : mode === "purchase" && parties.length === 0
        ? "Add at least one supplier before creating a purchase document."
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

  async function resolveCustomerId(values: TradeFormValues) {
    if (mode === "purchase") return values.partyId;
    if (values.partyId) return values.partyId;

    const normalizedName = normalizeProductSearchText(partyName);
    if (!normalizedName) {
      throw new Error("Enter or select a customer name.");
    }

    const exact = availableParties.find(
      (party) => normalizeProductSearchText(party.name) === normalizedName,
    );
    if (exact) return exact.id;

    const created = await postHardwareJson<HardwarePartySummary>("/api/hardware/parties/quick-add", {
      name: partyName.trim(),
      role: "customer",
    });
    if (!created.ok) throw new Error(created.message);

    setAvailableParties((current) => [created.data, ...current]);
    setPartyName(created.data.name);
    setValue("partyId", created.data.id, { shouldDirty: true });
    return created.data.id;
  }

  async function onSubmit(values: TradeFormValues) {
    setServerError(null);
    try {
      const partyId = await resolveCustomerId(values);
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
            taxRateBps: mode === "quotation" ? 0 : Math.round(Number(item.gstRate) * 100),
            unitAmountCents: Math.round(Number(item.unitRate) * 100),
          };
        }),
        metadata: {
          customerAddress: mode === "purchase" ? undefined : values.customerAddress.trim() || null,
          documentDate: values.documentDate,
          estimateBill: mode === "quotation",
          gstFree: mode === "quotation",
          paidAmountCents: mode === "purchase" ? Math.round(Number(values.paidAmount || 0) * 100) : undefined,
          paymentMode: values.paymentMode,
          referenceNumber: values.referenceNumber || null,
          taxMode: mode === "quotation" ? "gst-free" : values.taxMode,
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
          {mode === "purchase" ? (
            <FormField label="Supplier" required>
              <select className={selectClassName} {...register("partyId")}>
                <option value="">Select supplier</option>
                {availableParties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </FormField>
          ) : (
            <>
              <div className="xl:col-span-2">
                <input type="hidden" {...register("partyId")} />
                <CreatableCombobox
                  label="Customer"
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
                  placeholder="Select existing or type a new customer name"
                  value={partyName}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  A new customer is created automatically with name only when no exact existing name is found.
                </p>
              </div>
              <FormField error={errors.customerAddress?.message} label="Address">
                <Input autoComplete="street-address" placeholder="Address for this document" {...register("customerAddress")} />
              </FormField>
            </>
          )}
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
          {mode !== "quotation" ? (
            <FormField label="Tax treatment">
              <select className={selectClassName} {...register("taxMode")}>
                <option value="intra-state">Intra-state (CGST + SGST)</option>
                <option value="inter-state">Inter-state (IGST)</option>
              </select>
            </FormField>
          ) : (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
              <p className="font-medium">GST-free Estimate Bill</p>
              <p className="mt-1 text-xs text-muted-foreground">GST is fixed at 0% and no stock movement is posted.</p>
            </div>
          )}
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
              {mode === "quotation" ? (
                <div className="lg:col-span-1">
                  <FormField label="GST"><Input disabled value="0%" /></FormField>
                </div>
              ) : (
                <div className="lg:col-span-1">
                  <FormField error={errors.items?.[index]?.gstRate?.message} label="GST %">
                    <GstRateSelect value={watchedItems?.[index]?.gstRate ?? "0"} {...register(`items.${index}.gstRate`)} />
                  </FormField>
                </div>
              )}
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
            <TotalRow label={mode === "quotation" ? "Net estimate value" : "Taxable value"} value={totals.taxableCents} />
            {mode !== "quotation" ? <TotalRow label="GST" value={totals.taxCents} /> : null}
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
  gstFree: boolean,
) {
  const result = (items ?? []).reduce((totals, item) => {
    const gross = Math.round((Number(item.quantity) || 0) * (Number(item.unitRate) || 0) * 100);
    const discount = Math.round(gross * (Number(item.discountPercent) || 0) / 100);
    const taxable = Math.max(gross - discount, 0);
    const tax = gstFree ? 0 : Math.round(taxable * (Number(item.gstRate) || 0) / 100);
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
''')

replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    "  onCreate: (name: string) => void;\n",
    "  onCreate?: ((name: string) => void) | undefined;\n",
)
replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    "  const showCreateAction = Boolean(normalizedQuery) && !exactName && !strongMatch;\n",
    "  const showCreateAction = Boolean(onCreate && normalizedQuery) && !exactName && !strongMatch;\n",
)
replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    "          else if (showCreateAction) onCreate(query.trim());\n",
    "          else if (showCreateAction) onCreate?.(query.trim());\n",
)
replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    '                onClick={() => onCreate(query.trim())}\n',
    '                onClick={() => onCreate?.(query.trim())}\n',
)

replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "  onSelect,\n  options,\n",
    "  onQueryChange,\n  onSelect,\n  options,\n",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "  onCreate: (name: string) => void;\n  onSelect: (id: string) => void;\n",
    "  onCreate?: ((name: string) => void) | undefined;\n  onQueryChange?: ((query: string) => void) | undefined;\n  onSelect: (id: string) => void;\n",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "           setQuery(event.target.value);\n           setOpen(true);\n           setActiveIndex(0);\n           onSelect(\"\");\n",
    "           setQuery(event.target.value);\n           setOpen(true);\n           setActiveIndex(0);\n           onSelect(\"\");\n           onQueryChange?.(event.target.value);\n",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "          else if (normalizedQuery && !exactMatch) onCreate(query.trim());\n",
    "          else if (onCreate && normalizedQuery && !exactMatch) onCreate(query.trim());\n",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "          {normalizedQuery && !exactMatch ? (\n",
    "          {onCreate && normalizedQuery && !exactMatch ? (\n",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "Search by name, SKU, part number, barcode, brand, category, size, or price.",
    "Search by name, SKU, model, brand, category, size, colour, or price—even with spelling mistakes.",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "  const barcode = normalize(product?.barcode ?? option.keywords?.[1] ?? \"\");\n",
    "",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "  const haystack = [label, sku, barcode, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(\" \ ".strip());\n".replace(" \ ", " "),
    "  const haystack = [label, sku, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(\" \ ".strip());\n".replace(" \ ", " "),
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "  if (barcode && barcode === query) return 1200;\n  if (sku && sku === query) return 1150;\n",
    "  if (sku && sku === query) return 1150;\n",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "  if (barcode.startsWith(query)) return 925;\n",
    "",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    "{product.currentStock} {product.unitCode ?? \"PCS\"}{product.barcode ? ` • ${product.barcode}` : \"\"}",
    "{product.currentStock} {product.unitCode ?? \"PCS\"}",
)

replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    'import { HardwareProductCombobox } from "./hardware-product-combobox";\n',
    'import { HardwareProductCombobox } from "./hardware-product-combobox";\nimport { normalizeProductSearchText } from "./product-search";\n',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '  const [customerId, setCustomerId] = useState("");\n',
    '  const [customerId, setCustomerId] = useState("");\n  const [customerName, setCustomerName] = useState("");\n  const [customerAddress, setCustomerAddress] = useState("");\n',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '      gstRate: product.gstRateBps === null ? "0" : String(product.gstRateBps / 100),\n',
    '      gstRate: "0",\n',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''    setSaving(true);
    const result = await postHardwareJson<PostedSale>("/api/hardware/pos/sale", {
      clientTotalCents: totals.totalCents,
      ...(customerId ? { customerId } : {}),
''',
    '''    setSaving(true);
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
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''    customer: selectedCustomer,
    firm: defaultFirm,
''',
    '''    customer: selectedCustomer,
    customerAddress,
    customerName,
    firm: defaultFirm,
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''            <div className="md:col-span-2">
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
''',
    '''            <div className="md:col-span-2">
              <CreatableCombobox
                createLabel="Use new customer"
                label="Customer"
                onCreate={(name) => setCustomerName(name)}
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
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''            <label className="grid gap-2 text-sm font-medium">
              Stock location
''',
    '''            <label className="grid gap-2 text-sm font-medium">
              Address
              <Input autoComplete="street-address" placeholder="Address for this bill" value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Stock location
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '              <p className="mt-1 text-xs text-muted-foreground">Search by name, size, part code, SKU or barcode. Price and stock appear in every result.</p>\n',
    '              <p className="mt-1 text-xs text-muted-foreground">Search by name, brand, category, SKU, model, size, or colour. Spelling mistakes and words in any order are supported.</p>\n',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '                    label="Product name / SKU / barcode"\n',
    '                    label="Product name / SKU"\n',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''                <NumberField label="GST %" value={line.gstRate} onChange={(value) => updateLine(index, { gstRate: value })} className="md:col-span-1" />
''',
    '''                <label className="grid gap-2 text-sm font-medium md:col-span-1">
                  GST %
                  <select className={selectClassName} value={line.gstRate} onChange={(event) => updateLine(index, { gstRate: event.target.value })}>
                    {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </label>
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''type BillPreview = {
  balanceCents: number;
  cashierName: string;
''',
    '''type BillPreview = {
  balanceCents: number;
  cashierName: string;
  customerAddress: string | null;
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''        <div>Customer: {bill.customerName}</div>
        {bill.customerMobile ? <div>Mobile: {bill.customerMobile}</div> : null}
''',
    '''        <div>Customer: {bill.customerName}</div>
        {bill.customerAddress ? <div>Address: {bill.customerAddress}</div> : null}
        {bill.customerMobile ? <div>Mobile: {bill.customerMobile}</div> : null}
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''  customer: HardwarePartySummary | undefined;
  firm: FirmPrintDetails;
''',
    '''  customer: HardwarePartySummary | undefined;
  customerAddress: string;
  customerName: string;
  firm: FirmPrintDetails;
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''    customerGstin: input.customer?.gstin ?? null,
    customerMobile: input.customer?.contact ?? null,
''',
    '''    customerAddress: input.customerAddress.trim() || null,
    customerGstin: input.customer?.gstin ?? null,
    customerMobile: input.customer?.contact ?? null,
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''    customerName: input.customer?.name ?? "Walk-in Customer",
''',
    '''    customerName: input.customer?.name ?? (input.customerName.trim() || "Walk-in Customer"),
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''    balanceCents: 0, cashierName: input.cashierName, cgstCents: 0, customerGstin: null, customerMobile: null, customerName: "TEST CUSTOMER", dateTime: now, discountCents: 0, documentNumber: `TEST-A4-${now.getTime()}`, firm: input.firm, footer: "TEST A4 PRINT ONLY. No sale, payment, stock, or ledger entry was created.", grandTotalCents: 0, invoiceDiscountCents: 0,
''',
    '''    balanceCents: 0, cashierName: input.cashierName, cgstCents: 0, customerAddress: null, customerGstin: null, customerMobile: null, customerName: "TEST CUSTOMER", dateTime: now, discountCents: 0, documentNumber: `TEST-A4-${now.getTime()}`, firm: input.firm, footer: "TEST A4 PRINT ONLY. No sale, payment, stock, or ledger entry was created.", grandTotalCents: 0, invoiceDiscountCents: 0,
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''<p>Customer: ${escapeHtml(bill.customerName)}</p>${bill.customerMobile ? `<p>Mobile: ${escapeHtml(bill.customerMobile)}</p>` : ""}${bill.customerGstin ? `<p>GSTIN: ${escapeHtml(bill.customerGstin)}</p>` : ""}</section>''',
    '''<p>Customer: ${escapeHtml(bill.customerName)}</p>${bill.customerAddress ? `<p>Address: ${escapeHtml(bill.customerAddress)}</p>` : ""}${bill.customerMobile ? `<p>Mobile: ${escapeHtml(bill.customerMobile)}</p>` : ""}${bill.customerGstin ? `<p>GSTIN: ${escapeHtml(bill.customerGstin)}</p>` : ""}</section>''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''  const [barcode, setBarcode] = useState("");
  const [availableBrands, setAvailableBrands] = useState(brands);
''',
    '''  const [availableBrands, setAvailableBrands] = useState(brands);
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''      ...(barcode ? { barcode } : {}),
      ...(brandId ? { brandId } : {}),
''',
    '''      ...(brandId ? { brandId } : {}),
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''          <label className="grid gap-2 text-sm font-medium">Barcode<Input value={barcode} onChange={(event) => setBarcode(event.target.value)} /></label>
''',
    "",
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''<div className="font-medium">{line.name}</div><div className="text-[9px]">{[line.sku, line.barcode, line.unitCode].filter(Boolean).join(" / ")}</div>''',
    '''<div className="font-medium">{line.name}</div><div className="text-[9px]">{[line.sku, line.unitCode].filter(Boolean).join(" / ")}</div>''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''<div class="item-meta">${escapeHtml([line.sku, line.barcode, line.unitCode].filter(Boolean).join(" / "))}</div>''',
    '''<div class="item-meta">${escapeHtml([line.sku, line.unitCode].filter(Boolean).join(" / "))}</div>''',
)

replace_once(
    "apps/web/src/server/hardware/trade-schemas.ts",
    '''  customerId: z.string().optional(),
  idempotencyKey: z.string().min(12).max(120),
''',
    '''  customerAddress: z.string().trim().max(1000).optional(),
  customerId: z.string().optional(),
  idempotencyKey: z.string().min(12).max(120),
''',
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    '''            idempotencyKey: input.idempotencyKey,
            invoiceDiscountCents,
            notes: input.notes ?? null,
            source: "quick-pos",
''',
    '''            customerAddress: input.customerAddress ?? null,
            idempotencyKey: input.idempotencyKey,
            invoiceDiscountCents,
            notes: input.notes ?? null,
            source: "quick-pos",
''',
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    '''            idempotencyKey: input.idempotencyKey,
            invoiceDiscountCents,
            notes: input.notes ?? null,
            posFlow: "quick-pos",
''',
    '''            customerAddress: input.customerAddress ?? null,
            idempotencyKey: input.idempotencyKey,
            invoiceDiscountCents,
            notes: input.notes ?? null,
            posFlow: "quick-pos",
''',
)

write("apps/web/src/app/(platform)/admin/hardware/quotations/page.tsx", r'''import { getPrisma } from "@trustfirst/database";
import { Plus } from "lucide-react";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeList } from "@/components/hardware/hardware-trade-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareQuotationsPage() {
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const trade = new HardwareTradeService(prisma);
  const hardware = new HardwareService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [documents, locations] = await Promise.all([
    trade.listQuotations(context),
    hardware.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        actionHref="/admin/hardware/quotations/new"
        actionIcon={Plus}
        actionLabel="New Estimate Bill"
        description="Create and save a GST-free estimate, then print or reprint it directly. Estimates do not move stock."
        eyebrow="Sales"
        title="Estimate Bills"
      />
      <HardwareTradeList documents={documents} emptyMessage="No Estimate Bills have been created." locations={locations} title="Estimate Bill history" />
    </div>
  );
}
''')

write("apps/web/src/app/(platform)/admin/hardware/quotations/new/page.tsx", r'''import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeForm } from "@/components/hardware/hardware-trade-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function NewHardwareQuotationPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [parties, products] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Create a saved GST-free estimate with the same advanced product search as billing. Saving opens the printable A4 Estimate Bill."
        eyebrow="Sales"
        title="New Estimate Bill"
      />
      <HardwareTradeForm mode="quotation" parties={parties} products={products} />
    </div>
  );
}
''')

write("apps/web/src/components/hardware/print-button.tsx", r'''"use client";

import { Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function PrintButton({
  autoPrint = false,
  fileName,
  label,
}: {
  autoPrint?: boolean;
  fileName?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const autoPrintStarted = useRef(false);

  useEffect(() => {
    if (fileName) document.title = fileName;
  }, [fileName]);

  const printWhenReady = useCallback(async () => {
    setStatus(fileName ? "Preparing A4 document..." : "Preparing print...");
    if (fileName) document.title = fileName;
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));
    window.print();
    setStatus(fileName ? "Print dialog opened. Save as PDF or print the A4 document." : "Print dialog opened. Confirm the printer dialog and check output.");
  }, [fileName]);

  useEffect(() => {
    if (!autoPrint || autoPrintStarted.current) return;
    autoPrintStarted.current = true;
    void printWhenReady();
  }, [autoPrint, printWhenReady]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" onClick={printWhenReady} type="button">
        <Printer className="size-4" />{label ?? (fileName ? "Print A4 document" : "Print")}
      </button>
      {status ? <p className="max-w-xs text-right text-xs text-zinc-600" role="status">{status}</p> : null}
    </div>
  );
}
''')

replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''export default async function HardwarePrintPreviewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
''',
    '''export default async function HardwarePrintPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { documentId } = await params;
  const { print } = await searchParams;
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''  const taxMode = projection.document.metadata.taxMode === "inter-state" ? "inter-state" : "intra-state";
  const documentDate =
''',
    '''  const isEstimate = projection.document.type === "SALES_QUOTATION";
  const taxMode = projection.document.metadata.taxMode === "inter-state" ? "inter-state" : "intra-state";
  const documentAddress =
    typeof projection.document.metadata.customerAddress === "string"
      ? projection.document.metadata.customerAddress
      : projection.customer?.address ?? null;
  const documentDate =
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''            <p className="font-medium">A4 invoice preview</p>
            <p className="text-xs text-zinc-600">PDF name: {pdfFileName}.pdf</p>
          </div>
          <PrintButton fileName={pdfFileName} />
''',
    '''            <p className="font-medium">A4 {isEstimate ? "Estimate Bill" : "invoice"} preview</p>
            <p className="text-xs text-zinc-600">PDF name: {pdfFileName}.pdf</p>
          </div>
          <PrintButton autoPrint={print === "1"} fileName={pdfFileName} label={isEstimate ? "Print Estimate Bill" : "Print A4 invoice"} />
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''            {projection.customer?.address ? <p className="mt-1 max-w-md leading-5">{projection.customer.address}</p> : null}
''',
    '''            {documentAddress ? <p className="mt-1 max-w-md leading-5">{documentAddress}</p> : null}
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''            <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
''',
    '''            {isEstimate ? (
              <p className="mt-2 font-semibold">GST-free estimate · No stock movement</p>
            ) : (
              <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
            )}
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''               <col style={{ width: "6%" }} />
               <col style={{ width: "10%" }} />
''',
    '''               {!isEstimate ? <col style={{ width: "6%" }} /> : null}
               <col style={{ width: isEstimate ? "16%" : "10%" }} />
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''                 <th className="px-2 py-2 text-right">GST</th>
                 <th className="px-2 py-2 text-right">Total</th>
''',
    '''                 {!isEstimate ? <th className="px-2 py-2 text-right">GST</th> : null}
                 <th className="px-2 py-2 text-right">Total</th>
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''                   <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td>
                   <td className="px-2 py-2 text-right font-medium">{money(item.lineTotalCents)}</td>
''',
    '''                   {!isEstimate ? <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td> : null}
                   <td className="px-2 py-2 text-right font-medium">{money(item.lineTotalCents)}</td>
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''            <p className="text-xs font-semibold uppercase">Tax summary</p>
            {projection.gstSummary.length ? (
              <table className="mt-2 w-full max-w-md text-xs">
                <thead className="border-b border-zinc-400 text-left"><tr><th className="py-1">Rate</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
                <tbody>{projection.gstSummary.map((row) => {
                  const cgst = taxMode === "intra-state" ? Math.floor(row.taxCents / 2) : 0;
                  const sgst = taxMode === "intra-state" ? row.taxCents - cgst : 0;
                  return <tr key={row.taxRateBps}><td className="py-1">{row.taxRateBps / 100}%</td><td>{money(row.taxableCents)}</td><td>{money(cgst)}</td><td>{money(sgst)}</td><td>{money(taxMode === "inter-state" ? row.taxCents : 0)}</td></tr>;
                })}</tbody>
              </table>
            ) : <p className="mt-2 text-xs">No tax lines.</p>}
''',
    '''            <p className="text-xs font-semibold uppercase">{isEstimate ? "Estimate summary" : "Tax summary"}</p>
            {isEstimate ? (
              <p className="mt-2 text-xs">GST-free Estimate Bill. This document does not reserve or move stock.</p>
            ) : projection.gstSummary.length ? (
              <table className="mt-2 w-full max-w-md text-xs">
                <thead className="border-b border-zinc-400 text-left"><tr><th className="py-1">Rate</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
                <tbody>{projection.gstSummary.map((row) => {
                  const cgst = taxMode === "intra-state" ? Math.floor(row.taxCents / 2) : 0;
                  const sgst = taxMode === "intra-state" ? row.taxCents - cgst : 0;
                  return <tr key={row.taxRateBps}><td className="py-1">{row.taxRateBps / 100}%</td><td>{money(row.taxableCents)}</td><td>{money(cgst)}</td><td>{money(sgst)}</td><td>{money(taxMode === "inter-state" ? row.taxCents : 0)}</td></tr>;
                })}</tbody>
              </table>
            ) : <p className="mt-2 text-xs">No tax lines.</p>}
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''            <AmountRow label={taxMode === "inter-state" ? "IGST" : "CGST + SGST"} value={projection.document.taxCents} />
''',
    '''            {!isEstimate ? <AmountRow label={taxMode === "inter-state" ? "IGST" : "CGST + SGST"} value={projection.document.taxCents} /> : null}
''',
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",
    '''  if (type === "SALES_QUOTATION") return "QUOTATION";
''',
    '''  if (type === "SALES_QUOTATION") return "ESTIMATE BILL";
''',
)

replace_once(
    "apps/web/src/components/hardware/hardware-document-actions.tsx",
    '''          ? `Convert ${document.documentNumber} into a new sales order?`
          : isStockDocument
''',
    '''          ? `Convert Estimate Bill ${document.documentNumber} into a new sales order?`
          : isStockDocument
''',
)
replace_once(
    "apps/web/src/components/hardware/hardware-document-actions.tsx",
    '''            : `Finalize ${document.documentNumber}?`,
''',
    '''            : `Finalize Estimate Bill ${document.documentNumber}?`,
''',
)
replace_once(
    "apps/web/src/components/hardware/hardware-document-actions.tsx",
    '''            <Check className="size-4" />{isQuotation ? "Finalize" : "Confirm"}
''',
    '''            <Check className="size-4" />{isQuotation ? "Finalize estimate" : "Confirm"}
''',
)
replace_once(
    "apps/web/src/components/hardware/hardware-document-actions.tsx",
    '''          <Link href={`/admin/hardware/print/${document.id}`} target="_blank"><Printer className="size-4" />Print preview</Link>
''',
    '''          <Link href={`/admin/hardware/print/${document.id}`} target="_blank"><Printer className="size-4" />{isQuotation ? "Print Estimate Bill" : "Print preview"}</Link>
''',
)
replace_once(
    "apps/web/src/components/hardware/hardware-trade-panels.tsx",
    '''                <Badge>{document.type.toLowerCase().replaceAll("_", " ")}</Badge>
''',
    '''                <Badge>{document.type === "SALES_QUOTATION" ? "estimate bill" : document.type.toLowerCase().replaceAll("_", " ")}</Badge>
''',
)

write("apps/web/src/components/hardware/estimate-bill-gst.test.ts", r'''import { describe, expect, it } from "vitest";
import { hardwareTradeFormTestUtils } from "./hardware-trade-form";
import { quickPosPrintTestUtils } from "./quick-pos-form";

const baseLine = {
  barcode: null,
  discountPercent: "0",
  gstRate: "0",
  hsnCode: null,
  productId: "product-1",
  productName: "Test product",
  quantity: "1",
  rate: "100",
  sku: "TEST-1",
  unitCode: "PCS",
};

describe("bill and estimate GST behavior", () => {
  it("keeps a normal bill GST-free until a line rate is selected", () => {
    const totals = quickPosPrintTestUtils.calculateTotals([baseLine], "0", "0");

    expect(totals.subtotalCents).toBe(10_000);
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(10_000);
  });

  it("calculates GST independently for each normal bill line", () => {
    const totals = quickPosPrintTestUtils.calculateTotals([
      { ...baseLine, gstRate: "5" },
      { ...baseLine, gstRate: "18", productId: "product-2", rate: "200" },
      { ...baseLine, gstRate: "0", productId: "product-3", rate: "50" },
    ], "0", "0");

    expect(totals.subtotalCents).toBe(35_000);
    expect(totals.taxCents).toBe(4_100);
    expect(totals.totalCents).toBe(39_100);
  });

  it("forces Estimate Bill tax to zero even when a line contains a GST value", () => {
    const estimate = hardwareTradeFormTestUtils.calculatePreview([{
      discountPercent: "0",
      gstRate: "18",
      hsnCode: "",
      productId: "product-1",
      productName: "Test product",
      quantity: "2",
      unitCode: "PCS",
      unitRate: "100",
    }], "0", true);

    expect(estimate.grossCents).toBe(20_000);
    expect(estimate.taxCents).toBe(0);
    expect(estimate.totalCents).toBe(20_000);
  });
});
''')

for ui_file in (ROOT / "apps/web/src").rglob("*.tsx"):
    content = ui_file.read_text(encoding="utf-8")
    updated = (
        content
        .replace('"Quotations"', '"Estimate Bills"')
        .replace('"Quotation history"', '"Estimate Bill history"')
        .replace('"New quotation"', '"New Estimate Bill"')
        .replace('>Quotations<', '>Estimate Bills<')
    )
    if updated != content:
        ui_file.write_text(updated, encoding="utf-8")

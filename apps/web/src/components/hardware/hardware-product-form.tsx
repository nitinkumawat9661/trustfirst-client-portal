"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { ArrowLeft, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { postHardwareJson } from "./hardware-api-client";

const optionalMoney = z.string().refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
  message: "Enter a valid amount with up to two decimals.",
});

const productFormSchema = z.object({
  barcode: z.string().max(120),
  brandId: z.string(),
  categoryId: z.string(),
  gstRate: z.string().refine((value) => value === "" || (Number(value) >= 0 && Number(value) <= 100), {
    message: "GST must be between 0 and 100.",
  }),
  hsnCode: z.string().max(20),
  lowStockThreshold: z.number().int().min(0),
  name: z.string().trim().min(2).max(240),
  purchasePrice: optionalMoney,
  salePrice: optionalMoney,
  sku: z.string().trim().max(120),
  unitId: z.string(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;
type LookupOption = { id: string; name: string };
type UnitOption = { code: string; id: string; name: string };

export function HardwareProductForm({
  brands,
  categories,
  units,
}: {
  brands: LookupOption[];
  categories: LookupOption[];
  units: UnitOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ProductFormValues>({
    defaultValues: {
      barcode: "",
      brandId: "",
      categoryId: "",
      gstRate: "",
      hsnCode: "",
      lowStockThreshold: 0,
      name: "",
      purchasePrice: "",
      salePrice: "",
      sku: "",
      unitId: "",
    },
    resolver: zodResolver(productFormSchema),
  });

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    const result = await postHardwareJson<unknown>("/api/hardware/products", {
        ...(values.barcode ? { barcode: values.barcode } : {}),
        ...(values.brandId ? { brandId: values.brandId } : {}),
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        ...(values.gstRate ? { gstTaxConfig: { rateBps: Math.round(Number(values.gstRate) * 100) } } : {}),
        ...(values.hsnCode ? { metadata: { hsnCode: values.hsnCode } } : {}),
        ...(values.purchasePrice ? { purchaseCostCents: toCents(values.purchasePrice) } : {}),
        ...(values.salePrice ? { salesPriceCents: toCents(values.salePrice) } : {}),
        ...(values.unitId ? { unitId: values.unitId } : {}),
        lowStockThreshold: values.lowStockThreshold,
        name: values.name,
        sku: values.sku,
    });
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push("/admin/hardware/products?created=1");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Simple product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field error={errors.name?.message} label="Product name" required>
            <Input autoFocus autoComplete="off" {...register("name")} />
          </Field>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium"
            onClick={() => setDetailsOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal className="size-4" />More details
          </button>
          {detailsOpen ? (
            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-3">
              <Field error={errors.sku?.message} label="Item code">
                <Input autoComplete="off" placeholder="Auto generated if blank" {...register("sku")} />
              </Field>
              <Field error={errors.barcode?.message} label="Barcode">
                <Input autoComplete="off" inputMode="numeric" {...register("barcode")} />
              </Field>
              <SelectField label="Category" options={categories} register={register("categoryId")} />
              <SelectField label="Brand" options={brands} register={register("brandId")} />
              <Field label="Unit">
                <select className={selectClassName} {...register("unitId")}>
                  <option value="">Not provided</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
                </select>
              </Field>
              <Field error={errors.hsnCode?.message} label="HSN / SAC">
                <Input autoComplete="off" {...register("hsnCode")} />
              </Field>
              <Field error={errors.gstRate?.message} label="GST rate (%)">
                <Input inputMode="decimal" min="0" max="100" step="0.01" type="number" {...register("gstRate")} />
              </Field>
              <Field error={errors.lowStockThreshold?.message} label="Low-stock alert level">
                <Input inputMode="numeric" min="0" step="1" type="number" {...register("lowStockThreshold", { valueAsNumber: true })} />
              </Field>
              <Field error={errors.purchasePrice?.message} label="Purchase price (INR)">
                <Input inputMode="decimal" min="0" step="0.01" type="number" {...register("purchasePrice")} />
              </Field>
              <Field error={errors.salePrice?.message} label="Sale price (INR)">
                <Input inputMode="decimal" min="0" step="0.01" type="number" {...register("salePrice")} />
              </Field>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {serverError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild type="button" variant="outline">
          <Link href="/admin/hardware/products"><ArrowLeft className="size-4" />Cancel</Link>
        </Button>
        <Button disabled={isSubmitting} type="submit">
          <Save className="size-4" />{isSubmitting ? "Saving..." : "Save product"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  children,
  error,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string | undefined;
  label: string;
  required?: boolean | undefined;
}) {
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span>{label}{required ? <span className="text-red-600"> *</span> : null}</span>
      {children}
      {error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  options,
  register,
}: {
  label: string;
  options: LookupOption[];
  register: UseFormRegisterReturn;
}) {
  return (
    <Field label={label}>
      <select className={selectClassName} {...register}>
        <option value="">Not provided</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </Field>
  );
}

const selectClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function toCents(value: string) {
  return Math.round(Number(value) * 100);
}

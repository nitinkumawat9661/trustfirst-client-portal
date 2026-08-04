"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { ArrowLeft, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { patchHardwareJson, postHardwareProductJson } from "./hardware-api-client";

const moneyPattern = /^\d+(\.\d{1,2})?$/u;
const optionalMoney = z.string().refine((value) => value === "" || moneyPattern.test(value), {
  message: "Enter a valid amount with up to two decimals.",
});
const requiredSalePrice = z.string()
  .min(1, "Sale price is required.")
  .refine((value) => moneyPattern.test(value), {
    message: "Enter a valid amount with up to two decimals.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Sale price must be greater than zero.",
  });

const productFormSchema = z.object({
  barcode: z.string().max(120),
  brandId: z.string(),
  categoryId: z.string(),
  gstRate: z.string().refine((value) => value === "" || (Number(value) >= 0 && Number(value) <= 100), {
    message: "GST must be between 0 and 100.",
  }),
  hsnCode: z.string().max(12).refine(
    (value) => value === "" || /^[A-Z0-9-]{2,12}$/iu.test(value.trim()),
    { message: "HSN / SAC must contain 2 to 12 letters, digits, or dashes." },
  ),
  lowStockThreshold: z.number().int().min(0),
  name: z.string().trim().min(2, "Product name must contain at least 2 characters.").max(240),
  purchasePrice: optionalMoney,
  salePrice: requiredSalePrice,
  sku: z.string().trim().max(120),
  unitId: z.string(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;
type LookupOption = { id: string; name: string };
type UnitOption = { code: string; id: string; name: string };
type SavedProductResult = { offlineQueued?: boolean };

export type HardwareProductFormProduct = {
  barcode: string;
  brandId: string;
  categoryId: string;
  gstRate: string;
  hsnCode: string;
  id: string;
  lowStockThreshold: number;
  name: string;
  purchasePrice: string;
  salePrice: string;
  sku: string;
  unitId: string;
};

export function HardwareProductForm({
  brands,
  categories,
  product,
  units,
}: {
  brands: LookupOption[];
  categories: LookupOption[];
  product?: HardwareProductFormProduct;
  units: UnitOption[];
}) {
  const router = useRouter();
  const isEditing = Boolean(product);
  const [serverError, setServerError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(isEditing);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<ProductFormValues>({
    defaultValues: {
      barcode: product?.barcode ?? "",
      brandId: product?.brandId ?? "",
      categoryId: product?.categoryId ?? "",
      gstRate: product?.gstRate ?? "",
      hsnCode: product?.hsnCode ?? "",
      lowStockThreshold: product?.lowStockThreshold ?? 0,
      name: product?.name ?? "",
      purchasePrice: product?.purchasePrice ?? "",
      salePrice: product?.salePrice ?? "",
      sku: product?.sku ?? "",
      unitId: product?.unitId ?? "",
    },
    resolver: zodResolver(productFormSchema),
  });

  const currentName = watch("name");
  const currentSalePrice = watch("salePrice");
  const canSubmit = currentName.trim().length >= 2 && moneyPattern.test(currentSalePrice) && Number(currentSalePrice) > 0;

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    if (isEditing && typeof navigator !== "undefined" && !navigator.onLine) {
      setServerError("Editing an existing product requires an internet connection so server changes cannot be overwritten silently.");
      return;
    }
    const commonPayload = {
      gstTaxConfig: values.gstRate ? { rateBps: Math.round(Number(values.gstRate) * 100) } : {},
      lowStockThreshold: values.lowStockThreshold,
      metadata: { hsnCode: values.hsnCode.trim().toUpperCase() || null },
      name: values.name.trim(),
      purchaseCostCents: values.purchasePrice ? toCents(values.purchasePrice) : 0,
      salesPriceCents: toCents(values.salePrice),
    };
    const payload = isEditing
      ? {
          ...commonPayload,
          barcode: values.barcode.trim(),
          brandId: values.brandId,
          categoryId: values.categoryId,
          sku: values.sku.trim() || product?.sku,
          unitId: values.unitId,
        }
      : {
          ...commonPayload,
          ...(values.barcode.trim() ? { barcode: values.barcode.trim() } : {}),
          ...(values.brandId ? { brandId: values.brandId } : {}),
          ...(values.categoryId ? { categoryId: values.categoryId } : {}),
          ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),
          ...(values.unitId ? { unitId: values.unitId } : {}),
        };
    const result = isEditing && product
      ? await patchHardwareJson<SavedProductResult>(`/api/hardware/products/${product.id}`, payload)
      : await postHardwareProductJson<SavedProductResult>(payload, {
          brandName: brands.find((brand) => brand.id === values.brandId)?.name ?? null,
          categoryName: categories.find((category) => category.id === values.categoryId)?.name ?? null,
          unitCode: units.find((unit) => unit.id === values.unitId)?.code ?? null,
        });
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    const status = result.data.offlineQueued ? "queued" : isEditing ? "updated" : "created";
    router.push(`/admin/hardware/products?${status}=1`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit product" : "Add single product"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.name?.message} label="Product name" required>
              <Input autoFocus autoComplete="off" placeholder="Enter product name" {...register("name")} />
            </Field>
            <Field error={errors.salePrice?.message} label="Sale price (INR)" required>
              <Input inputMode="decimal" min="0.01" step="0.01" type="number" {...register("salePrice")} />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">Product name and sale price are required. A new product can be queued offline; edits to existing products require internet.</p>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium"
            onClick={() => setDetailsOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal className="size-4" />{detailsOpen ? "Hide details" : "More details"}
          </button>
          {detailsOpen ? (
            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-3">
              <Field error={errors.sku?.message} label="Item code">
                <Input autoComplete="off" placeholder={isEditing ? undefined : "Auto generated if blank"} {...register("sku")} />
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
                <Input autoComplete="off" className="uppercase" {...register("hsnCode")} />
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
            </div>
          ) : null}
        </CardContent>
      </Card>
      {serverError ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild type="button" variant="outline">
          <Link href="/admin/hardware/products"><ArrowLeft className="size-4" />Cancel</Link>
        </Button>
        <Button disabled={isSubmitting || !canSubmit} type="submit">
          <Save className="size-4" />{isSubmitting ? "Saving..." : isEditing ? "Update product" : "Save product"}
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

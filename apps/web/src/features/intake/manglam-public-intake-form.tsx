"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from "@trustfirst/ui";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type FieldErrors, type FieldPath, type UseFormReturn } from "react-hook-form";
import {
  type ManglamPublicIntakeInput,
  manglamIntakeSections,
  manglamPublicIntakeDefaults,
  manglamPublicIntakeSchema,
} from "./manglam-intake-schema";

const draftKey = "trustfirst.public-intake.manglam-trading-demo";

const productCategoryOptions = [
  "Pipes",
  "Fittings",
  "Taps",
  "Valves",
  "Cement items",
  "Bathroom accessories",
  "Sanitary ware",
  "Fasteners",
  "Electrical hardware",
];

const unitOptions = ["Piece", "Box", "Meter", "Kg", "Bag", "Set", "Pair", "Bundle"];
const roleOptions = ["Owner", "Manager", "Sales counter", "Purchase", "Inventory", "Accountant"];
const paymentModeOptions = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];
const reportOptions = [
  "Daily sales",
  "Purchase summary",
  "Stock movement",
  "Low stock",
  "Outstanding customers",
  "Outstanding suppliers",
  "GST summary",
];

type IntakeFormReturn = UseFormReturn<ManglamPublicIntakeInput>;
type CheckboxFieldPath =
  | "access.rolesNeeded"
  | "catalog.productCategories"
  | "catalog.unitTypes"
  | "payments.paymentModes"
  | "reports.requiredReports";

export function ManglamPublicIntakeForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const form = useForm<ManglamPublicIntakeInput>({
    defaultValues: manglamPublicIntakeDefaults,
    mode: "onBlur",
    resolver: zodResolver(manglamPublicIntakeSchema),
  });

  const values = useWatch({
    control: form.control,
    defaultValue: manglamPublicIntakeDefaults,
  }) as ManglamPublicIntakeInput;
  const completedSections = useMemo(() => countCompletedSections(values), [values]);
  const progress = Math.round((completedSections / manglamIntakeSections.length) * 100);

  useEffect(() => {
    const stored = window.localStorage.getItem(draftKey);
    if (!stored) return;

    try {
      const parsed = manglamPublicIntakeSchema.parse(JSON.parse(stored));
      form.reset(parsed);
      window.setTimeout(() => setDraftRestored(true), 0);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [form]);

  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify(values));
  }, [values]);

  async function onSubmit(input: ManglamPublicIntakeInput) {
    setSubmitError(null);

    const response = await fetch("/api/public/intake/manglam-trading-demo", {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      submissionNumber?: string;
    } | null;

    if (!response.ok || !payload?.submissionNumber) {
      setSubmitError(payload?.error ?? "Submission failed. Please review the form and try again.");
      return;
    }

    window.localStorage.removeItem(draftKey);
    router.push(`/intake/manglam-trading-demo/thank-you?submission=${encodeURIComponent(payload.submissionNumber)}`);
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge>Public requirement intake</Badge>
              <CardTitle className="mt-3 text-2xl leading-tight">Manglam Trading demo requirement form</CardTitle>
              <CardDescription>
                Share the operational details needed to prepare the hardware and sanitary ERP demo.
              </CardDescription>
            </div>
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <span className="block font-semibold">{progress}% complete</span>
              <span className="text-muted-foreground">{completedSections} of 10 sections</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${progress}% complete`}>
            <div className="h-full bg-primary transition-all motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
          {draftRestored ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Previous draft restored on this device.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Section title="A. Contact and firm details">
        <TextInput form={form} label="Firm name" name="company.firmName" required />
        <TextInput form={form} label="Contact person" name="company.contactName" required />
        <TextInput form={form} label="Phone number" name="company.phone" required />
        <TextInput form={form} label="Email address" name="company.email" type="email" />
        <TextInput form={form} label="Role in business" name="company.role" />
      </Section>

      <Section title="B. Business profile">
        <TextAreaInput form={form} label="Business address" name="business.address" required />
        <TextInput form={form} label="Business type" name="business.businessType" />
        <TextInput form={form} label="GSTIN placeholder or GST status" name="business.gstin" />
        <TextInput form={form} label="Counters, branches, or godowns" name="business.countersOrBranches" />
        <TextInput form={form} label="Approximate users/team size" name="business.teamSize" />
      </Section>

      <Section title="C. Product catalog">
        <CheckboxGroup form={form} label="Product categories" name="catalog.productCategories" options={productCategoryOptions} />
        <CheckboxGroup form={form} label="Units used" name="catalog.unitTypes" options={unitOptions} />
        <TextAreaInput form={form} label="Brand and category handling" name="catalog.brandHandling" />
        <TextAreaInput form={form} label="SKU, item code, and naming needs" name="catalog.skuNeeds" />
        <TextAreaInput form={form} label="Barcode usage or plans" name="catalog.barcodeUsage" />
      </Section>

      <Section title="D. Stock and godown">
        <TextAreaInput form={form} label="Stock locations and godowns" name="inventory.godowns" />
        <TextAreaInput form={form} label="Opening stock readiness" name="inventory.openingStockReadiness" />
        <TextAreaInput form={form} label="Stock tracking expectations" name="inventory.stockTracking" />
        <TextAreaInput form={form} label="Low stock alerts" name="inventory.lowStockAlerts" />
        <TextAreaInput form={form} label="Stock adjustment and return needs" name="inventory.stockAdjustmentNeeds" />
      </Section>

      <Section title="E. Sales and billing">
        <TextAreaInput form={form} label="Quotation flow" name="sales.quotationFlow" />
        <TextAreaInput form={form} label="Billing and sale invoice flow" name="sales.billingFlow" />
        <TextAreaInput form={form} label="Discount needs" name="sales.discountNeeds" />
        <TextAreaInput form={form} label="GST billing expectations" name="sales.gstBilling" />
        <TextAreaInput form={form} label="A4 print format expectations" name="sales.printFormat" />
      </Section>

      <Section title="F. Purchase and suppliers">
        <TextAreaInput form={form} label="Supplier management" name="purchase.supplierManagement" />
        <TextAreaInput form={form} label="Purchase entry and supplier bill needs" name="purchase.purchaseEntryNeeds" />
        <TextAreaInput form={form} label="Supplier payment and outstanding expectations" name="purchase.supplierPayments" />
      </Section>

      <Section title="G. Payments and outstanding">
        <CheckboxGroup form={form} label="Payment modes" name="payments.paymentModes" options={paymentModeOptions} />
        <TextAreaInput form={form} label="Customer outstanding tracking" name="payments.outstandingTracking" />
        <TextAreaInput form={form} label="Credit terms or reminders" name="payments.creditTerms" />
      </Section>

      <Section title="H. Reports and dashboard">
        <CheckboxGroup form={form} label="Required reports" name="reports.requiredReports" options={reportOptions} />
        <TextAreaInput form={form} label="Owner dashboard expectations" name="reports.dashboardNeeds" />
        <TextAreaInput form={form} label="Excel/PDF export needs" name="reports.exportNeeds" />
      </Section>

      <Section title="I. Users, language, offline">
        <CheckboxGroup form={form} label="Roles needed" name="access.rolesNeeded" options={roleOptions} />
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="languagePreference">Preferred language</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="languagePreference"
            {...form.register("access.languagePreference")}
          >
            <option value="both">Hindi and English</option>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
          </select>
        </div>
        <TextAreaInput form={form} label="Offline or mobile usage needs" name="access.offlineNeed" />
      </Section>

      <Section title="J. Current issues and demo success">
        <TextAreaInput form={form} label="Current software or manual process" name="notes.currentSoftware" />
        <TextAreaInput form={form} label="Main pain points" name="notes.painPoints" required />
        <TextAreaInput form={form} label="What should the demo prove?" name="notes.successCriteria" required />
        <TextInput form={form} label="Target demo date or urgency" name="notes.targetDemoDate" />
      </Section>

      {submitError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {submitError}
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-md sm:border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            This public form only submits requirements. It does not expose admin data.
          </p>
          <Button className="w-full sm:w-auto" disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit requirement
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

function TextInput({
  form,
  label,
  name,
  required = false,
  type = "text",
}: {
  form: IntakeFormReturn;
  label: string;
  name: FieldPath<ManglamPublicIntakeInput>;
  required?: boolean;
  type?: string;
}) {
  const error = form.formState.errors;
  const message = errorAtPath(error, name);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={name}>{label}{required ? " *" : ""}</label>
      <Input id={name} type={type} {...form.register(name)} aria-invalid={Boolean(message)} />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}

function TextAreaInput({
  form,
  label,
  name,
  required = false,
}: {
  form: IntakeFormReturn;
  label: string;
  name: FieldPath<ManglamPublicIntakeInput>;
  required?: boolean;
}) {
  const message = errorAtPath(form.formState.errors, name);

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium" htmlFor={name}>{label}{required ? " *" : ""}</label>
      <Textarea id={name} rows={4} {...form.register(name)} aria-invalid={Boolean(message)} />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}

function CheckboxGroup({
  form,
  label,
  name,
  options,
}: {
  form: IntakeFormReturn;
  label: string;
  name: CheckboxFieldPath;
  options: string[];
}) {
  const currentValue = (form.watch(name) as string[] | undefined) ?? [];
  const message = errorAtPath(form.formState.errors, name);

  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm" key={option}>
            <input
              checked={currentValue.includes(option)}
              className="size-4"
              onChange={(event) => {
                const next = event.target.checked
                  ? [...currentValue, option]
                  : currentValue.filter((value) => value !== option);
                form.setValue(name, next as never, { shouldDirty: true, shouldValidate: true });
              }}
              type="checkbox"
            />
            {option}
          </label>
        ))}
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </fieldset>
  );
}

function errorAtPath(errors: FieldErrors<ManglamPublicIntakeInput>, path: string): string | null {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, errors);

  if (!value || typeof value !== "object") return null;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function countCompletedSections(values: ManglamPublicIntakeInput) {
  const checks = [
    Boolean(values.company.firmName && values.company.contactName && values.company.phone),
    Boolean(values.business.address),
    values.catalog.productCategories.length > 0 && values.catalog.unitTypes.length > 0,
    Boolean(values.inventory.godowns || values.inventory.stockTracking || values.inventory.openingStockReadiness),
    Boolean(values.sales.quotationFlow || values.sales.billingFlow || values.sales.printFormat),
    Boolean(values.purchase.supplierManagement || values.purchase.purchaseEntryNeeds),
    values.payments.paymentModes.length > 0,
    values.reports.requiredReports.length > 0,
    values.access.rolesNeeded.length > 0 || Boolean(values.access.offlineNeed),
    Boolean(values.notes.painPoints && values.notes.successCriteria),
  ];

  return checks.filter(Boolean).length;
}

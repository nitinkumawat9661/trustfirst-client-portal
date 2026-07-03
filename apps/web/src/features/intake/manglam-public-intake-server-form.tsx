import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from "@trustfirst/ui";
import { ShieldCheck } from "lucide-react";

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

export function ManglamPublicIntakeServerForm() {
  return (
    <form action="/api/public/intake/manglam-trading-demo" className="space-y-5" method="post">
      <Card>
        <CardHeader>
          <Badge>Public requirement intake</Badge>
          <CardTitle className="mt-3 text-2xl leading-tight">Software Requirement Form</CardTitle>
          <CardDescription>
            This form is public and write-only. It does not expose admin data or previous submissions.
          </CardDescription>
        </CardHeader>
      </Card>

      <Section title="Business Details">
        <TextInput label="Firm name" name="company.firmName" required />
        <TextInput label="Contact person" name="company.contactName" required />
        <TextInput label="Phone number" name="company.phone" required />
        <TextInput label="Email address" name="company.email" type="email" />
        <TextInput label="Role in business" name="company.role" />
        <TextAreaInput label="Business address" name="business.address" required />
        <TextInput defaultValue="Hardware and sanitary trading" label="Business type" name="business.businessType" />
        <TextInput label="GSTIN placeholder or GST status" name="business.gstin" />
        <TextInput label="Counters, branches, or godowns" name="business.countersOrBranches" />
        <TextInput label="Approximate users/team size" name="business.teamSize" />
      </Section>

      <Section title="Product/Catalog Details">
        <CheckboxGroup label="Product categories" name="catalog.productCategories" options={productCategoryOptions} />
        <CheckboxGroup label="Units used" name="catalog.unitTypes" options={unitOptions} />
        <TextAreaInput label="Brand and category handling" name="catalog.brandHandling" />
        <TextAreaInput label="SKU, item code, and naming needs" name="catalog.skuNeeds" />
        <TextAreaInput label="Barcode usage or plans" name="catalog.barcodeUsage" />
      </Section>

      <Section title="Stock Details">
        <TextAreaInput label="Stock locations and godowns" name="inventory.godowns" />
        <TextAreaInput label="Opening stock readiness" name="inventory.openingStockReadiness" />
        <TextAreaInput label="Stock tracking expectations" name="inventory.stockTracking" />
        <TextAreaInput label="Low stock alerts" name="inventory.lowStockAlerts" />
        <TextAreaInput label="Stock adjustment and return needs" name="inventory.stockAdjustmentNeeds" />
      </Section>

      <Section title="Supplier/Customer Details">
        <TextAreaInput label="Supplier management" name="purchase.supplierManagement" />
        <TextAreaInput label="Purchase entry and supplier bill needs" name="purchase.purchaseEntryNeeds" />
        <TextAreaInput label="Supplier payment and outstanding expectations" name="purchase.supplierPayments" />
        <TextAreaInput label="Customer outstanding tracking" name="payments.outstandingTracking" />
        <TextAreaInput label="Credit terms or reminders" name="payments.creditTerms" />
      </Section>

      <Section title="Billing Details">
        <TextAreaInput label="Quotation flow" name="sales.quotationFlow" />
        <TextAreaInput label="Billing and sale invoice flow" name="sales.billingFlow" />
        <TextAreaInput label="Discount needs" name="sales.discountNeeds" />
        <TextAreaInput label="GST billing expectations" name="sales.gstBilling" />
        <TextAreaInput label="A4 print format expectations" name="sales.printFormat" />
        <CheckboxGroup label="Payment modes" name="payments.paymentModes" options={paymentModeOptions} />
      </Section>

      <Section title="Reports, Access And Demo Success">
        <CheckboxGroup label="Required reports" name="reports.requiredReports" options={reportOptions} />
        <TextAreaInput label="Owner dashboard expectations" name="reports.dashboardNeeds" />
        <TextAreaInput label="Excel/PDF export needs" name="reports.exportNeeds" />
        <CheckboxGroup label="Roles needed" name="access.rolesNeeded" options={roleOptions} />
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="access.languagePreference">Preferred language</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue="both"
            id="access.languagePreference"
            name="access.languagePreference"
          >
            <option value="both">Hindi and English</option>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
          </select>
        </div>
        <TextAreaInput label="Offline or mobile usage needs" name="access.offlineNeed" />
        <TextAreaInput label="Current software or manual process" name="notes.currentSoftware" />
        <TextAreaInput label="Main pain points" name="notes.painPoints" required />
        <TextAreaInput label="What should the demo prove?" name="notes.successCriteria" required />
        <TextInput label="Target demo date or urgency" name="notes.targetDemoDate" />
      </Section>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-md sm:border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            Public users can submit requirements only. Admin routes remain protected.
          </p>
          <Button className="w-full sm:w-auto" type="submit">Submit</Button>
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
  defaultValue,
  label,
  name,
  required = false,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={name}>{label}{required ? " *" : ""}</label>
      <Input defaultValue={defaultValue} id={name} name={name} required={required} type={type} />
    </div>
  );
}

function TextAreaInput({
  label,
  name,
  required = false,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium" htmlFor={name}>{label}{required ? " *" : ""}</label>
      <Textarea id={name} name={name} required={required} rows={4} />
    </div>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm" key={option}>
            <input className="size-4" name={name} type="checkbox" value={option} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

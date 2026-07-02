import { Badge, Card, CardContent, CardHeader, CardTitle, Input } from "@trustfirst/ui";
import { Languages, ScanLine } from "lucide-react";
import { hardwareLabels, hardwareLanguageSwitcherContract, type HardwareLanguage } from "@/server/hardware";

export function HardwareLanguageSwitcherContract() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Languages aria-hidden className="size-5 text-muted-foreground" />
          <CardTitle>{hardwareLabels.en.product} / {hardwareLabels.hi.product}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-md border border-border p-3">Default: {hardwareLanguageSwitcherContract.defaultLanguage}</div>
        <div className="rounded-md border border-border p-3">Storage: {hardwareLanguageSwitcherContract.storageKey}</div>
        <div className="rounded-md border border-border p-3">Languages: {hardwareLanguageSwitcherContract.supportedLanguages.join(", ")}</div>
      </CardContent>
    </Card>
  );
}

export function BarcodeProductForm({ language = "en" }: { language?: HardwareLanguage }) {
  const labels = hardwareLabels[language];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ScanLine aria-hidden className="size-5 text-muted-foreground" />
          <CardTitle>{labels.product}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          SKU
          <Input autoFocus placeholder="SKU-001" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {labels.barcode}
          <Input inputMode="numeric" placeholder="Scan or type barcode" />
        </label>
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Keyboard-first entry: SKU, barcode, quantity, price, Enter to continue.
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingBarcodeSearch() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ScanLine aria-hidden className="size-5 text-muted-foreground" />
          <CardTitle>{hardwareLabels.en.billing}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Input
          aria-label="Barcode search"
          autoComplete="off"
          inputMode="numeric"
          placeholder="Scan barcode to add item"
        />
        <div className="flex flex-wrap gap-2">
          <Badge>Enter adds item</Badge>
          <Badge>Tab moves field</Badge>
        </div>
        <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground sm:col-span-2">
          Mobile billing layout keeps barcode, quantity, discount, and payment entry in a single-column scan flow below
          640px.
        </div>
      </CardContent>
    </Card>
  );
}

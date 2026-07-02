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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ScanLine aria-hidden className="size-5 text-muted-foreground" />
          <CardTitle>{hardwareLabels.en.billing}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Input aria-label="Barcode search" placeholder="Scan barcode to add item" />
        <Badge>Enter</Badge>
      </CardContent>
    </Card>
  );
}

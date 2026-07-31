from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {relative}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Quick POS: keyboard order quantity -> discount -> GST -> next product.
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const completedLines = useMemo(() => completedBillingLines(lines), [lines]);''',
    '''  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const discountInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const gstInputRefs = useRef<Array<HTMLSelectElement | null>>([]);
  const completedLines = useMemo(() => completedBillingLines(lines), [lines]);''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''  function advanceFromQuantity(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const line = lines[index];
    if (!line?.productId) {
      productInputRefs.current[index]?.focus();
      return;
    }
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) {
      setLines((current) => [...current, { ...emptyLine }]);
    }
    focusProduct(action.nextIndex);
  }
''',
    '''  function advanceFromQuantity(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    const line = lines[index];
    if (!line?.productId) {
      productInputRefs.current[index]?.focus();
      return;
    }
    const discountInput = discountInputRefs.current[index];
    discountInput?.focus();
    discountInput?.select();
  }

  function advanceFromDiscount(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    gstInputRefs.current[index]?.focus();
  }

  function advanceFromGst(index: number, event: KeyboardEvent<HTMLSelectElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) {
      setLines((current) => [...current, { ...emptyLine }]);
    }
    focusProduct(action.nextIndex);
  }
''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''              <p className="mt-1 text-xs text-muted-foreground">Type a product and press Enter, enter quantity, then press Enter again for the next line. Spelling mistakes, partial names, and words in any order are supported.</p>''',
    '''              <p className="mt-1 text-xs text-muted-foreground">Product → Enter → quantity → Enter → discount → Enter → GST → Enter → next product. Untouched blank rows do not block posting.</p>''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''                <NumberField label="Rate" value={line.rate} onChange={(value) => updateLine(index, { rate: value })} className="md:col-span-2" />
                <NumberField label="Disc. %" value={line.discountPercent} onChange={(value) => updateLine(index, { discountPercent: value })} className="md:col-span-1" />
                <label className="grid gap-2 text-sm font-medium md:col-span-1">
                  GST %
                  <select className={selectClassName} value={line.gstRate} onChange={(event) => updateLine(index, { gstRate: event.target.value })}>
                    {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </label>''',
    '''                <NumberField label="Rate" value={line.rate} onChange={(value) => updateLine(index, { rate: value })} className="md:col-span-2" />
                <NumberField
                  className="md:col-span-1"
                  inputRef={(node) => { discountInputRefs.current[index] = node; }}
                  label="Disc. %"
                  onChange={(value) => updateLine(index, { discountPercent: value })}
                  onKeyDown={(event) => advanceFromDiscount(index, event)}
                  value={line.discountPercent}
                />
                <label className="grid gap-2 text-sm font-medium md:col-span-1">
                  GST %
                  <select
                    ref={(node) => { gstInputRefs.current[index] = node; }}
                    className={selectClassName}
                    value={line.gstRate}
                    onChange={(event) => updateLine(index, { gstRate: event.target.value })}
                    onKeyDown={(event) => advanceFromGst(index, event)}
                  >
                    {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </label>''',
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    '''function NumberField({''',
    '''function isPlainEnter(event: KeyboardEvent<HTMLElement>) {
  return event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
}

function NumberField({''',
)

# Estimate Bill: ignore untouched blank rows and use the same keyboard sequence.
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''import { nextBillingLineAction } from "./billing-keyboard";
import { CreatableCombobox } from "./creatable-combobox";''',
    '''import { nextBillingLineAction } from "./billing-keyboard";
import { canPostBillingLines, completedBillingLines } from "./billing-lines";
import { CreatableCombobox } from "./creatable-combobox";''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const totals = useMemo(() => calculateEstimateTotals(lines, roundOff), [lines, roundOff]);''',
    '''  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const discountInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const gstInputRefs = useRef<Array<HTMLSelectElement | null>>([]);
  const normalizedLines = useMemo(() => lines.map((line) => ({ ...line, rate: line.unitRate })), [lines]);
  const completedLines = useMemo(() => completedBillingLines(normalizedLines), [normalizedLines]);
  const canSaveEstimate = canPostBillingLines(normalizedLines) && completedLines.every(
    (line) => Number.isInteger(Number(line.quantity)) && Number(line.unitRate) > 0,
  );
  const totals = useMemo(() => calculateEstimateTotals(completedLines, roundOff), [completedLines, roundOff]);''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''  function advanceFromQuantity(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (!lines[index]?.productId) {
      productInputRefs.current[index]?.focus();
      return;
    }
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) setLines((current) => [...current, { ...emptyLine }]);
    focusProduct(action.nextIndex);
  }
''',
    '''  function advanceFromQuantity(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    if (!lines[index]?.productId) {
      productInputRefs.current[index]?.focus();
      return;
    }
    const discountInput = discountInputRefs.current[index];
    discountInput?.focus();
    discountInput?.select();
  }

  function advanceFromDiscount(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    gstInputRefs.current[index]?.focus();
  }

  function advanceFromGst(index: number, event: KeyboardEvent<HTMLSelectElement>) {
    if (!isPlainEnter(event)) return;
    event.preventDefault();
    const action = nextBillingLineAction(index, lines.length);
    if (action.append) setLines((current) => [...current, { ...emptyLine }]);
    focusProduct(action.nextIndex);
  }
''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''    if (!canSave(lines)) return setServerError("Select every product and enter valid quantity and rate.");''',
    '''    if (!canSaveEstimate) return setServerError("Select every product and enter valid quantity and rate. Untouched blank rows are allowed.");''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''      const items = lines.map((line) => {''',
    '''      const items = completedLines.map((line) => {''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''        gstFilingEligible: lines.some((line) => Number(line.gstRate) > 0),''',
    '''        gstFilingEligible: completedLines.some((line) => Number(line.gstRate) > 0),''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''              Type product → Enter → quantity → Enter → next product. GST starts at 0% and is changed only on required lines.''',
    '''              Product → Enter → quantity → Enter → discount → Enter → GST → Enter → next product. Untouched blank rows do not block saving.''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''              <Field className="lg:col-span-1" label="Disc. %">
                <Input inputMode="decimal" max="100" min="0" onChange={(event) => updateLine(index, { discountPercent: event.target.value })} step="0.01" type="number" value={line.discountPercent} />
              </Field>
              <Field className="lg:col-span-1" label="GST %">
                <select className={selectClassName} onChange={(event) => updateLine(index, { gstRate: event.target.value })} value={line.gstRate}>
                  {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </Field>''',
    '''              <Field className="lg:col-span-1" label="Disc. %">
                <Input
                  ref={(node) => { discountInputRefs.current[index] = node; }}
                  inputMode="decimal"
                  max="100"
                  min="0"
                  onChange={(event) => updateLine(index, { discountPercent: event.target.value })}
                  onKeyDown={(event) => advanceFromDiscount(index, event)}
                  step="0.01"
                  type="number"
                  value={line.discountPercent}
                />
              </Field>
              <Field className="lg:col-span-1" label="GST %">
                <select
                  ref={(node) => { gstInputRefs.current[index] = node; }}
                  className={selectClassName}
                  onChange={(event) => updateLine(index, { gstRate: event.target.value })}
                  onKeyDown={(event) => advanceFromGst(index, event)}
                  value={line.gstRate}
                >
                  {["0", "5", "12", "18", "28"].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </Field>''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {''',
    '''function isPlainEnter(event: KeyboardEvent<HTMLElement>) {
  return event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''function canSave(lines: EstimateLine[]) {
  return lines.length > 0 && lines.every(
    (line) => line.productId && Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0 && Number(line.unitRate) >= 0,
  );
}

''',
    '''''',
)

# Print only the invoice root in a clean document, never the ERP shell or preview screen.
print_button = '''"use client";

import { Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function buildIsolatedPrintDocument(input: {
  baseHref: string;
  billHtml: string;
  stylesHtml: string;
  title: string;
}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(input.baseHref)}" />
  <title>${escapeHtml(input.title)}</title>
  ${input.stylesHtml}
  <style>
    @page { size: A4 portrait; margin: 5mm 6mm; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body { width: auto !important; min-height: 0 !important; overflow: visible !important; }
    .no-print { display: none !important; }
    .print-sheet {
      width: 100% !important;
      max-width: none !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    .print-table { min-width: 0 !important; }
  </style>
</head>
<body>${input.billHtml}</body>
</html>`;
}

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
    const printRoot = document.querySelector<HTMLElement>(".print-sheet");
    if (!printRoot) {
      setStatus("Printable bill was not found.");
      return;
    }

    setStatus(fileName ? "Preparing bill-only A4 document..." : "Preparing bill-only print...");
    const clone = printRoot.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".no-print").forEach((node) => node.remove());
    const stylesHtml = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");
    const title = fileName ?? "Mangalam Sanitary Bill";
    const printWindow = window.open("", "_blank", "width=1050,height=850");
    if (!printWindow) {
      setStatus("Popup blocked. Allow popups for this site and try again.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(buildIsolatedPrintDocument({
      baseHref: `${window.location.origin}/`,
      billHtml: clone.outerHTML,
      stylesHtml,
      title,
    }));
    printWindow.document.close();

    const images = Array.from(printWindow.document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));
    await printWindow.document.fonts?.ready;
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 150);
    setStatus("Bill-only print dialog opened. Save as PDF or print on A4.");
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
'''
(ROOT / "apps/web/src/components/hardware/print-button.tsx").write_text(print_button, encoding="utf-8")

print_test = '''import { describe, expect, it } from "vitest";
import { buildIsolatedPrintDocument } from "./print-button";

describe("bill-only print document", () => {
  it("contains only the supplied bill root and A4 print contract", () => {
    const html = buildIsolatedPrintDocument({
      baseHref: "https://app.mangalamsanitary.in/",
      billHtml: '<section class="print-sheet"><h1>Tax Invoice</h1></section>',
      stylesHtml: "<style>.print-sheet{color:#000}</style>",
      title: "MS-INV-1",
    });

    expect(html).toContain('class="print-sheet"');
    expect(html).toContain("Tax Invoice");
    expect(html).toContain("@page { size: A4 portrait; margin: 5mm 6mm; }");
    expect(html).not.toContain("ERP top header");
    expect(html).not.toContain("Sync widget");
  });
});
'''
(ROOT / "apps/web/src/components/hardware/print-button.test.ts").write_text(print_test, encoding="utf-8")

# Estimate stock must never be silently skipped.
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    '''    const stockItems = document.items.filter((item) => !isStockSetupPending(item.product?.metadata));
    const purchasePaidAmountCents = purchasePaymentAmountFromMetadata(document.metadata, document.totalCents);
    const isEstimateSale = document.type === HardwareTradeDocumentType.SALES_QUOTATION;''',
    '''    const isEstimateSale = document.type === HardwareTradeDocumentType.SALES_QUOTATION;
    const stockItems = isEstimateSale
      ? document.items
      : document.items.filter((item) => !isStockSetupPending(item.product?.metadata));
    const purchasePaidAmountCents = purchasePaymentAmountFromMetadata(document.metadata, document.totalCents);''',
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    '''    const stockOutTypes = new Set<HardwareTradeDocumentType>([
      HardwareTradeDocumentType.SALES_ORDER,
      HardwareTradeDocumentType.PURCHASE_RETURN,
    ]);
    if (!stockOutTypes.has(document.type)) return;
    for (const item of document.items) {
      if (isStockSetupPending(item.product?.metadata)) continue;
      const movements = await this.prisma.hardwareInventoryMovement.findMany({
        where: { locationId, productId: item.productId, tenantId },
      });
      if (item.quantity > stockForProduct(movements)) {
        throw validation("Confirmed sale or return cannot deduct more stock than available.");
      }
    }''',
    '''    const stockOutTypes = new Set<HardwareTradeDocumentType>([
      HardwareTradeDocumentType.SALES_ORDER,
      HardwareTradeDocumentType.SALES_QUOTATION,
      HardwareTradeDocumentType.PURCHASE_RETURN,
    ]);
    if (!stockOutTypes.has(document.type)) return;
    const isEstimateSale = document.type === HardwareTradeDocumentType.SALES_QUOTATION;
    for (const item of document.items) {
      if (!isEstimateSale && isStockSetupPending(item.product?.metadata)) continue;
      const movements = await this.prisma.hardwareInventoryMovement.findMany({
        where: { locationId, productId: item.productId, tenantId },
      });
      if (item.quantity > stockForProduct(movements)) {
        throw validation("Confirmed sale, Estimate Bill, or return cannot deduct more stock than available.");
      }
    }''',
)
replace_once(
    "apps/web/src/server/hardware/estimate-sale-lifecycle.test.ts",
    '''        product: { metadata: {}, unit: { code: "PCS" } },''',
    '''        product: { metadata: { stockSetupStatus: "PENDING" }, unit: { code: "PCS" } },''',
)
replace_once(
    "apps/web/src/server/hardware/estimate-sale-lifecycle.test.ts",
    '''  it("confirms an Estimate as stock-out plus customer receivable and allocated payment", async () => {''',
    '''  it("confirms an Estimate as stock-out even when stale metadata still says stock setup pending", async () => {''',
)

# E2E: verify keyboard order and blank trailing rows for both bill types.
replace_once(
    "e2e/mangalam-erp.spec.ts",
    '''  await saleQuantity.fill("1");
  await saleQuantity.press("Enter");
  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();''',
    '''  await saleQuantity.fill("1");
  await saleQuantity.press("Enter");
  const saleDiscount = page.getByLabel("Disc. %", { exact: true }).first();
  await expect(saleDiscount).toBeFocused();
  await saleDiscount.fill("5");
  await saleDiscount.press("Enter");
  const saleGst = page.getByLabel("GST %", { exact: true }).first();
  await expect(saleGst).toBeFocused();
  await saleGst.selectOption("18");
  await saleGst.press("Enter");
  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();''',
)
replace_once(
    "e2e/mangalam-erp.spec.ts",
    '''  const estimateItem = page.locator("fieldset").filter({ hasText: "Item 1" }).first();
  await estimateItem.locator("select").selectOption("18");
  await page.getByRole("button", { name: "Save and print Estimate Bill" }).click();''',
    '''  const estimateQuantity = page.getByLabel("Qty", { exact: true }).first();
  await expect(estimateQuantity).toBeFocused();
  await estimateQuantity.press("Enter");
  const estimateDiscount = page.getByLabel("Disc. %", { exact: true }).first();
  await expect(estimateDiscount).toBeFocused();
  await estimateDiscount.fill("3");
  await estimateDiscount.press("Enter");
  const estimateGst = page.getByLabel("GST %", { exact: true }).first();
  await expect(estimateGst).toBeFocused();
  await estimateGst.selectOption("18");
  await estimateGst.press("Enter");
  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save and print Estimate Bill" }).click();''',
)

print("BILLING_PRINT_ESTIMATE_STOCK_FIX_MATERIALIZED")

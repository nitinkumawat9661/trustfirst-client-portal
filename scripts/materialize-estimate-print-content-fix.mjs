import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) {
    throw new Error(`Expected source block was not found in ${path}: ${before.slice(0, 120)}`);
  }
  writeFileSync(path, source.replace(before, after));
}

function write(path, content) {
  writeFileSync(path, `${content.trim()}\n`);
}

write("apps/web/src/lib/hardware/estimate-money.ts", `
export type EstimateMoneyLine = {
  discountCents?: number | null;
  quantity: number;
  taxCents?: number | null;
  taxRateBps?: number | null;
  unitAmountCents: number;
};

export type EstimateMoneyTotals = {
  discountCents: number;
  grossCents: number;
  roundOffCents: number;
  taxCents: number;
  taxableCents: number;
  totalBeforeRoundOffCents: number;
  totalCents: number;
};

export function calculateNearestRupeeRoundOffCents(amountCents: number) {
  assertIntegerMoney(amountCents, "Amount before round-off");
  return Math.round(amountCents / 100) * 100 - amountCents;
}

export function calculateEstimateMoneyTotals(lines: EstimateMoneyLine[]): EstimateMoneyTotals {
  const result = lines.reduce(
    (totals, line) => {
      assertFinite(line.quantity, "Quantity");
      assertIntegerMoney(line.unitAmountCents, "Unit amount");
      const discountCents = line.discountCents ?? 0;
      assertIntegerMoney(discountCents, "Discount");
      const taxRateBps = line.taxRateBps ?? 0;
      assertFinite(taxRateBps, "GST rate");

      const grossCents = Math.round(line.quantity * line.unitAmountCents);
      const taxableCents = Math.max(grossCents - discountCents, 0);
      const taxCents = line.taxCents ?? Math.round((taxableCents * taxRateBps) / 10_000);
      assertIntegerMoney(taxCents, "Tax");

      return {
        discountCents: totals.discountCents + discountCents,
        grossCents: totals.grossCents + grossCents,
        taxCents: totals.taxCents + taxCents,
        taxableCents: totals.taxableCents + taxableCents,
      };
    },
    { discountCents: 0, grossCents: 0, taxCents: 0, taxableCents: 0 },
  );
  const totalBeforeRoundOffCents = result.taxableCents + result.taxCents;
  const roundOffCents = calculateNearestRupeeRoundOffCents(totalBeforeRoundOffCents);
  return {
    ...result,
    roundOffCents,
    totalBeforeRoundOffCents,
    totalCents: totalBeforeRoundOffCents + roundOffCents,
  };
}

export function applyAutomaticEstimateRoundOff<T extends { items: EstimateMoneyLine[] }>(input: T) {
  return {
    ...input,
    roundOffCents: calculateEstimateMoneyTotals(input.items).roundOffCents,
  };
}

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}

function assertIntegerMoney(value: number, label: string) {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer number of paise.`);
}
`);

write("apps/web/src/lib/money/indian-currency-words.ts", `
export function formatIndianCurrencyWords(amountCents: number) {
  if (!Number.isInteger(amountCents)) {
    throw new Error("Currency amount must be an integer number of paise.");
  }
  const absolute = Math.abs(amountCents);
  const rupees = Math.floor(absolute / 100);
  const paise = absolute % 100;
  const sign = amountCents < 0 ? "Minus " : "";
  const paiseWords = paise
    ? ` and ${twoDigitWords(paise)} ${paise === 1 ? "Paisa" : "Paise"}`
    : "";
  return `${sign}Rupees ${indianNumberWords(rupees)}${paiseWords} Only`;
}

function indianNumberWords(value: number) {
  if (value === 0) return "Zero";
  if (value > 999_999_999) return value.toLocaleString("en-IN");
  const parts = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1_000);
  const remainder = value % 1_000;
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (remainder) parts.push(threeDigitWords(remainder));
  return parts.join(" ");
}

function threeDigitWords(value: number) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return [
    hundreds ? `${smallNumberWords[hundreds]} Hundred` : "",
    remainder ? twoDigitWords(remainder) : "",
  ].filter(Boolean).join(" ");
}

function twoDigitWords(value: number) {
  if (value < 20) return smallNumberWords[value];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return `${tensWords[tens]}${units ? ` ${smallNumberWords[units]}` : ""}`;
}

const smallNumberWords = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
`);

const formPath = "apps/web/src/components/hardware/estimate-bill-form.tsx";
replaceOnce(
  formPath,
  'import type {\n  HardwareEstimateEditData,\n  HardwarePartySummary,\n  HardwareProductSummary,\n} from "@/server/hardware";\n',
  'import { calculateEstimateMoneyTotals } from "@/lib/hardware/estimate-money";\nimport type {\n  HardwareEstimateEditData,\n  HardwarePartySummary,\n  HardwareProductSummary,\n} from "@/server/hardware";\n',
);
replaceOnce(
  formPath,
  '  const [roundOff, setRoundOff] = useState(\n    initialDocument?.roundOffCents ? String(initialDocument.roundOffCents / 100) : "0",\n  );\n',
  '',
);
replaceOnce(
  formPath,
  '  const totals = useMemo(() => calculateEstimateTotals(completedLines, roundOff), [completedLines, roundOff]);\n',
  '  const totals = useMemo(() => calculateEstimateTotals(completedLines), [completedLines]);\n',
);
replaceOnce(
  formPath,
  '          <Field label="Round-off">\n            <Input className="max-w-48" inputMode="decimal" onChange={(event) => setRoundOff(event.target.value)} step="0.01" type="number" value={roundOff} />\n          </Field>\n',
  '          <Field label="Automatic round-off">\n            <Input className="max-w-48" readOnly value={(totals.roundOffCents / 100).toFixed(2)} />\n          </Field>\n',
);
replaceOnce(
  formPath,
  'function calculateEstimateTotals(lines: EstimateLine[], roundOff: string) {\n  const result = lines.reduce((totals, line) => {\n    const gross = Math.round((Number(line.quantity) || 0) * (Number(line.unitRate) || 0) * 100);\n    const discount = Math.round(gross * (Number(line.discountPercent) || 0) / 100);\n    const taxable = Math.max(gross - discount, 0);\n    const tax = Math.round(taxable * (Number(line.gstRate) || 0) / 100);\n    return {\n      discountCents: totals.discountCents + discount,\n      grossCents: totals.grossCents + gross,\n      taxCents: totals.taxCents + tax,\n      taxableCents: totals.taxableCents + taxable,\n    };\n  }, { discountCents: 0, grossCents: 0, taxCents: 0, taxableCents: 0 });\n  const roundOffCents = Math.round((Number(roundOff) || 0) * 100);\n  return { ...result, roundOffCents, totalCents: result.taxableCents + result.taxCents + roundOffCents };\n}\n',
  'function calculateEstimateTotals(lines: EstimateLine[]) {\n  return calculateEstimateMoneyTotals(lines.map((line) => {\n    const grossCents = Math.round((Number(line.quantity) || 0) * (Number(line.unitRate) || 0) * 100);\n    return {\n      discountCents: Math.round(grossCents * (Number(line.discountPercent) || 0) / 100),\n      quantity: Number(line.quantity) || 0,\n      taxRateBps: Math.round((Number(line.gstRate) || 0) * 100),\n      unitAmountCents: Math.round((Number(line.unitRate) || 0) * 100),\n    };\n  }));\n}\n',
);

const salesRoute = "apps/web/src/app/api/hardware/sales/route.ts";
replaceOnce(
  salesRoute,
  'import type { NextRequest } from "next/server";\n',
  'import type { NextRequest } from "next/server";\nimport { applyAutomaticEstimateRoundOff } from "@/lib/hardware/estimate-money";\n',
);
replaceOnce(
  salesRoute,
  '    const input = await parseHardwareJson(request, hardwareSalesDocumentSchema);\n    return hardwareResponse(await service.create(context, { ...input, type: input.type ?? HardwareTradeDocumentType.SALES_ORDER }), 201);\n',
  '    const input = await parseHardwareJson(request, hardwareSalesDocumentSchema);\n    const type = input.type ?? HardwareTradeDocumentType.SALES_ORDER;\n    const normalizedInput = type === HardwareTradeDocumentType.SALES_QUOTATION\n      ? applyAutomaticEstimateRoundOff({ ...input, type })\n      : { ...input, type };\n    return hardwareResponse(await service.create(context, normalizedInput), 201);\n',
);

const estimateRoute = "apps/web/src/app/api/hardware/trade/[documentId]/estimate/route.ts";
replaceOnce(
  estimateRoute,
  'import type { NextRequest } from "next/server";\n',
  'import type { NextRequest } from "next/server";\nimport { applyAutomaticEstimateRoundOff } from "@/lib/hardware/estimate-money";\n',
);
replaceOnce(
  estimateRoute,
  '    const input = await parseHardwareJson(request, hardwareEstimateUpdateSchema);\n    return hardwareResponse(await service.updateEstimate(context, documentId, input));\n',
  '    const input = await parseHardwareJson(request, hardwareEstimateUpdateSchema);\n    return hardwareResponse(\n      await service.updateEstimate(context, documentId, applyAutomaticEstimateRoundOff(input)),\n    );\n',
);

const layoutPath = "apps/web/src/features/hardware/printing/reference-bill-layout.tsx";
replaceOnce(
  layoutPath,
  'import Image from "next/image";\nimport type { HardwarePrintProjection } from "@/server/hardware";\n',
  'import Image from "next/image";\nimport { calculateEstimateMoneyTotals } from "@/lib/hardware/estimate-money";\nimport { formatIndianCurrencyWords } from "@/lib/money/indian-currency-words";\nimport type { HardwarePrintProjection } from "@/server/hardware";\n',
);
replaceOnce(
  layoutPath,
  'const DEFAULT_TERMS = [\n  "E. & O.E.",\n  "Goods once sold will not be taken back.",\n  "Interest @ 18% p.a. will be charged if payment is not made within the stipulated time.",\n  "Subject to Sikar jurisdiction only.",\n] as const;\n',
  'const INVOICE_DEFAULT_TERMS = [\n  "E. & O.E.",\n  "Goods once sold will not be taken back.",\n  "Interest @ 18% p.a. will be charged if payment is not made within the stipulated time.",\n  "Subject to Sikar jurisdiction only.",\n] as const;\n\nconst ESTIMATE_DEFAULT_TERMS = [\n  "This estimate is valid for 7 days from the date of issue.",\n  "Prices and product availability are subject to confirmation at the time of order.",\n  "Taxes will be charged at the applicable rate on the final invoice.",\n  "This estimate is not a tax invoice.",\n] as const;\n',
);
replaceOnce(
  layoutPath,
  '  const terms = resolveReferenceTerms(projection.firm.termsFooter);\n',
  '  const terms = resolveReferenceTerms(projection.firm.termsFooter, isEstimate);\n',
);
replaceOnce(layoutPath, '          documentStatus={projection.document.status}\n', '');
replaceOnce(layoutPath, '  documentStatus,\n', '');
replaceOnce(layoutPath, '  documentStatus: string;\n', '');
replaceOnce(
  layoutPath,
  '        <p className="bill-party-name">{customerName}</p>\n        {documentAddress ? <p className="bill-party-line">{documentAddress}</p> : null}\n        <div className="bill-party-spacer" />\n        <p className="bill-party-line">PARTY MOB&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;{customer?.phone ?? ""}</p>\n        <p className="bill-party-line">Party GSTIN&nbsp;&nbsp;:&nbsp;&nbsp;{customer?.gstin ?? ""}</p>\n',
  '        <p className="bill-party-name">{formatPartyName(customerName)}</p>\n        {documentAddress ? <p className="bill-party-line">{documentAddress}</p> : null}\n        {customer?.phone ? <p className="bill-party-line">PARTY MOB&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;{customer.phone}</p> : null}\n        {customer?.gstin ? <p className="bill-party-line">Party GSTIN&nbsp;&nbsp;:&nbsp;&nbsp;{customer.gstin}</p> : null}\n',
);
replaceOnce(
  layoutPath,
  '          <dt>Tax Treatment</dt><dd>:</dd><dd>{taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</dd>\n          <dt>Status</dt><dd>:</dd><dd>{humanize(documentStatus)}</dd>\n          {isEstimate ? <><dt>Stock</dt><dd>:</dd><dd>Confirmed - deducted</dd></> : null}\n',
  '          <dt>Tax Treatment</dt><dd>:</dd><dd>{taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</dd>\n',
);
replaceOnce(
  layoutPath,
  '          <col style={{ width: "5%" }} />\n          <col style={{ width: "40%" }} />\n          <col style={{ width: "10%" }} />\n          <col style={{ width: "8%" }} />\n          <col style={{ width: "8%" }} />\n          <col style={{ width: "10%" }} />\n          <col style={{ width: "7%" }} />\n          <col style={{ width: "12%" }} />\n',
  '          <col style={{ width: "5%" }} />\n          <col style={{ width: "45%" }} />\n          <col style={{ width: "8%" }} />\n          <col style={{ width: "6%" }} />\n          <col style={{ width: "7%" }} />\n          <col style={{ width: "10%" }} />\n          <col style={{ width: "7%" }} />\n          <col style={{ width: "12%" }} />\n',
);
replaceOnce(
  layoutPath,
  '              <td className={`bill-description ${item.description.length > 48 ? "bill-description-long" : ""}`}>{item.description}</td>\n              <td className="bill-center">{item.hsnCode ?? "Pending"}</td>\n',
  '              <td className="bill-description">{item.description}</td>\n              <td className="bill-center">{item.hsnCode?.trim() || "—"}</td>\n',
);
replaceOnce(
  layoutPath,
  '  const calculationRows: Array<{ label: string; rate?: string; valueCents: number }> = [\n    { label: "Total", valueCents: projection.document.subtotalCents },\n  ];\n',
  '  const displayTotals = resolveReferenceBillTotals(projection);\n  const calculationRows: Array<{ label: string; rate?: string; valueCents: number }> = [\n    { label: "Total", valueCents: displayTotals.subtotalCents },\n  ];\n',
);
replaceOnce(layoutPath, '  if (projection.document.discountCents !== 0) {\n', '  if (displayTotals.discountCents !== 0) {\n');
replaceOnce(layoutPath, '      valueCents: Math.abs(projection.document.discountCents),\n', '      valueCents: Math.abs(displayTotals.discountCents),\n');
replaceOnce(layoutPath, '  if (projection.document.roundOffCents !== 0) {\n', '  if (displayTotals.roundOffCents !== 0) {\n');
replaceOnce(
  layoutPath,
  '      label: `${projection.document.roundOffCents < 0 ? "Less" : "Add"}  :  Rounded Off`,\n      valueCents: Math.abs(projection.document.roundOffCents),\n',
  '      label: `${displayTotals.roundOffCents < 0 ? "Less" : "Add"}  :  Rounded Off`,\n      valueCents: Math.abs(displayTotals.roundOffCents),\n',
);
replaceOnce(layoutPath, '{moneyPlain(projection.document.totalCents)}</div>\n', '{moneyPlain(displayTotals.totalCents)}</div>\n');
replaceOnce(
  layoutPath,
  '      <div className="bill-words">Rupees {stripRupeesPrefix(projection.document.totalsInWords)}</div>\n',
  '      <div className="bill-words">{formatIndianCurrencyWords(displayTotals.totalCents)}</div>\n',
);
replaceOnce(layoutPath, '        {legalName ? <p className="bill-legal-name">Legal proprietor: {legalName}</p> : null}\n', '        {legalName ? <p className="bill-legal-name">Proprietor: {legalName}</p> : null}\n');
replaceOnce(
  layoutPath,
  'export function resolveReferenceTerms(termsFooter: string | null) {\n  const normalized = termsFooter?.trim();\n  if (!normalized || normalized.toUpperCase() === "WAITING FOR CLIENT CONFIRMATION") {\n    return [...DEFAULT_TERMS];\n  }\n',
  'export function resolveReferenceTerms(termsFooter: string | null, isEstimate = false) {\n  const fallback = isEstimate ? ESTIMATE_DEFAULT_TERMS : INVOICE_DEFAULT_TERMS;\n  const normalized = termsFooter?.trim();\n  if (!normalized || normalized.toUpperCase() === "WAITING FOR CLIENT CONFIRMATION") {\n    return [...fallback];\n  }\n',
);
replaceOnce(layoutPath, '  return customTerms.length ? customTerms : [...DEFAULT_TERMS];\n', '  return customTerms.length ? customTerms : [...fallback];\n');
replaceOnce(layoutPath, '? `Sale @${row.taxRateBps / 100}% = ${moneyPlain(row.taxableCents)}  IGST = ${moneyPlain(row.taxCents)}`\n    : `Sale @${row.taxRateBps / 100}% = ${moneyPlain(row.taxableCents)}  CGST = ${moneyPlain(row.cgst)}  SGST = ${moneyPlain(row.sgst)}`\n', '? `Taxable Value @${row.taxRateBps / 100}% = ${moneyPlain(row.taxableCents)}  IGST = ${moneyPlain(row.taxCents)}`\n    : `Taxable Value @${row.taxRateBps / 100}% = ${moneyPlain(row.taxableCents)}  CGST = ${moneyPlain(row.cgst)}  SGST = ${moneyPlain(row.sgst)}`\n');
replaceOnce(
  layoutPath,
  'function stripRupeesPrefix(value: string) {\n  return value.replace(/^Rupees\\s+/iu, "");\n}\n',
  'export function formatPartyName(value: string) {\n  const normalized = value.trim().replace(/\\s+/gu, " ");\n  if (!normalized || normalized !== normalized.toLowerCase()) return normalized;\n  return normalized.replace(/\\b\\p{L}/gu, (letter) => letter.toUpperCase());\n}\n\nexport function resolveReferenceBillTotals(projection: HardwarePrintProjection) {\n  if (projection.document.type !== "SALES_QUOTATION") {\n    return {\n      discountCents: projection.document.discountCents,\n      roundOffCents: projection.document.roundOffCents,\n      subtotalCents: projection.document.subtotalCents,\n      taxCents: projection.document.taxCents,\n      totalCents: projection.document.totalCents,\n    };\n  }\n  const totals = calculateEstimateMoneyTotals(projection.items.map((item) => ({\n    discountCents: item.discountCents,\n    quantity: item.quantity,\n    taxCents: item.taxCents,\n    taxRateBps: item.taxRateBps,\n    unitAmountCents: item.unitAmountCents,\n  })));\n  return {\n    discountCents: totals.discountCents,\n    roundOffCents: totals.roundOffCents,\n    subtotalCents: totals.grossCents,\n    taxCents: totals.taxCents,\n    totalCents: totals.totalCents,\n  };\n}\n',
);

const stylesPath = "apps/web/src/features/hardware/printing/reference-bill-styles.tsx";
replaceOnce(stylesPath, '  .bill-party-box,\n  .bill-document-box { min-height: 31mm; padding: 2mm 2.5mm; }\n', '  .bill-party-box,\n  .bill-document-box { min-height: 27mm; padding: 2mm 2.5mm; }\n');
replaceOnce(stylesPath, '  .bill-party-spacer { height: 3mm; }\n', '');
replaceOnce(stylesPath, '  .bill-items-table tbody td { white-space: nowrap; }\n  .bill-items-table .bill-description {\n    overflow: hidden;\n    text-overflow: clip;\n    white-space: nowrap;\n  }\n  .bill-items-table .bill-description-long { font-size: 6.65px; letter-spacing: -0.08px; }\n', '  .bill-items-table tbody { height: 100%; }\n  .bill-items-table tbody td { white-space: nowrap; }\n  .bill-items-table .bill-description {\n    overflow: visible;\n    overflow-wrap: anywhere;\n    white-space: normal;\n    line-height: 1.15;\n  }\n');
replaceOnce(stylesPath, '  .bill-table-spacer { height: 100%; }\n  .bill-table-spacer td { padding: 0; }\n', '  .bill-table-spacer { height: 100%; }\n  .bill-table-spacer td { height: 100%; padding: 0; }\n');

const stylesTestPath = "apps/web/src/features/hardware/printing/reference-bill-styles.test.ts";
replaceOnce(
  stylesTestPath,
  '  it("keeps dense product rows on one line and uses explicit A4 pagination", () => {\n    expect(REFERENCE_BILL_PRINT_CSS).toContain("white-space: nowrap");\n',
  '  it("keeps numeric cells compact, wraps descriptions, and uses explicit A4 pagination", () => {\n    expect(REFERENCE_BILL_PRINT_CSS).toContain("white-space: nowrap");\n    expect(REFERENCE_BILL_PRINT_CSS).toContain("white-space: normal");\n    expect(REFERENCE_BILL_PRINT_CSS).toContain("overflow-wrap: anywhere");\n',
);

write("apps/web/src/lib/hardware/estimate-money.test.ts", `
import { describe, expect, it } from "vitest";
import {
  applyAutomaticEstimateRoundOff,
  calculateEstimateMoneyTotals,
  calculateNearestRupeeRoundOffCents,
} from "./estimate-money";

describe("Estimate Bill money totals", () => {
  it("rounds the final amount to the nearest rupee", () => {
    expect(calculateNearestRupeeRoundOffCents(435_560)).toBe(40);
    expect(calculateNearestRupeeRoundOffCents(435_640)).toBe(-40);
  });

  it("reproduces line discount and GST rounding before automatic round-off", () => {
    const totals = calculateEstimateMoneyTotals([
      { discountCents: 38_181, quantity: 1, taxRateBps: 1_800, unitAmountCents: 191_000 },
      { discountCents: 51_000, quantity: 1, taxRateBps: 1_800, unitAmountCents: 170_000 },
      { discountCents: 41_700, quantity: 1, taxRateBps: 1_800, unitAmountCents: 139_000 },
    ]);
    expect(totals).toMatchObject({
      discountCents: 130_881,
      grossCents: 500_000,
      roundOffCents: 40,
      taxCents: 66_441,
      taxableCents: 369_119,
      totalCents: 435_600,
    });
  });

  it("overrides a client supplied arbitrary Estimate round-off", () => {
    const normalized = applyAutomaticEstimateRoundOff({
      items: [{ discountCents: 0, quantity: 1, taxRateBps: 1_800, unitAmountCents: 10_001 }],
      roundOffCents: 999,
    });
    expect(normalized.roundOffCents).not.toBe(999);
    expect(normalized.roundOffCents).toBe(-1);
  });
});
`);

write("apps/web/src/lib/money/indian-currency-words.test.ts", `
import { describe, expect, it } from "vitest";
import { formatIndianCurrencyWords } from "./indian-currency-words";

describe("Indian currency words", () => {
  it("writes a rounded whole-rupee total without duplicate Rupees", () => {
    expect(formatIndianCurrencyWords(435_600)).toBe("Rupees Four Thousand Three Hundred Fifty Six Only");
  });

  it("uses the singular Paisa label", () => {
    expect(formatIndianCurrencyWords(436_001)).toBe("Rupees Four Thousand Three Hundred Sixty and One Paisa Only");
  });
});
`);

write("apps/web/src/features/hardware/printing/reference-bill-layout.test.ts", `
import { describe, expect, it } from "vitest";
import { formatPartyName, resolveReferenceTerms } from "./reference-bill-layout";

describe("reference bill content rules", () => {
  it("normalizes an all-lowercase party name without changing mixed-case names", () => {
    expect(formatPartyName("nitin kumawat")).toBe("Nitin Kumawat");
    expect(formatPartyName("ABC Traders")).toBe("ABC Traders");
  });

  it("uses Estimate-specific fallback terms", () => {
    expect(resolveReferenceTerms(null, true)).toContain("This estimate is not a tax invoice.");
    expect(resolveReferenceTerms(null, false)).toContain("Goods once sold will not be taken back.");
  });
});
`);

const e2ePath = "e2e/mangalam-erp.spec.ts";
replaceOnce(
  e2ePath,
  '  await estimateGst.selectOption("12");\n  await estimateGst.press("Enter");\n  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();\n',
  '  await estimateGst.selectOption("12");\n  await estimateGst.press("Enter");\n  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();\n  await expect(page.getByLabel("Automatic round-off", { exact: true })).toHaveAttribute("readonly", "");\n',
);
replaceOnce(
  e2ePath,
  '  await expect(printPopup.locator(".bill-items-table")).toHaveCSS("table-layout", "fixed");\n',
  '  await expect(printPopup.locator(".bill-items-table")).toHaveCSS("table-layout", "fixed");\n  await expect(printPopup.locator(".bill-description").first()).toHaveCSS("white-space", "normal");\n  await expect(printPopup.getByText("Pending", { exact: true })).toHaveCount(0);\n  await expect(printPopup.getByText("Status", { exact: true })).toHaveCount(0);\n  await expect(printPopup.getByText(/Confirmed - deducted/i)).toHaveCount(0);\n  await expect(printPopup.locator(".bill-tax-summary-line")).toContainText("Taxable Value @12%");\n  await expect(printPopup.locator(".bill-words")).toContainText(/^Rupees .+ Only$/);\n',
);

console.log("ESTIMATE_PRINT_CONTENT_FIX_MATERIALIZED");

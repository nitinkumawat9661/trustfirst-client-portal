import Image from "next/image";
import { calculateEstimateMoneyTotals } from "../../../lib/hardware/estimate-money";
import { formatIndianCurrencyWords } from "../../../lib/money/indian-currency-words";
import type { HardwarePrintProjection } from "@/server/hardware";

export type ReferenceTaxMode = "inter-state" | "intra-state";

type PrintItem = HardwarePrintProjection["items"][number];

type BillPage = {
  carriedAmountCents: number;
  carriedQuantity: number;
  endingAmountCents: number;
  endingQuantity: number;
  items: PrintItem[];
  pageIndex: number;
  startIndex: number;
};

const INVOICE_DEFAULT_TERMS = [
  "E. & O.E.",
  "Goods once sold will not be taken back.",
  "Interest @ 18% p.a. will be charged if payment is not made within the stipulated time.",
  "Subject to Sikar jurisdiction only.",
] as const;

const ESTIMATE_DEFAULT_TERMS = [
  "This estimate is valid for 7 days from the date of issue.",
  "Prices and product availability are subject to confirmation at the time of order.",
  "Taxes will be charged at the applicable rate on the final invoice.",
  "This estimate is not a tax invoice.",
] as const;

export function ReferenceBillDocument({
  customerName,
  documentAddress,
  documentDate,
  projection,
  taxMode,
}: {
  customerName: string;
  documentAddress: string | null;
  documentDate: Date | string;
  projection: HardwarePrintProjection;
  taxMode: ReferenceTaxMode;
}) {
  const isEstimate = projection.document.type === "SALES_QUOTATION";
  const pages = buildReferenceBillPages(projection.items);
  const terms = resolveReferenceTerms(projection.firm.termsFooter, isEstimate);

  return pages.map((page) => {
    const isLastPage = page.pageIndex === pages.length - 1;
    return (
      <article className="bill-page" key={page.pageIndex}>
        <BillHeader
          documentLabel={referenceDocumentLabel(projection.document.type)}
          firm={projection.firm}
        />
        <PartyDocumentSection
          customer={projection.customer}
          customerName={customerName}
          documentAddress={documentAddress}
          documentDate={documentDate}
          documentNumber={projection.document.documentNumber}
          isEstimate={isEstimate}
          isPurchase={isPurchaseDocument(projection.document.type)}
          metadata={projection.document.metadata}
          taxMode={taxMode}
        />
        {projection.document.status === "CANCELLED" ? (
          <div className="bill-cancelled">
            CANCELLED / VOID - DO NOT COLLECT PAYMENT OR DISPATCH GOODS AGAINST THIS DOCUMENT
          </div>
        ) : null}
        <BillItemsTable page={page} showCarryForward={!isLastPage} />
        {isLastPage ? (
          <BillTotals
            projection={projection}
            taxMode={taxMode}
            totalQuantity={page.endingQuantity}
          />
        ) : null}
        <BillFooter
          firmName={projection.firm.firmName}
          legalName={projection.firm.legalName}
          signatureLabel={projection.signatureLabel}
          terms={terms}
        />
      </article>
    );
  });
}

function BillHeader({
  documentLabel,
  firm,
}: {
  documentLabel: string;
  firm: HardwarePrintProjection["firm"];
}) {
  return (
    <header className="bill-header">
      <div className="bill-header-top">
        <div>GSTIN&nbsp;&nbsp;{firm.gstin ?? "Not provided"}</div>
        <div className="bill-document-label">{documentLabel}</div>
        <div className="bill-copy-label">Original Copy</div>
      </div>
      <div className="bill-brand-row">
        <div>
          {firm.logoUrl ? (
            <Image
              alt={`${firm.firmName} approved logo`}
              className="bill-logo"
              height={64}
              priority
              src={firm.logoUrl}
              unoptimized
              width={64}
            />
          ) : null}
        </div>
        <div className="bill-brand-copy">
          <h1 className="bill-firm-name">{firm.firmName}</h1>
          {firm.tagline ? <p className="bill-tagline">{firm.tagline}</p> : null}
          <p className="bill-address">{formatAddress(firm.address)}</p>
          <p className="bill-contact">{[firm.phone, firm.email].filter(Boolean).join(" | ")}</p>
        </div>
        <div />
      </div>
    </header>
  );
}

function PartyDocumentSection({
  customer,
  customerName,
  documentAddress,
  documentDate,
  documentNumber,
  isEstimate,
  isPurchase,
  metadata,
  taxMode,
}: {
  customer: HardwarePrintProjection["customer"];
  customerName: string;
  documentAddress: string | null;
  documentDate: Date | string;
  documentNumber: string;
  isEstimate: boolean;
  isPurchase: boolean;
  metadata: HardwarePrintProjection["document"]["metadata"];
  taxMode: ReferenceTaxMode;
}) {
  const referenceNumber = typeof metadata.referenceNumber === "string" ? metadata.referenceNumber : "";
  return (
    <section className="bill-party-document">
      <div className="bill-party-box">
        <p className="bill-box-title">{isPurchase ? "Supplier Details:" : "Party Details:"}</p>
        <p className="bill-party-name">{formatPartyName(customerName)}</p>
        {documentAddress ? <p className="bill-party-line">{documentAddress}</p> : null}
        {customer?.phone ? <p className="bill-party-line">PARTY MOB&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;{customer.phone}</p> : null}
        {customer?.gstin ? <p className="bill-party-line">Party GSTIN&nbsp;&nbsp;:&nbsp;&nbsp;{customer.gstin}</p> : null}
      </div>
      <div className="bill-document-box">
        <dl className="bill-detail-grid">
          <dt>{isEstimate ? "Estimate No." : "Invoice No."}</dt><dd>:</dd><dd>{documentNumber}</dd>
          <dt>Dated</dt><dd>:</dd><dd>{formatDate(documentDate)}</dd>
          <dt>Reference</dt><dd>:</dd><dd>{referenceNumber}</dd>
          <dt>Tax Treatment</dt><dd>:</dd><dd>{taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</dd>
        </dl>
      </div>
    </section>
  );
}

function BillItemsTable({ page, showCarryForward }: { page: BillPage; showCarryForward: boolean }) {
  return (
    <div className="bill-table-wrap">
      <table className="bill-items-table">
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "45%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>S.N.</th>
            <th className="!text-left">Description of Goods</th>
            <th>HSN</th>
            <th>Qty.</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>Disc.</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {page.pageIndex > 0 ? (
            <tr className="bill-carry-row">
              <td />
              <td className="bill-number">Totals b/d</td>
              <td />
              <td className="bill-number">{formatQuantity(page.carriedQuantity)}</td>
              <td />
              <td />
              <td />
              <td className="bill-number">{moneyPlain(page.carriedAmountCents)}</td>
            </tr>
          ) : null}
          {page.items.map((item, index) => (
            <tr key={`${item.description}-${page.startIndex + index}`}>
              <td className="bill-number">{page.startIndex + index + 1}.</td>
              <td className="bill-description">{item.description}</td>
              <td className="bill-center">{item.hsnCode?.trim() || "—"}</td>
              <td className="bill-number">{formatQuantity(item.quantity)}</td>
              <td className="bill-center">{item.unitCode ?? "-"}</td>
              <td className="bill-number">{moneyPlain(item.unitAmountCents)}</td>
              <td className="bill-number">{formatDiscount(item)}</td>
              <td className="bill-number">{moneyPlain(item.taxableCents)}</td>
            </tr>
          ))}
          <tr aria-hidden="true" className="bill-table-spacer">
            <td /><td /><td /><td /><td /><td /><td /><td />
          </tr>
        </tbody>
        {showCarryForward ? (
          <tfoot>
            <tr>
              <td />
              <td className="bill-number">Totals c/o</td>
              <td />
              <td className="bill-number">{formatQuantity(page.endingQuantity)}</td>
              <td className="bill-center">Units</td>
              <td />
              <td />
              <td className="bill-number">{moneyPlain(page.endingAmountCents)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function BillTotals({
  projection,
  taxMode,
  totalQuantity,
}: {
  projection: HardwarePrintProjection;
  taxMode: ReferenceTaxMode;
  totalQuantity: number;
}) {
  const taxLines = projection.gstSummary.map((row) => {
    const cgst = taxMode === "intra-state" ? Math.floor(row.taxCents / 2) : 0;
    const sgst = taxMode === "intra-state" ? row.taxCents - cgst : 0;
    return { ...row, cgst, sgst };
  });
  const displayTotals = resolveReferenceBillTotals(projection);
  const calculationRows: Array<{ label: string; rate?: string; valueCents: number }> = [
    { label: "Total", valueCents: displayTotals.subtotalCents },
  ];

  if (displayTotals.discountCents !== 0) {
    calculationRows.push({
      label: "Less  :  Discount",
      valueCents: Math.abs(displayTotals.discountCents),
    });
  }

  for (const row of taxLines) {
    if (taxMode === "inter-state") {
      calculationRows.push({
        label: "Add  :  IGST",
        rate: `${row.taxRateBps / 100}%`,
        valueCents: row.taxCents,
      });
    } else {
      calculationRows.push(
        {
          label: "Add  :  CGST",
          rate: `${row.taxRateBps / 200}%`,
          valueCents: row.cgst,
        },
        {
          label: "Add  :  SGST",
          rate: `${row.taxRateBps / 200}%`,
          valueCents: row.sgst,
        },
      );
    }
  }

  if (displayTotals.roundOffCents !== 0) {
    calculationRows.push({
      label: `${displayTotals.roundOffCents < 0 ? "Less" : "Add"}  :  Rounded Off`,
      valueCents: Math.abs(displayTotals.roundOffCents),
    });
  }

  return (
    <section className="bill-calculation">
      <div className="bill-calculation-row">
        <div className="bill-calculation-labels">
          {calculationRows.map((row) => (
            <div className="contents" key={`${row.label}-${row.rate ?? "none"}`}>
              <div>{row.label}</div>
              <div>{row.rate ? "@" : ""}</div>
              <div>{row.rate ?? ""}</div>
            </div>
          ))}
        </div>
        <div className="bill-calculation-values">
          {calculationRows.map((row) => (
            <div key={`${row.label}-${row.rate ?? "none"}`}>{moneyPlain(row.valueCents)}</div>
          ))}
        </div>
      </div>
      <div className="bill-grand-total">
        <div className="bill-grand-total-main">
          <span>Grand Total</span>
          <span>{formatQuantity(totalQuantity)} Units</span>
        </div>
        <div className="bill-grand-total-value">{moneyPlain(displayTotals.totalCents)}</div>
      </div>
      <div className="bill-tax-summary-line">{formatTaxSummary(taxLines, taxMode)}</div>
      <div className="bill-words">{formatIndianCurrencyWords(displayTotals.totalCents)}</div>
    </section>
  );
}

function BillFooter({
  firmName,
  legalName,
  signatureLabel,
  terms,
}: {
  firmName: string;
  legalName: string | null;
  signatureLabel: string;
  terms: string[];
}) {
  return (
    <footer className="bill-footer">
      <div className="bill-terms">
        <p className="bill-terms-title">Terms &amp; Conditions</p>
        <ol>
          {terms.map((term) => <li key={term}>{term}</li>)}
        </ol>
        {legalName ? <p className="bill-legal-name">Proprietor: {legalName}</p> : null}
      </div>
      <div className="bill-signature">
        <div className="bill-receiver">Receiver&apos;s Signature :</div>
        <div className="bill-authorisation">
          <p className="bill-authorisation-firm">For {firmName}</p>
          <p className="bill-signature-label">{signatureLabel}</p>
        </div>
      </div>
    </footer>
  );
}

function buildReferenceBillPages(items: PrintItem[]): BillPage[] {
  const chunks = splitReferenceBillItems(items);
  let startIndex = 0;
  let carriedQuantity = 0;
  let carriedAmountCents = 0;

  return chunks.map((chunk, pageIndex) => {
    const pageQuantity = chunk.reduce((sum, item) => sum + item.quantity, 0);
    const pageAmountCents = chunk.reduce((sum, item) => sum + item.taxableCents, 0);
    const page: BillPage = {
      carriedAmountCents,
      carriedQuantity,
      endingAmountCents: carriedAmountCents + pageAmountCents,
      endingQuantity: carriedQuantity + pageQuantity,
      items: chunk,
      pageIndex,
      startIndex,
    };
    startIndex += chunk.length;
    carriedQuantity = page.endingQuantity;
    carriedAmountCents = page.endingAmountCents;
    return page;
  });
}

export function splitReferenceBillItems<T>(items: T[]) {
  const singlePageCapacity = 34;
  const continuationCapacity = 34;
  const finalPageCapacity = 18;

  if (items.length <= singlePageCapacity) return [items];
  if (items.length <= continuationCapacity + finalPageCapacity) {
    const firstPageSize = Math.min(continuationCapacity, items.length - 1);
    return [items.slice(0, firstPageSize), items.slice(firstPageSize)];
  }

  const finalPage = items.slice(-finalPageCapacity);
  const preceding = items.slice(0, -finalPageCapacity);
  const precedingPageCount = Math.ceil(preceding.length / continuationCapacity);
  const baseSize = Math.floor(preceding.length / precedingPageCount);
  const extra = preceding.length % precedingPageCount;
  const pages: T[][] = [];
  let offset = 0;

  for (let index = 0; index < precedingPageCount; index += 1) {
    const size = baseSize + (index < extra ? 1 : 0);
    pages.push(preceding.slice(offset, offset + size));
    offset += size;
  }

  pages.push(finalPage);
  return pages;
}

export function resolveReferenceTerms(termsFooter: string | null, isEstimate = false) {
  const fallback = isEstimate ? ESTIMATE_DEFAULT_TERMS : INVOICE_DEFAULT_TERMS;
  const normalized = termsFooter?.trim();
  if (!normalized || normalized.toUpperCase() === "WAITING FOR CLIENT CONFIRMATION") {
    return [...fallback];
  }
  const customTerms = normalized
    .split(/\r?\n|\s*\|\s*/u)
    .map((term) => term.replace(/^\d+[.)]\s*/u, "").trim())
    .filter(Boolean);
  return customTerms.length ? customTerms : [...fallback];
}

function formatDiscount(item: PrintItem) {
  if (item.discountPercent !== null) return `${item.discountPercent}%`;
  return item.discountCents ? moneyPlain(item.discountCents) : "-";
}

function formatTaxSummary(
  rows: Array<HardwarePrintProjection["gstSummary"][number] & { cgst: number; sgst: number }>,
  taxMode: ReferenceTaxMode,
) {
  if (!rows.length) return "No GST applicable.";
  return rows.map((row) => taxMode === "inter-state"
    ? `Taxable Value @${row.taxRateBps / 100}% = ${moneyPlain(row.taxableCents)}  IGST = ${moneyPlain(row.taxCents)}`
    : `Taxable Value @${row.taxRateBps / 100}% = ${moneyPlain(row.taxableCents)}  CGST = ${moneyPlain(row.cgst)}  SGST = ${moneyPlain(row.sgst)}`
  ).join("   |   ");
}

export function formatPartyName(value: string) {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!normalized || normalized !== normalized.toLowerCase()) return normalized;
  return normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function resolveReferenceBillTotals(projection: HardwarePrintProjection) {
  if (projection.document.type !== "SALES_QUOTATION") {
    return {
      discountCents: projection.document.discountCents,
      roundOffCents: projection.document.roundOffCents,
      subtotalCents: projection.document.subtotalCents,
      taxCents: projection.document.taxCents,
      totalCents: projection.document.totalCents,
    };
  }
  const totals = calculateEstimateMoneyTotals(projection.items.map((item) => ({
    discountCents: item.discountCents,
    quantity: item.quantity,
    taxCents: item.taxCents,
    taxRateBps: item.taxRateBps,
    unitAmountCents: item.unitAmountCents,
  })));
  return {
    discountCents: totals.discountCents,
    roundOffCents: totals.roundOffCents,
    subtotalCents: totals.grossCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
  };
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value);
}

function moneyPlain(amountCents: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

function referenceDocumentLabel(type: string) {
  if (type === "SALES_QUOTATION") return "ESTIMATE BILL";
  if (type === "SALES_ORDER") return "GST INVOICE";
  if (type === "SALE_RETURN") return "SALE RETURN";
  if (type === "PURCHASE_ORDER") return "PURCHASE ORDER";
  if (type === "SUPPLIER_BILL") return "SUPPLIER BILL";
  return humanize(type).toUpperCase();
}

function isPurchaseDocument(type: string) {
  return ["PURCHASE_ENTRY", "PURCHASE_ORDER", "PURCHASE_RETURN", "SUPPLIER_BILL"].includes(type);
}

function formatAddress(address: Record<string, unknown>) {
  const values = Object.values(address).filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return values.length ? values.join(", ") : "Address not provided";
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

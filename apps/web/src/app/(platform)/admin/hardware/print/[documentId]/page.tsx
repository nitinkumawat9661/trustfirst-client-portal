import { getPrisma } from "@trustfirst/database";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/hardware/print-button";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService, type HardwarePrintProjection } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwarePrintPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { documentId } = await params;
  const { print } = await searchParams;
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const projection = await loadProjection(service, {
    documentId,
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });
  const isEstimate = projection.document.type === "SALES_QUOTATION";
  const taxMode = projection.document.metadata.taxMode === "inter-state" ? "inter-state" : "intra-state";
  const documentAddress =
    typeof projection.document.metadata.customerAddress === "string"
      ? projection.document.metadata.customerAddress
      : projection.customer?.address ?? null;
  const documentDate =
    typeof projection.document.metadata.documentDate === "string"
      ? projection.document.metadata.documentDate
      : projection.document.createdAt;
  const customerName = projection.customer?.name ?? "Walk-in Customer";
  const pdfFileName = buildPdfFileName(projection.document.documentNumber, customerName);
  const printDensityClass =
    projection.items.length > 40
      ? "print-density-ultra"
      : projection.items.length > 20
        ? "print-density-dense"
        : "";

  return (
    <main className="min-h-screen bg-zinc-200 p-3 text-black sm:p-6 print:min-h-0 print:bg-white print:p-0">
      <section className={`print-sheet ${printDensityClass} mx-auto w-full max-w-[210mm] bg-white p-5 shadow-md sm:p-8 print:max-w-none print:p-0 print:shadow-none`}>
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 5mm 6mm; }
            html, body {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body [class*="min-h-screen"] { min-height: 0 !important; }
            body header.sticky { display: none !important; }
            body aside.fixed { display: none !important; }
            body [class*="fixed"][class*="bottom-"] { display: none !important; }
            body .lg\\:pl-64 { padding-left: 0 !important; }
            body main.px-3.py-5 { padding: 0 !important; }
            .no-print { display: none !important; }
            .print-sheet {
              width: 100% !important;
              max-width: none !important;
              min-height: 0 !important;
              height: auto !important;
              margin: 0 !important;
              overflow: visible !important;
              font-size: 8px !important;
              line-height: 1.15 !important;
            }
            .print-document-header {
              display: flex !important;
              flex-direction: row !important;
              align-items: flex-start !important;
              justify-content: space-between !important;
              gap: 3mm !important;
              padding-bottom: 2mm !important;
              border-bottom-width: 1px !important;
            }
            .print-brand {
              min-width: 0 !important;
              gap: 2mm !important;
            }
            .print-logo {
              width: 14mm !important;
              height: 14mm !important;
            }
            .print-firm-title {
              font-size: 14px !important;
              line-height: 1 !important;
            }
            .print-firm-tagline {
              margin-top: 0.6mm !important;
              font-size: 7px !important;
              line-height: 1.1 !important;
            }
            .print-firm-address {
              margin-top: 1mm !important;
              font-size: 7.5px !important;
              line-height: 1.2 !important;
            }
            .print-firm-contact,
            .print-firm-gstin {
              font-size: 7.5px !important;
              line-height: 1.2 !important;
            }
            .print-firm-gstin { margin-top: 0.5mm !important; }
            .print-document-meta {
              min-width: 46mm !important;
              text-align: right !important;
            }
            .print-document-title {
              font-size: 13px !important;
              line-height: 1 !important;
            }
            .print-document-details {
              margin-top: 1mm !important;
              gap: 0.4mm 2mm !important;
              font-size: 7.5px !important;
              line-height: 1.1 !important;
            }
            .print-cancelled-banner {
              margin-top: 1.5mm !important;
              padding: 1mm 2mm !important;
              font-size: 8px !important;
            }
            .print-party-section {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 3mm !important;
              padding: 1.5mm 0 !important;
              font-size: 7.5px !important;
              line-height: 1.15 !important;
            }
            .print-party-section p { margin-top: 0.5mm !important; }
            .print-party-name { font-size: 8.5px !important; }
            .print-tax-treatment { text-align: right !important; }
            .print-table-wrap {
              margin-top: 1.5mm !important;
              overflow: visible !important;
            }
            .print-table {
              width: 100% !important;
              min-width: 0 !important;
              table-layout: fixed !important;
              font-size: 7.2px !important;
              line-height: 1.05 !important;
            }
            .print-table th,
            .print-table td {
              padding-left: 0.6mm !important;
              padding-right: 0.6mm !important;
              white-space: normal !important;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
              vertical-align: top !important;
            }
            .print-table th {
              padding-top: 0.8mm !important;
              padding-bottom: 0.8mm !important;
              font-size: 7px !important;
              line-height: 1.05 !important;
            }
            .print-table td {
              padding-top: 0.65mm !important;
              padding-bottom: 0.65mm !important;
              line-height: 1.1 !important;
            }
            .print-density-dense .print-table { font-size: 6.8px !important; }
            .print-density-dense .print-table th {
              padding-top: 0.55mm !important;
              padding-bottom: 0.55mm !important;
              font-size: 6.7px !important;
            }
            .print-density-dense .print-table td {
              padding-top: 0.45mm !important;
              padding-bottom: 0.45mm !important;
            }
            .print-density-ultra .print-logo {
              width: 11mm !important;
              height: 11mm !important;
            }
            .print-density-ultra .print-document-header {
              gap: 2mm !important;
              padding-bottom: 1.2mm !important;
            }
            .print-density-ultra .print-party-section { padding: 1mm 0 !important; }
            .print-density-ultra .print-table {
              font-size: 6.4px !important;
              line-height: 1 !important;
            }
            .print-density-ultra .print-table th {
              padding: 0.4mm !important;
              font-size: 6.3px !important;
            }
            .print-density-ultra .print-table td {
              padding: 0.3mm 0.4mm !important;
              line-height: 1.05 !important;
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tbody tr { break-inside: avoid; page-break-inside: avoid; }
            .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
            .print-summary {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) 58mm !important;
              gap: 4mm !important;
              margin-top: 2mm !important;
              font-size: 7.5px !important;
              line-height: 1.15 !important;
            }
            .print-gst-table {
              margin-top: 1mm !important;
              font-size: 7px !important;
              line-height: 1.1 !important;
            }
            .print-gst-table th,
            .print-gst-table td { padding: 0.45mm 0.7mm 0.45mm 0 !important; }
            .print-amount-words-title {
              margin-top: 2mm !important;
              font-size: 7px !important;
            }
            .print-amount-words {
              margin-top: 0.5mm !important;
              font-size: 8px !important;
              line-height: 1.2 !important;
            }
            .print-totals {
              font-size: 7.5px !important;
              line-height: 1.1 !important;
            }
            .print-totals > div { margin-bottom: 0.8mm !important; }
            .print-grand-total {
              padding-top: 1mm !important;
              font-size: 11px !important;
            }
            .print-footer {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) 55mm !important;
              gap: 5mm !important;
              margin-top: 3mm !important;
              padding-top: 1.5mm !important;
              font-size: 7px !important;
              line-height: 1.15 !important;
            }
            .print-footer p { margin-top: 0.5mm !important; }
            .print-signature-line {
              width: 45mm !important;
              margin-top: 7mm !important;
              padding-top: 1mm !important;
            }
            .print-density-ultra .print-summary {
              gap: 3mm !important;
              margin-top: 1.5mm !important;
            }
            .print-density-ultra .print-footer {
              margin-top: 2mm !important;
              padding-top: 1mm !important;
            }
            .print-density-ultra .print-signature-line { margin-top: 5mm !important; }
          }
        `}</style>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">A4 {isEstimate ? "Estimate Bill" : "invoice"} preview</p>
            <p className="text-xs text-zinc-600">PDF name: {pdfFileName}.pdf</p>
          </div>
          <PrintButton autoPrint={print === "1"} fileName={pdfFileName} label={isEstimate ? "Print Estimate Bill" : "Print A4 invoice"} />
        </div>
        <header className="print-document-header print-break-avoid flex flex-col gap-5 border-b-2 border-zinc-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="print-brand flex items-start gap-4">
            {projection.firm.logoUrl ? (
              <Image
                alt={`${projection.firm.firmName} approved logo`}
                className="print-logo size-20 shrink-0 object-contain sm:size-24"
                height={96}
                priority
                src={projection.firm.logoUrl}
                unoptimized
                width={96}
              />
            ) : null}
            <div>
              <h1 className="print-firm-title text-2xl font-bold tracking-normal">{projection.firm.firmName}</h1>
              {projection.firm.tagline ? <p className="print-firm-tagline mt-1 text-xs font-semibold">{projection.firm.tagline}</p> : null}
              <p className="print-firm-address mt-2 max-w-xl text-xs leading-5">{formatAddress(projection.firm.address)}</p>
              <p className="print-firm-contact text-xs">{[projection.firm.phone, projection.firm.email].filter(Boolean).join(" | ")}</p>
              <p className="print-firm-gstin mt-1 text-xs font-semibold">GSTIN: {projection.firm.gstin ?? "Not provided"}</p>
            </div>
          </div>
          <div className="print-document-meta min-w-52 text-left sm:text-right">
            <p className="print-document-title text-xl font-bold">{documentLabel(projection.document.type)}</p>
            <dl className="print-document-details mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs sm:grid-cols-[1fr_auto]">
              <dt>Number</dt><dd className="font-semibold">{projection.document.documentNumber}</dd>
              <dt>Date</dt><dd>{formatDate(documentDate)}</dd>
              <dt>Status</dt><dd>{humanize(projection.document.status)}</dd>
            </dl>
          </div>
        </header>
        {projection.document.status === "CANCELLED" ? (
          <div className="print-cancelled-banner print-break-avoid mt-4 rounded-md border-2 border-zinc-900 bg-zinc-100 px-4 py-3 text-center text-sm font-bold tracking-normal">
            CANCELLED / VOID - DO NOT COLLECT PAYMENT OR DISPATCH GOODS AGAINST THIS DOCUMENT
          </div>
        ) : null}

        <section className="print-party-section print-break-avoid grid gap-4 border-b border-zinc-400 py-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold uppercase">{isPurchaseDocument(projection.document.type) ? "Supplier" : "Bill to"}</p>
            <p className="print-party-name mt-1 text-sm font-semibold">{customerName}</p>
            {documentAddress ? <p className="mt-1 max-w-md leading-5">{documentAddress}</p> : null}
            {projection.customer?.phone ? <p>{projection.customer.phone}</p> : null}
            {projection.customer?.gstin ? <p>GSTIN: {projection.customer.gstin}</p> : null}
          </div>
          <div className="print-tax-treatment sm:text-right">
            {typeof projection.document.metadata.referenceNumber === "string" ? (
              <><p className="font-semibold uppercase">Reference</p><p className="mt-1">{projection.document.metadata.referenceNumber}</p></>
            ) : null}
            <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
            {isEstimate ? <p className="mt-1 font-semibold">Confirmed Estimate Bill · Stock deducted</p> : null}
          </div>
        </section>

        <div className="print-table-wrap mt-4 overflow-x-auto">
          <table className="print-table min-w-[780px] w-full border-collapse text-[10px] sm:text-xs">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "31%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr className="border-y border-zinc-500 bg-zinc-100 text-left">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">HSN</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Disc.</th>
                <th className="px-2 py-2 text-right">Taxable</th>
                <th className="px-2 py-2 text-right">GST</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {projection.items.map((item, index) => (
                <tr className="border-b border-zinc-300 align-top" key={`${item.description}-${index}`}>
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="break-words px-2 py-2 font-medium">{item.description}</td>
                  <td className="px-2 py-2">{item.hsnCode ?? "Pending"}</td>
                  <td className="px-2 py-2 text-right">{item.quantity}</td>
                  <td className="px-2 py-2">{item.unitCode ?? "-"}</td>
                  <td className="px-2 py-2 text-right">{money(item.unitAmountCents)}</td>
                  <td className="px-2 py-2 text-right">{item.discountPercent === null ? money(item.discountCents) : `${item.discountPercent}%`}</td>
                  <td className="px-2 py-2 text-right">{money(item.taxableCents)}</td>
                  <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td>
                  <td className="px-2 py-2 text-right font-medium">{money(item.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="print-summary print-break-avoid mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-xs font-semibold uppercase">Tax summary</p>
            {projection.gstSummary.length ? (
              <table className="print-gst-table mt-2 w-full max-w-md text-xs">
                <thead className="border-b border-zinc-400 text-left"><tr><th className="py-1">Rate</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
                <tbody>{projection.gstSummary.map((row) => {
                  const cgst = taxMode === "intra-state" ? Math.floor(row.taxCents / 2) : 0;
                  const sgst = taxMode === "intra-state" ? row.taxCents - cgst : 0;
                  return <tr key={row.taxRateBps}><td className="py-1">{row.taxRateBps / 100}%</td><td>{money(row.taxableCents)}</td><td>{money(cgst)}</td><td>{money(sgst)}</td><td>{money(taxMode === "inter-state" ? row.taxCents : 0)}</td></tr>;
                })}</tbody>
              </table>
            ) : <p className="mt-2 text-xs">No tax lines.</p>}
            <p className="print-amount-words-title mt-5 text-xs font-semibold uppercase">Amount in words</p>
            <p className="print-amount-words mt-1 text-sm">{projection.document.totalsInWords}</p>
          </div>
          <dl className="print-totals space-y-2 text-xs">
            <AmountRow label="Subtotal" value={projection.document.subtotalCents} />
            <AmountRow label="Line discounts" value={-projection.document.discountCents} />
            <AmountRow label={taxMode === "inter-state" ? "IGST" : "CGST + SGST"} value={projection.document.taxCents} />
            <AmountRow label="Round-off" value={projection.document.roundOffCents} />
            <div className="print-grand-total flex justify-between border-t-2 border-zinc-900 pt-2 text-base font-bold"><dt>Grand total</dt><dd>{money(projection.document.totalCents)}</dd></div>
          </dl>
        </section>

        <footer className="print-footer print-break-avoid mt-10 grid gap-10 border-t border-zinc-400 pt-5 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold">Terms</p>
            <p className="mt-1 leading-5">{projection.firm.termsFooter ?? "WAITING FOR CLIENT CONFIRMATION"}</p>
            {projection.firm.legalName ? <p className="mt-3">Legal proprietor: {projection.firm.legalName}</p> : null}
          </div>
          <div className="text-right">
            <p>For {projection.firm.firmName}</p>
            <div className="print-signature-line ml-auto mt-14 w-52 border-t border-zinc-700 pt-2">{projection.signatureLabel}</div>
          </div>
        </footer>
      </section>
    </main>
  );
}

function AmountRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-3"><dt>{label}</dt><dd>{money(value)}</dd></div>;
}

async function loadProjection(
  service: HardwareTradeService,
  input: { documentId: string; tenantId: string; userId: string },
): Promise<HardwarePrintProjection> {
  try {
    return await service.printProjection(
      { tenantId: input.tenantId, userId: input.userId },
      input.documentId,
    );
  } catch {
    notFound();
  }
}

function documentLabel(type: string) {
  if (type === "SALES_QUOTATION") return "ESTIMATE BILL";
  if (type === "SALES_ORDER") return "TAX INVOICE";
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
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

function buildPdfFileName(documentNumber: string, customerName: string) {
  const safeDocumentNumber = sanitizeFilePart(documentNumber) || "Invoice";
  const safeCustomerName = sanitizeFilePart(customerName).slice(0, 80) || "Walk-in Customer";
  return `${safeDocumentNumber} - ${safeCustomerName}`;
}

function sanitizeFilePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/[. ]+$/gu, "")
    .trim();
}

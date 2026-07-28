import { getPrisma } from "@trustfirst/database";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/hardware/print-button";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService, type HardwarePrintProjection } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwarePrintPreviewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const projection = await loadProjection(service, {
    documentId,
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });
  const taxMode = projection.document.metadata.taxMode === "inter-state" ? "inter-state" : "intra-state";
  const documentDate =
    typeof projection.document.metadata.documentDate === "string"
      ? projection.document.metadata.documentDate
      : projection.document.createdAt;
  const customerName = projection.customer?.name ?? "Walk-in Customer";
  const pdfFileName = buildPdfFileName(projection.document.documentNumber, customerName);

  return (
    <main className="min-h-screen bg-zinc-200 p-3 text-black sm:p-6 print:min-h-0 print:bg-white print:p-0">
      <section className="print-sheet mx-auto w-full max-w-[210mm] bg-white p-5 shadow-md sm:p-8 print:max-w-none print:p-0 print:shadow-none">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; }
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
            }
            .print-table-wrap { overflow: visible !important; }
            .print-table {
              width: 100% !important;
              min-width: 0 !important;
              table-layout: fixed !important;
              font-size: 9px !important;
            }
            .print-table th,
            .print-table td {
              padding-left: 1.2mm !important;
              padding-right: 1.2mm !important;
              white-space: normal !important;
              overflow-wrap: anywhere !important;
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }
            .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">A4 invoice preview</p>
            <p className="text-xs text-zinc-600">PDF name: {pdfFileName}.pdf</p>
          </div>
          <PrintButton fileName={pdfFileName} />
        </div>
        <header className="print-break-avoid flex flex-col gap-5 border-b-2 border-zinc-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {projection.firm.logoUrl ? (
              <Image
                alt={`${projection.firm.firmName} approved logo`}
                className="size-20 shrink-0 object-contain sm:size-24"
                height={96}
                priority
                src={projection.firm.logoUrl}
                unoptimized
                width={96}
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold tracking-normal">{projection.firm.firmName}</h1>
              {projection.firm.tagline ? <p className="mt-1 text-xs font-semibold">{projection.firm.tagline}</p> : null}
              <p className="mt-2 max-w-xl text-xs leading-5">{formatAddress(projection.firm.address)}</p>
              <p className="text-xs">{[projection.firm.phone, projection.firm.email].filter(Boolean).join(" | ")}</p>
              <p className="mt-1 text-xs font-semibold">GSTIN: {projection.firm.gstin ?? "Not provided"}</p>
            </div>
          </div>
          <div className="min-w-52 text-left sm:text-right">
            <p className="text-xl font-bold">{documentLabel(projection.document.type)}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs sm:grid-cols-[1fr_auto]">
              <dt>Number</dt><dd className="font-semibold">{projection.document.documentNumber}</dd>
              <dt>Date</dt><dd>{formatDate(documentDate)}</dd>
              <dt>Status</dt><dd>{humanize(projection.document.status)}</dd>
            </dl>
          </div>
        </header>
        {projection.document.status === "CANCELLED" ? (
          <div className="print-break-avoid mt-4 rounded-md border-2 border-zinc-900 bg-zinc-100 px-4 py-3 text-center text-sm font-bold tracking-normal">
            CANCELLED / VOID - DO NOT COLLECT PAYMENT OR DISPATCH GOODS AGAINST THIS DOCUMENT
          </div>
        ) : null}

        <section className="print-break-avoid grid gap-4 border-b border-zinc-400 py-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold uppercase">{isPurchaseDocument(projection.document.type) ? "Supplier" : "Bill to"}</p>
            <p className="mt-1 text-sm font-semibold">{customerName}</p>
            {projection.customer?.address ? <p className="mt-1 max-w-md leading-5">{projection.customer.address}</p> : null}
            {projection.customer?.phone ? <p>{projection.customer.phone}</p> : null}
            {projection.customer?.gstin ? <p>GSTIN: {projection.customer.gstin}</p> : null}
          </div>
          <div className="sm:text-right">
            {typeof projection.document.metadata.referenceNumber === "string" ? (
              <><p className="font-semibold uppercase">Reference</p><p className="mt-1">{projection.document.metadata.referenceNumber}</p></>
            ) : null}
            <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
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

        <section className="print-break-avoid mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-xs font-semibold uppercase">Tax summary</p>
            {projection.gstSummary.length ? (
              <table className="mt-2 w-full max-w-md text-xs">
                <thead className="border-b border-zinc-400 text-left"><tr><th className="py-1">Rate</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
                <tbody>{projection.gstSummary.map((row) => {
                  const cgst = taxMode === "intra-state" ? Math.floor(row.taxCents / 2) : 0;
                  const sgst = taxMode === "intra-state" ? row.taxCents - cgst : 0;
                  return <tr key={row.taxRateBps}><td className="py-1">{row.taxRateBps / 100}%</td><td>{money(row.taxableCents)}</td><td>{money(cgst)}</td><td>{money(sgst)}</td><td>{money(taxMode === "inter-state" ? row.taxCents : 0)}</td></tr>;
                })}</tbody>
              </table>
            ) : <p className="mt-2 text-xs">No tax lines.</p>}
            <p className="mt-5 text-xs font-semibold uppercase">Amount in words</p>
            <p className="mt-1 text-sm">{projection.document.totalsInWords}</p>
          </div>
          <dl className="space-y-2 text-xs">
            <AmountRow label="Subtotal" value={projection.document.subtotalCents} />
            <AmountRow label="Line discounts" value={-projection.document.discountCents} />
            <AmountRow label={taxMode === "inter-state" ? "IGST" : "CGST + SGST"} value={projection.document.taxCents} />
            <AmountRow label="Round-off" value={projection.document.roundOffCents} />
            <div className="flex justify-between border-t-2 border-zinc-900 pt-2 text-base font-bold"><dt>Grand total</dt><dd>{money(projection.document.totalCents)}</dd></div>
          </dl>
        </section>

        <footer className="print-break-avoid mt-10 grid gap-10 border-t border-zinc-400 pt-5 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold">Terms</p>
            <p className="mt-1 leading-5">{projection.firm.termsFooter ?? "WAITING FOR CLIENT CONFIRMATION"}</p>
            {projection.firm.legalName ? <p className="mt-3">Legal proprietor: {projection.firm.legalName}</p> : null}
          </div>
          <div className="text-right">
            <p>For {projection.firm.firmName}</p>
            <div className="ml-auto mt-14 w-52 border-t border-zinc-700 pt-2">{projection.signatureLabel}</div>
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
  if (type === "SALES_QUOTATION") return "QUOTATION";
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

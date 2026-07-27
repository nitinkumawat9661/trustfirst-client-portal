import { getPrisma } from "@trustfirst/database";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService, type HardwarePrintProjection } from "@/server/hardware";
import { PrintButton } from "@/components/hardware/print-button";

export const dynamic = "force-dynamic";

export default async function HardwarePrintPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const { documentId } = await params;
  const query = await searchParams;
  const format = parsePrintFormat(query.format);
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const projection = await loadProjection(service, {
    documentId,
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });
  const taxMode = projection.document.metadata.taxMode === "inter-state" ? "inter-state" : "intra-state";
  const isQuotation = projection.document.type === "SALES_QUOTATION";
  const quotationGstIncluded = !isQuotation || projection.document.metadata.quotationGstIncluded === true || projection.document.taxCents > 0;
  const documentDate =
    typeof projection.document.metadata.documentDate === "string"
      ? projection.document.metadata.documentDate
      : projection.document.createdAt;

  return (
    <main className="min-h-screen bg-zinc-200 p-3 text-black sm:p-6 print:bg-white print:p-0">
      <section className={`print-sheet mx-auto w-full bg-white shadow-md print:shadow-none ${format === "a4" ? "max-w-[210mm] p-6" : format === "80mm" ? "max-w-[80mm] p-3" : "max-w-[58mm] p-2"}`}>
        <style>{`
          .print-table { table-layout: fixed; }
          .print-item { overflow-wrap: anywhere; word-break: normal; }
          @media print {
            @page { size: ${format === "a4" ? "A4 portrait" : `${format} auto`}; margin: ${format === "a4" ? "8mm" : "2mm"}; }
            html, body { margin: 0 !important; background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-sheet { width: 100% !important; max-width: none !important; min-height: auto !important; padding: 0 !important; box-shadow: none !important; }
            .print-table-wrap { overflow: visible !important; }
            .print-table { width: 100% !important; min-width: 0 !important; table-layout: fixed !important; }
            .print-logo { width: ${format === "a4" ? "70px" : "42px"} !important; height: ${format === "a4" ? "70px" : "42px"} !important; }
            .print-header { gap: ${format === "a4" ? "12px" : "6px"} !important; padding-bottom: ${format === "a4" ? "10px" : "6px"} !important; }
            .print-compact-gap { margin-top: ${format === "a4" ? "10px" : "6px"} !important; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }
            .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{formatLabel(format)} print preview</span>
            {(["58mm", "80mm", "a4"] as const).map((candidate) => (
              <Link
                className={`rounded-md border px-2 py-1 text-xs ${candidate === format ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-900"}`}
                href={`/admin/hardware/print/${documentId}?format=${candidate}`}
                key={candidate}
              >
                {formatLabel(candidate)}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
        <header className={`print-header print-break-avoid flex flex-col gap-5 border-b-2 border-zinc-900 pb-5 ${format === "a4" ? "sm:flex-row sm:items-start sm:justify-between" : "items-center text-center"}`}>
          <div className="flex items-start gap-4">
            {projection.firm.logoUrl ? (
              <Image
                alt={`${projection.firm.firmName} approved logo`}
                className="print-logo size-16 shrink-0 object-contain sm:size-20"
                height={96}
                priority
                src={projection.firm.logoUrl}
                unoptimized
                width={96}
              />
            ) : null}
            <div>
              <h1 className={format === "a4" ? "text-xl font-bold tracking-normal" : "text-base font-bold tracking-normal"}>{projection.firm.firmName}</h1>
              {projection.firm.tagline ? <p className="mt-1 text-xs font-semibold">{projection.firm.tagline}</p> : null}
              <p className="mt-2 max-w-xl text-xs leading-5">{formatAddress(projection.firm.address)}</p>
              <p className="text-xs">{[projection.firm.phone, projection.firm.email].filter(Boolean).join(" | ")}</p>
              <p className="mt-1 text-xs font-semibold">GSTIN: {projection.firm.gstin ?? "Not provided"}</p>
            </div>
          </div>
          <div className="min-w-52 text-left sm:text-right">
            <p className={format === "a4" ? "text-lg font-bold" : "text-base font-bold"}>{documentLabel(projection.document.type)}</p>
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

        <section className={`print-break-avoid grid gap-4 border-b border-zinc-400 py-3 text-xs ${format === "a4" ? "sm:grid-cols-2" : ""}`}>
          <div>
            <p className="font-semibold uppercase">{isPurchaseDocument(projection.document.type) ? "Supplier" : "Bill to"}</p>
            <p className="mt-1 text-sm font-semibold">{projection.customer?.name ?? "Not linked"}</p>
            {projection.customer?.address ? <p className="mt-1 max-w-md leading-5">{projection.customer.address}</p> : null}
            {projection.customer?.phone ? <p>{projection.customer.phone}</p> : null}
            {projection.customer?.gstin ? <p>GSTIN: {projection.customer.gstin}</p> : null}
          </div>
          <div className={format === "a4" ? "sm:text-right" : ""}>
            {typeof projection.document.metadata.referenceNumber === "string" ? (
              <><p className="font-semibold uppercase">Reference</p><p className="mt-1">{projection.document.metadata.referenceNumber}</p></>
            ) : null}
            <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
            {isQuotation ? (
              <p className="mt-1 font-semibold">{quotationGstIncluded ? "GST included as shown below." : "GST not included."}</p>
            ) : null}
          </div>
        </section>

        <div className="print-table-wrap mt-3 overflow-x-auto">
          {format === "a4" ? (
          <table className="print-table w-full border-collapse text-[10px] sm:text-[11px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[30%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
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
                  <td className="print-item px-2 py-2 font-medium">
                    {item.description}
                    {isQuotation && !quotationGstIncluded && item.productGstRateBps !== null ? <div className="text-[9px] font-normal">Product GST ref {item.productGstRateBps / 100}%</div> : null}
                  </td>
                  <td className="px-2 py-2">{item.hsnCode ?? "Pending"}</td>
                  <td className="px-2 py-2 text-right">{item.quantity}</td>
                  <td className="px-2 py-2">{item.unitCode ?? "-"}</td>
                  <td className="px-2 py-2 text-right">{money(item.unitAmountCents)}</td>
                  <td className="px-2 py-2 text-right">{discountDisplay(item)}</td>
                  <td className="px-2 py-2 text-right">{money(item.taxableCents)}</td>
                  <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td>
                  <td className="px-2 py-2 text-right font-medium">{money(item.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            <div className="space-y-2 text-[10px]">
              {projection.items.map((item, index) => (
                <div className="border-b border-zinc-300 pb-2" key={`${item.description}-${index}`}>
                  <div className="flex justify-between gap-2 font-semibold">
                    <span className="print-item">{index + 1}. {item.description}</span>
                    <span>{money(item.lineTotalCents)}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                    <span>Qty {item.quantity} {item.unitCode ?? ""}</span>
                    <span className="text-right">Rate {money(item.unitAmountCents)}</span>
                    <span>Discount {discountDisplay(item)}</span>
                    <span className="text-right">Taxable {money(item.taxableCents)}</span>
                    <span>HSN {item.hsnCode ?? "-"}</span>
                    <span className="text-right">GST {quotationGstIncluded ? `${item.taxRateBps / 100}%` : "not included"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <section className={`print-compact-gap print-break-avoid mt-5 grid gap-5 ${format === "a4" ? "sm:grid-cols-[minmax(0,1fr)_260px]" : ""}`}>
          <div>
            <p className="text-xs font-semibold uppercase">Tax summary</p>
            {isQuotation && !quotationGstIncluded ? (
              <p className="mt-2 text-xs font-semibold">GST not included in this quotation. Item HSN/GST references are shown only for product identification.</p>
            ) : projection.gstSummary.length ? (
              <table className="mt-2 w-full max-w-md text-xs">
                <thead className="border-b border-zinc-400 text-left"><tr><th className="py-1">Rate</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
                <tbody>{projection.gstSummary.map((row) => {
                  const cgst = taxMode === "intra-state" ? Math.floor(row.taxCents / 2) : 0;
                  const sgst = taxMode === "intra-state" ? row.taxCents - cgst : 0;
                  return <tr key={row.taxRateBps}><td className="py-1">{row.taxRateBps / 100}%</td><td>{money(row.taxableCents)}</td><td>{money(cgst)}</td><td>{money(sgst)}</td><td>{money(taxMode === "inter-state" ? row.taxCents : 0)}</td></tr>;
                })}</tbody>
              </table>
            ) : <p className="mt-2 text-xs">No tax lines.</p>}
            <p className="mt-4 text-xs font-semibold uppercase">Amount in words</p>
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

        <footer className="print-break-avoid mt-7 grid gap-8 border-t border-zinc-400 pt-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold">Terms</p>
            <p className="mt-1 leading-5">{projection.firm.termsFooter ?? "WAITING FOR CLIENT CONFIRMATION"}</p>
            {projection.firm.legalName ? <p className="mt-3">Legal proprietor: {projection.firm.legalName}</p> : null}
          </div>
          <div className="text-right">
            <p>For {projection.firm.firmName}</p>
            <div className="ml-auto mt-10 w-52 border-t border-zinc-700 pt-2">{projection.signatureLabel}</div>
          </div>
        </footer>
      </section>
    </main>
  );
}

function discountDisplay(item: HardwarePrintProjection["items"][number]) {
  if (item.discountType === "flat") return money(item.discountCents);
  if (item.discountType === "percent" && item.discountValue !== null) return `${item.discountValue}%`;
  if (item.discountPercent !== null) return `${item.discountPercent}%`;
  return money(item.discountCents);
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

function parsePrintFormat(value: string | undefined): "58mm" | "80mm" | "a4" {
  return value === "58mm" || value === "80mm" || value === "a4" ? value : "a4";
}

function formatLabel(value: "58mm" | "80mm" | "a4") {
  if (value === "a4") return "A4";
  return value === "58mm" ? "58 mm" : "80 mm";
}

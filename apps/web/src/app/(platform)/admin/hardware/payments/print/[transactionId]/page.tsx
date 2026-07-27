import { getPrisma } from "@trustfirst/database";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/hardware/print-button";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareFinancialService, type HardwareFinancialPrintProjection } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareFinancialPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const { transactionId } = await params;
  const query = await searchParams;
  const format = parsePrintFormat(query.format);
  const user = await requireCurrentUser();
  const service = new HardwareFinancialService(getPrisma());
  const projection = await loadProjection(service, {
    tenantId: user.activeTenantId ?? "public",
    transactionId,
    userId: user.id,
  });
  const compact = format !== "a4";

  return (
    <main className="min-h-screen bg-zinc-200 p-3 text-black sm:p-6 print:bg-white print:p-0">
      <section className={`print-sheet mx-auto w-full bg-white shadow-md print:shadow-none ${format === "a4" ? "max-w-[210mm] p-6" : format === "80mm" ? "max-w-[80mm] p-3" : "max-w-[58mm] p-2"}`}>
        <style>{`
          .print-item { overflow-wrap: anywhere; word-break: normal; }
          @media print {
            @page { size: ${format === "a4" ? "A4 portrait" : `${format} auto`}; margin: ${format === "a4" ? "8mm" : "2mm"}; }
            html, body { margin: 0 !important; background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-sheet { width: 100% !important; max-width: none !important; min-height: auto !important; padding: 0 !important; box-shadow: none !important; }
            .print-logo { width: ${format === "a4" ? "70px" : "42px"} !important; height: ${format === "a4" ? "70px" : "42px"} !important; }
            .print-header { gap: ${format === "a4" ? "12px" : "6px"} !important; padding-bottom: ${format === "a4" ? "10px" : "6px"} !important; }
            .print-table { width: 100% !important; table-layout: fixed !important; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }
            .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{formatLabel(format)} payment print preview</span>
            {(["58mm", "80mm", "a4"] as const).map((candidate) => (
              <Link
                className={`rounded-md border px-2 py-1 text-xs ${candidate === format ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-900"}`}
                href={`/admin/hardware/payments/print/${transactionId}?format=${candidate}`}
                key={candidate}
              >
                {formatLabel(candidate)}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>

        <header className={`print-header print-break-avoid flex flex-col gap-5 border-b-2 border-zinc-900 pb-5 ${compact ? "items-center text-center" : "sm:flex-row sm:items-start sm:justify-between"}`}>
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
              <h1 className={compact ? "text-base font-bold tracking-normal" : "text-xl font-bold tracking-normal"}>{projection.firm.firmName}</h1>
              {projection.firm.tagline ? <p className="mt-1 text-xs font-semibold">{projection.firm.tagline}</p> : null}
              <p className="mt-2 max-w-xl text-xs leading-5">{formatAddress(projection.firm.address)}</p>
              <p className="text-xs">{[projection.firm.phone, projection.firm.email].filter(Boolean).join(" | ")}</p>
              <p className="mt-1 text-xs font-semibold">GSTIN: {projection.firm.gstin ?? "Not provided"}</p>
            </div>
          </div>
          <div className={compact ? "text-center" : "min-w-56 text-left sm:text-right"}>
            <p className={compact ? "text-base font-bold" : "text-lg font-bold"}>{documentLabel(projection.transaction.type)}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs sm:grid-cols-[1fr_auto]">
              <dt>Number</dt><dd className="font-semibold">{projection.transaction.transactionNumber}</dd>
              <dt>Date</dt><dd>{formatDate(projection.transaction.occurredAt)}</dd>
              <dt>Status</dt><dd>{humanize(projection.transaction.status)}</dd>
            </dl>
          </div>
        </header>

        {projection.transaction.status === "REVERSED" || projection.transaction.type.includes("REVERSAL") ? (
          <div className="print-break-avoid mt-4 rounded-md border-2 border-zinc-900 bg-zinc-100 px-4 py-3 text-center text-sm font-bold tracking-normal">
            REVERSED TRANSACTION - DO NOT TREAT AS ACTIVE PAYMENT
          </div>
        ) : null}

        <section className={`print-break-avoid grid gap-4 border-b border-zinc-400 py-4 text-xs ${compact ? "" : "sm:grid-cols-2"}`}>
          <div>
            <p className="font-semibold uppercase">{projection.transaction.type.startsWith("SUPPLIER") ? "Supplier" : "Customer"}</p>
            <p className="mt-1 text-sm font-semibold">{projection.party?.name ?? "Not linked"}</p>
            {projection.party?.address ? <p className="mt-1 max-w-md leading-5">{projection.party.address}</p> : null}
            {projection.party?.phone ? <p>{projection.party.phone}</p> : null}
            {projection.party?.gstin ? <p>GSTIN: {projection.party.gstin}</p> : null}
          </div>
          <div className={compact ? "" : "sm:text-right"}>
            <p>Mode: {projection.transaction.paymentMode ? humanize(projection.transaction.paymentMode) : "-"}</p>
            {projection.transaction.externalReference ? <p>Reference: {projection.transaction.externalReference}</p> : null}
            {projection.transaction.sourceNumber ? <p>Source: {projection.transaction.sourceNumber}</p> : null}
          </div>
        </section>

        <section className="print-break-avoid mt-5">
          <dl className="space-y-2 text-sm">
            <AmountRow label="Amount" value={projection.transaction.amountCents} strong />
          </dl>
          <p className="mt-4 text-xs font-semibold uppercase">Amount in words</p>
          <p className="mt-1 text-sm">{projection.amountInWords}</p>
          {projection.transaction.notes ? (
            <>
              <p className="mt-4 text-xs font-semibold uppercase">Notes</p>
              <p className="mt-1 text-sm">{projection.transaction.notes}</p>
            </>
          ) : null}
        </section>

        {projection.allocations.length ? (
          <section className="mt-5">
            <p className="text-xs font-semibold uppercase">Allocations</p>
            <table className="print-table mt-2 w-full border-collapse text-xs">
              <thead className="border-y border-zinc-500 bg-zinc-100 text-left">
                <tr><th className="px-2 py-2">Document</th><th className="px-2 py-2">Invoice</th><th className="px-2 py-2">Target</th><th className="px-2 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {projection.allocations.map((allocation, index) => (
                  <tr className="border-b border-zinc-300" key={`${allocation.targetNumber ?? allocation.documentNumber}-${index}`}>
                    <td className="print-item px-2 py-2">{allocation.documentNumber}</td>
                    <td className="px-2 py-2">{allocation.invoiceNumber ?? "-"}</td>
                    <td className="px-2 py-2">{allocation.targetNumber ?? "-"}</td>
                    <td className="px-2 py-2 text-right">{money(allocation.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : <p className="mt-5 rounded-md border border-zinc-300 p-3 text-xs">Unallocated advance transaction.</p>}

        <footer className="print-break-avoid mt-10 grid gap-10 border-t border-zinc-400 pt-5 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold">Receipt note</p>
            <p className="mt-1 leading-5">This print is generated from the saved financial transaction. Reprinting does not create payment, refund, stock, or ledger entries.</p>
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

function AmountRow({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return <div className={`flex justify-between gap-3 border-b border-zinc-300 pb-2 ${strong ? "text-base font-bold" : ""}`}><dt>{label}</dt><dd>{money(value)}</dd></div>;
}

async function loadProjection(
  service: HardwareFinancialService,
  input: { tenantId: string; transactionId: string; userId: string },
): Promise<HardwareFinancialPrintProjection> {
  try {
    return await service.transactionPrintProjection(
      { tenantId: input.tenantId, userId: input.userId },
      input.transactionId,
    );
  } catch {
    notFound();
  }
}

function documentLabel(type: string) {
  if (type === "CUSTOMER_PAYMENT") return "PAYMENT RECEIPT";
  if (type === "CUSTOMER_ADVANCE") return "ADVANCE RECEIPT";
  if (type === "CUSTOMER_REFUND_PAID") return "REFUND RECEIPT";
  if (type === "SUPPLIER_PAYMENT") return "PAYMENT VOUCHER";
  if (type === "SUPPLIER_ADVANCE") return "SUPPLIER ADVANCE VOUCHER";
  if (type === "MANUAL_DEBIT_ADJUSTMENT") return "LEDGER ADJUSTMENT VOUCHER";
  if (type === "MANUAL_CREDIT_ADJUSTMENT") return "LEDGER ADJUSTMENT VOUCHER";
  return humanize(type).toUpperCase();
}

function formatAddress(address: Record<string, unknown>) {
  const values = Object.values(address).filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return values.length ? values.join(", ") : "Address not provided";
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

function parsePrintFormat(value: string | undefined): "58mm" | "80mm" | "a4" {
  return value === "58mm" || value === "80mm" || value === "a4" ? value : "80mm";
}

function formatLabel(value: "58mm" | "80mm" | "a4") {
  if (value === "a4") return "A4";
  return value === "58mm" ? "58 mm" : "80 mm";
}

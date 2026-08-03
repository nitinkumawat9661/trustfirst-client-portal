"use client";

import { Button } from "@trustfirst/ui";
import { Printer, X } from "lucide-react";
import type { OfflineEstimatePrintPreview } from "@/lib/offline-data/estimate-preview";

export function OfflineEstimatePrintPreview({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: OfflineEstimatePrintPreview;
}) {
  const splitTax = preview.taxMode === "intra-state";
  const cgstCents = splitTax ? Math.floor(preview.totals.taxCents / 2) : 0;
  const sgstCents = splitTax ? preview.totals.taxCents - cgstCents : 0;

  function printPreview() {
    document.body.classList.add("offline-estimate-printing");
    try {
      window.print();
    } finally {
      window.setTimeout(() => document.body.classList.remove("offline-estimate-printing"), 0);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-3 sm:p-6">
      <div className="no-print mx-auto mb-3 flex w-full max-w-[210mm] items-center justify-between gap-3 rounded-md bg-white p-3 text-black shadow-xl">
        <div>
          <p className="font-semibold">Offline A4 Estimate Bill</p>
          <p className="text-xs text-zinc-600">Pending sync · {preview.documentNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printPreview} type="button">
            <Printer className="size-4" />Print / Save PDF
          </Button>
          <Button aria-label="Close offline print preview" onClick={onClose} type="button" variant="outline">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <article className="offline-estimate-print-root mx-auto min-h-[277mm] w-full max-w-[210mm] bg-white p-[9mm] text-black shadow-2xl">
        <header className="border-b-2 border-black pb-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Offline Copy · Pending Sync</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-wide">{preview.firm.name}</h1>
          {preview.firm.address ? <p className="mt-1 text-xs">{preview.firm.address}</p> : null}
          <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px]">
            {preview.firm.gstin ? <span>GSTIN: {preview.firm.gstin}</span> : null}
            {preview.firm.phone ? <span>Phone: {preview.firm.phone}</span> : null}
            {preview.firm.email ? <span>Email: {preview.firm.email}</span> : null}
          </div>
        </header>

        <section className="grid grid-cols-2 border-x border-b border-black text-xs">
          <div className="border-r border-black p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-600">Customer</p>
            <p className="mt-1 font-bold">{preview.customer.name}</p>
            {preview.customer.address ? <p className="mt-1 whitespace-pre-wrap">{preview.customer.address}</p> : null}
            {preview.customer.referenceNumber ? <p className="mt-1">Reference: {preview.customer.referenceNumber}</p> : null}
          </div>
          <div className="p-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold">Estimate No.</dt><dd className="text-right font-mono font-bold">{preview.documentNumber}</dd>
              <dt className="font-semibold">Date</dt><dd className="text-right">{formatDate(preview.documentDate)}</dd>
              <dt className="font-semibold">Payment</dt><dd className="text-right">{preview.paymentMode}</dd>
              <dt className="font-semibold">Tax</dt><dd className="text-right">{splitTax ? "CGST + SGST" : "IGST"}</dd>
            </dl>
          </div>
        </section>

        <table className="w-full table-fixed border-collapse border-x border-b border-black text-[10px]">
          <thead>
            <tr className="bg-zinc-100">
              <HeaderCell className="w-[5%]">#</HeaderCell>
              <HeaderCell className="w-[31%] text-left">Description</HeaderCell>
              <HeaderCell className="w-[10%]">HSN</HeaderCell>
              <HeaderCell className="w-[8%]">Qty</HeaderCell>
              <HeaderCell className="w-[8%]">Unit</HeaderCell>
              <HeaderCell className="w-[12%]">Rate</HeaderCell>
              <HeaderCell className="w-[8%]">Disc.</HeaderCell>
              <HeaderCell className="w-[8%]">GST</HeaderCell>
              <HeaderCell className="w-[10%]">Amount</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((item, index) => (
              <tr className="align-top" key={`${item.description}-${index}`}>
                <BodyCell>{index + 1}</BodyCell>
                <BodyCell className="text-left font-medium">{item.description}</BodyCell>
                <BodyCell>{item.hsnCode ?? "—"}</BodyCell>
                <BodyCell>{item.quantity}</BodyCell>
                <BodyCell>{item.unitCode ?? "—"}</BodyCell>
                <BodyCell>{money(item.unitRateCents)}</BodyCell>
                <BodyCell>{formatPercent(item.discountPercent)}</BodyCell>
                <BodyCell>{formatPercent(item.taxRateBps / 100)}</BodyCell>
                <BodyCell className="font-semibold">{money(item.lineTotalCents)}</BodyCell>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="offline-estimate-print-summary grid grid-cols-[1fr_78mm] border-x border-b border-black text-xs">
          <div className="border-r border-black p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-600">Status</p>
            <p className="mt-1 font-semibold">Saved on this authorised device and waiting for server sync.</p>
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
              This offline copy uses a reserved document number. Final server records, stock posting and ledger validation complete after reconnection.
            </p>
            <p className="mt-3 text-[10px]">Local save time: {new Date(preview.generatedAt).toLocaleString("en-IN")}</p>
          </div>
          <dl className="space-y-1 p-3">
            <TotalRow label="Gross value" value={preview.totals.grossCents} />
            <TotalRow label="Less discount" value={-preview.totals.discountCents} />
            <TotalRow label="Taxable value" value={preview.totals.taxableCents} />
            {splitTax ? <>
              <TotalRow label="CGST" value={cgstCents} />
              <TotalRow label="SGST" value={sgstCents} />
            </> : <TotalRow label="IGST" value={preview.totals.taxCents} />}
            <TotalRow label="Round off" value={preview.totals.roundOffCents} />
            <div className="mt-2 flex justify-between border-t border-black pt-2 text-sm font-black">
              <dt>Grand Total</dt><dd>{money(preview.totals.totalCents)}</dd>
            </div>
            <TotalRow label="Paid" value={preview.totals.paidAmountCents} />
            <TotalRow label="Balance" value={Math.max(preview.totals.totalCents - preview.totals.paidAmountCents, 0)} />
          </dl>
        </section>

        <footer className="offline-estimate-print-footer mt-4 grid grid-cols-[1fr_58mm] gap-6 text-[10px]">
          <div>
            {preview.firm.termsFooter ? <p className="whitespace-pre-wrap">{preview.firm.termsFooter}</p> : null}
            <p className="mt-2 font-semibold">Computer-generated offline estimate copy.</p>
          </div>
          <div className="pt-10 text-center">
            <div className="border-t border-black pt-1">Authorised Signature</div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function HeaderCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`border-r border-black p-1.5 text-center font-bold last:border-r-0 ${className}`}>{children}</th>;
}

function BodyCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-r border-t border-black p-1.5 text-center last:border-r-0 ${className}`}>{children}</td>;
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-medium">{money(value)}</dd></div>;
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(amountCents / 100);
}

function formatPercent(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

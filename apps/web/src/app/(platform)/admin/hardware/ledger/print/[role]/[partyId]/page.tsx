import { getPrisma } from "@trustfirst/database";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/hardware/print-button";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareLedgerPrintPage({
  params,
}: {
  params: Promise<{ partyId: string; role: string }>;
}) {
  const { partyId, role } = await params;
  const partyRole = role === "supplier" ? "supplier" : role === "customer" ? "customer" : null;
  if (!partyRole) notFound();
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const service = new HardwareService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const ledger = (await service.ledger(context, partyRole, partyId))[0];
  if (!ledger) notFound();
  const [settings, tenant] = await Promise.all([
    prisma.hardwareBusinessSettings.findUnique({ where: { tenantId: context.tenantId } }),
    prisma.tenant.findUnique({ select: { branding: true }, where: { id: context.tenantId } }),
  ]);
  const branding = asRecord(tenant?.branding);
  const officialIdentity = asRecord(branding.officialIdentity);
  const logo = asRecord(branding.logo);
  const identityLocked = officialIdentity.status === "LOCKED";

  return (
    <main className="min-h-screen bg-zinc-200 p-3 text-black sm:p-6 print:bg-white print:p-0">
      <section className="print-sheet mx-auto w-full max-w-[210mm] bg-white p-5 shadow-md sm:p-8 print:p-0 print:shadow-none">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            .no-print { display: none !important; }
            .print-sheet { width: auto; min-height: auto; }
            thead { display: table-header-group; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
          <Link className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900" href={`/admin/hardware/ledger?tab=${partyRole}&party=${partyId}`}>
            Back to ledger
          </Link>
          <PrintButton />
        </div>

        <header className="flex flex-col gap-5 border-b-2 border-zinc-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {identityLocked && typeof logo.assetKey === "string" ? (
              <Image
                alt={`${settings?.firmName ?? "Firm"} approved logo`}
                className="size-20 shrink-0 object-contain sm:size-24"
                height={96}
                priority
                src="/api/tenants/branding/logo"
                unoptimized
                width={96}
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold tracking-normal">{settings?.firmName ?? "Configured Firm"}</h1>
              {typeof branding.tagline === "string" ? <p className="mt-1 text-xs font-semibold">{branding.tagline}</p> : null}
              <p className="mt-2 max-w-xl text-xs leading-5">{formatAddress((settings?.address ?? {}) as Record<string, unknown>)}</p>
              <p className="text-xs">{[settings?.phone, settings?.email].filter(Boolean).join(" | ")}</p>
              <p className="mt-1 text-xs font-semibold">GSTIN: {settings?.gstin ?? "Not provided"}</p>
            </div>
          </div>
          <div className="min-w-56 text-left sm:text-right">
            <p className="text-xl font-bold">{partyRole === "supplier" ? "SUPPLIER STATEMENT" : "CUSTOMER STATEMENT"}</p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
              <dt>Party</dt><dd className="font-semibold">{ledger.partyName}</dd>
              <dt>Generated</dt><dd>{formatDateTime(new Date())}</dd>
            </dl>
          </div>
        </header>

        <section className="mt-5 grid gap-3 rounded-md border border-zinc-300 p-4 text-sm sm:grid-cols-4">
          <Metric label="Opening" value={ledger.openingBalanceCents} />
          <Metric label="Debit" value={ledger.totalPayableCents} />
          <Metric label="Credit" value={ledger.totalPaidCents} />
          <Metric label={balanceLabel(ledger.totalRemainingCents, partyRole)} value={ledger.totalRemainingCents} strong />
        </section>

        <table className="mt-5 w-full border-collapse text-xs">
          <thead className="border-y border-zinc-500 bg-zinc-100 text-left">
            <tr><th className="px-2 py-2">Date</th><th className="px-2 py-2">Reference</th><th className="px-2 py-2">Description</th><th className="px-2 py-2 text-right">Debit</th><th className="px-2 py-2 text-right">Credit</th><th className="px-2 py-2 text-right">Balance</th></tr>
          </thead>
          <tbody>
            {ledger.entries.map((entry) => (
              <tr className="border-b border-zinc-300 align-top" key={`${entry.reference}-${entry.date.toISOString()}`}>
                <td className="px-2 py-2">{entry.date.getTime() === 0 ? "-" : formatDate(entry.date)}</td>
                <td className="px-2 py-2">{entry.reference}</td>
                <td className="px-2 py-2">{entry.description}</td>
                <td className="px-2 py-2 text-right">{entry.debitCents ? money(entry.debitCents) : "-"}</td>
                <td className="px-2 py-2 text-right">{entry.creditCents ? money(entry.creditCents) : "-"}</td>
                <td className="px-2 py-2 text-right font-medium">{money(entry.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-10 grid gap-10 border-t border-zinc-400 pt-5 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold">Statement note</p>
            <p className="mt-1 leading-5">This statement is generated from saved ledger records. Printing or reprinting does not create financial, stock, or audit entries.</p>
            {identityLocked && typeof officialIdentity.legalName === "string" ? <p className="mt-3">Legal proprietor: {officialIdentity.legalName}</p> : null}
          </div>
          <div className="text-right">
            <p>For {settings?.firmName ?? "Configured Firm"}</p>
            <div className="ml-auto mt-14 w-52 border-t border-zinc-700 pt-2">Authorised signature</div>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Metric({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return <div><div className="text-xs text-zinc-600">{label}</div><div className={strong ? "font-bold" : "font-semibold"}>{money(value)}</div></div>;
}

function balanceLabel(balanceCents: number, role: "customer" | "supplier") {
  if (balanceCents === 0) return "Settled";
  if (role === "supplier") return balanceCents > 0 ? "Payable to supplier" : "Supplier owes business";
  return balanceCents > 0 ? "Customer owes business" : "Business owes customer";
}

function formatAddress(address: Record<string, unknown>) {
  const values = Object.values(address).filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return values.length ? values.join(", ") : "Address not provided";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

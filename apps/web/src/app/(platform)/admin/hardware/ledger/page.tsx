import { getPrisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Printer } from "lucide-react";
import Link from "next/link";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, type PartyLedger } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareLedgerPage({ searchParams }: { searchParams: Promise<{ party?: string; tab?: string }> }) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const activeTab = params.tab === "supplier" ? "supplier" : "customer";
  const [customers, suppliers] = await Promise.all([
    service.ledger(context, "customer", activeTab === "customer" ? params.party : undefined),
    service.ledger(context, "supplier", activeTab === "supplier" ? params.party : undefined),
  ]);
  const ledgers = activeTab === "supplier" ? suppliers : customers;
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Simple party ledger from opening balances, invoices, payments, and supplier bills. This is not a double-entry accounting ledger." eyebrow="Ledger" title="Customer and supplier ledger" />
      <div className="flex flex-wrap gap-2">
        <Tab href="/admin/hardware/ledger?tab=customer" active={activeTab === "customer"}>Customer Ledger</Tab>
        <Tab href="/admin/hardware/ledger?tab=supplier" active={activeTab === "supplier"}>Supplier Ledger</Tab>
      </div>
      <div className="space-y-5">
        {ledgers.length ? ledgers.map((ledger) => <LedgerCard key={ledger.partyId} ledger={ledger} role={activeTab} />) : (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No ledger entries are available for this tab.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function Tab({ active, children, href }: { active: boolean; children: React.ReactNode; href: string }) {
  return <Link className={`rounded-md border px-3 py-2 text-sm font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`} href={href}>{children}</Link>;
}

function LedgerCard({ ledger, role }: { ledger: PartyLedger; role: "customer" | "supplier" }) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{ledger.partyName}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Opening {money(ledger.openingBalanceCents)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Total {money(ledger.totalPayableCents)}</Badge>
          <Badge>Paid {money(ledger.totalPaidCents)}</Badge>
          <Badge>Balance {money(ledger.totalRemainingCents)}</Badge>
          <Link
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted"
            href={`/admin/hardware/ledger/print/${role}/${ledger.partyId}`}
            target="_blank"
          >
            <Printer className="size-3.5" />Print
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Date</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.entries.map((entry) => (
                <tr key={`${entry.reference}-${entry.date.toISOString()}`}>
                  <td className="py-3">{entry.date.getTime() === 0 ? "-" : entry.date.toLocaleDateString("en-IN")}</td>
                  <td>{entry.reference}</td>
                  <td>{entry.description}</td>
                  <td>{entry.debitCents ? money(entry.debitCents) : "-"}</td>
                  <td>{entry.creditCents ? money(entry.creditCents) : "-"}</td>
                  <td className="font-medium">{money(entry.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

import { getPrisma } from "@trustfirst/database";
import { Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import Link from "next/link";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareOutstandingPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [customers, suppliers] = await Promise.all([
    service.listParties(context, "customer"),
    service.listParties(context, "supplier"),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Opening balances plus unpaid saved documents. No historical balance is inferred from reference invoices." eyebrow="Ledger" title="Outstanding" />
      <div className="grid gap-5 xl:grid-cols-2">
        <OutstandingTable parties={customers} role="customer" title="Customer outstanding" />
        <OutstandingTable parties={suppliers} role="supplier" title="Supplier outstanding" />
      </div>
    </div>
  );
}

function OutstandingTable({ parties, role, title }: { parties: Awaited<ReturnType<HardwareService["listParties"]>>; role: "customer" | "supplier"; title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {parties.length === 0 ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No party balances are available.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="py-2">Party</th><th>Opening</th><th>Current</th><th>Dr/Cr</th><th>Ledger</th></tr></thead><tbody className="divide-y divide-border">{parties.map((party) => <tr key={party.id}><td className="py-3 font-medium">{party.name}</td><td>{money(party.openingBalanceCents)}</td><td>{money(party.currentBalanceCents)}</td><td>{party.balanceSide ?? "Settled"}</td><td><Link className="font-medium text-primary hover:underline" href={`/admin/hardware/ledger?tab=${role}&party=${party.id}`}>Open</Link></td></tr>)}</tbody></table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value / 100);
}

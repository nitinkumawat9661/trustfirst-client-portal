import { getPrisma } from "@trustfirst/database";
import { Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Boxes, ReceiptText } from "lucide-react";
import Link from "next/link";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareOperationalDashboardCards } from "@/components/hardware/hardware-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireCurrentUser();
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const prisma = getPrisma();
  const hardware = new HardwareService(prisma);
  const trade = new HardwareTradeService(prisma);
  const [dashboard, reports, reminders] = await Promise.all([
    hardware.operationalDashboard(context),
    trade.reports(context),
    hardware.reminders(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Live operational figures for the current tenant. Values remain empty until verified business transactions are entered."
        eyebrow="Business overview"
        title="Dashboard"
      />
      <HardwareOperationalDashboardCards dashboard={dashboard} reports={reports} />
      <Card>
        <CardHeader><CardTitle>Daily reminders</CardTitle></CardHeader>
        <CardContent>
          {reminders.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reminders.slice(0, 9).map((reminder) => (
                <Link className="rounded-md border border-border p-3 text-sm hover:bg-muted" href={reminder.actionHref} key={reminder.id}>
                  <span className="block font-medium">{reminder.title}</span>
                  <span className="mt-1 block text-muted-foreground">{reminder.label}</span>
                  {"amountCents" in reminder && reminder.amountCents !== undefined ? <span className="mt-2 block font-semibold">{money(reminder.amountCents)}</span> : null}
                  {"currentStock" in reminder && reminder.currentStock !== undefined ? <span className="mt-2 block font-semibold">Stock {reminder.currentStock}</span> : null}
                </Link>
              ))}
            </div>
          ) : <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No daily reminders from current data.</p>}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardList
          empty="No sales or supplier bills have been entered."
          icon={ReceiptText}
          items={dashboard.recentBills.map((item) => `${item.documentNumber} · ${money(item.totalCents)}`)}
          title="Recent bills"
        />
        <DashboardList
          empty="No products are available for movement analysis."
          icon={Boxes}
          items={dashboard.topProducts.map((item) => `${item.name} · ${item.quantity}`)}
          title="Top products by movement"
        />
      </div>
    </div>
  );
}

function DashboardList({ empty, icon: Icon, items, title }: { empty: string; icon: typeof Boxes; items: string[]; title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4 text-primary" />{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length ? <ul className="divide-y divide-border">{items.map((item) => <li className="py-3 text-sm" key={item}>{item}</li>)}</ul> : <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

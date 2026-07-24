import { getPrisma } from "@trustfirst/database";
import { Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Boxes, ReceiptText } from "lucide-react";
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
  const [dashboard, reports] = await Promise.all([
    hardware.operationalDashboard(context),
    trade.reports(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Live operational figures for the current tenant. Values remain empty until verified business transactions are entered."
        eyebrow="Business overview"
        title="Dashboard"
      />
      <HardwareOperationalDashboardCards dashboard={dashboard} reports={reports} />
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

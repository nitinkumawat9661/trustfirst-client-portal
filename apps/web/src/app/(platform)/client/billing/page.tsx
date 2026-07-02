import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { AppShell } from "@/components/shell/app-shell";
import { BillingDashboardCards, InvoiceList } from "@/components/billing/billing-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { BillingService } from "@/server/billing";

export const dynamic = "force-dynamic";

export default async function ClientBillingPage() {
  const user = await requireCurrentUser();
  const service = new BillingService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [dashboard, invoices] = await Promise.all([
    service.dashboard(context),
    service.listInvoices(context),
  ]);

  return (
    <AppShell mode="client">
      <div className="mb-6">
        <Badge>Billing</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Billing workspace</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          View invoices, payment status, due dates, and outstanding balances.
        </p>
      </div>
      <div className="space-y-6">
        <BillingDashboardCards dashboard={dashboard} />
        <InvoiceList hrefPrefix="/client/billing/invoices" invoices={invoices} />
      </div>
    </AppShell>
  );
}

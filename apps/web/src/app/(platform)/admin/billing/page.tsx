import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { BillingDashboardCards, InvoiceList, PaymentsFoundationPanel } from "@/components/billing/billing-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { BillingService } from "@/server/billing";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const user = await requireCurrentUser();
  const service = new BillingService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [dashboard, invoices] = await Promise.all([
    service.dashboard(context),
    service.listInvoices(context),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Badge>Billing foundation</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Billing dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Invoice and manual payment foundation with due tracking, partial payments, and provider contracts.
        </p>
      </div>
      <BillingDashboardCards dashboard={dashboard} />
      <InvoiceList hrefPrefix="/admin/billing/invoices" invoices={invoices} />
      <PaymentsFoundationPanel />
    </div>
  );
}

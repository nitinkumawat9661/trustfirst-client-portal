import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { InvoiceList } from "@/components/billing/billing-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { BillingService, type InvoiceSummary } from "@/server/billing";

export const dynamic = "force-dynamic";

export default async function AdminBillingInvoicesPage() {
  const user = await requireCurrentUser();
  const service = new BillingService(getPrisma());
  const invoices: InvoiceSummary[] = await service.listInvoices({ tenantId: user.activeTenantId ?? "public", userId: user.id });

  return (
    <div className="space-y-6">
      <div>
        <Badge>Invoices</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Invoice workspace</h1>
      </div>
      <InvoiceList hrefPrefix="/admin/billing/invoices" invoices={invoices} />
    </div>
  );
}

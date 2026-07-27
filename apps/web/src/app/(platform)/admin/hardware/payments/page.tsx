import { getPrisma } from "@trustfirst/database";
import Link from "next/link";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareLedgerAdjustmentForm, HardwarePaymentWorkbench } from "@/components/hardware/hardware-payment-workbench";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwarePaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const activeTab = params.tab === "supplier" || params.tab === "adjustments" ? params.tab : "customer";
  const [customers, suppliers] = await Promise.all([
    service.listParties(context, "customer"),
    service.listParties(context, "supplier"),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Post customer receipts, supplier vouchers, explicit invoice allocations, and advance balances from server-authoritative open items."
        eyebrow="Payments"
        title="Payments and advances"
      />
      <div className="flex flex-wrap gap-2">
        <Tab active={activeTab === "customer"} href="/admin/hardware/payments?tab=customer">Customer receipts</Tab>
        <Tab active={activeTab === "supplier"} href="/admin/hardware/payments?tab=supplier">Supplier payments</Tab>
        <Tab active={activeTab === "adjustments"} href="/admin/hardware/payments?tab=adjustments">Ledger adjustments</Tab>
      </div>
      {activeTab === "adjustments" ? (
        <HardwareLedgerAdjustmentForm customers={customers} suppliers={suppliers} />
      ) : (
        <HardwarePaymentWorkbench parties={activeTab === "supplier" ? suppliers : customers} role={activeTab} />
      )}
    </div>
  );
}

function Tab({ active, children, href }: { active: boolean; children: React.ReactNode; href: string }) {
  return <Link className={`rounded-md border px-3 py-2 text-sm font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`} href={href}>{children}</Link>;
}

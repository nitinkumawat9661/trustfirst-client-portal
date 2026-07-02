import { Badge } from "@trustfirst/ui";
import { PaymentsFoundationPanel } from "@/components/billing/billing-panels";

export default function AdminBillingPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Payments</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Payment foundation</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manual payment entry is implemented. Gateway providers are contract-only until live integrations are approved.
        </p>
      </div>
      <PaymentsFoundationPanel />
    </div>
  );
}

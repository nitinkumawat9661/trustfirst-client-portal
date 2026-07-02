import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { HardwareOperationalDashboardCards, HardwarePluginSummary } from "@/components/hardware/hardware-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareInventoryPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const dashboard = await service.operationalDashboard({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  return (
    <div className="space-y-6">
      <div>
        <Badge>Inventory</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Inventory dashboard</h1>
      </div>
      <HardwareOperationalDashboardCards dashboard={dashboard} />
      <HardwarePluginSummary />
    </div>
  );
}

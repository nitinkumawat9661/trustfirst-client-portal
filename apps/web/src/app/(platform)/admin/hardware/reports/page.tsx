import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { HardwareReportsPanel } from "@/components/hardware/hardware-trade-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareReportsPage() {
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const reports = await service.reports({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  return (
    <div className="space-y-6">
      <div>
        <Badge>Reports</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Hardware reports</h1>
      </div>
      <HardwareReportsPanel reports={reports} />
    </div>
  );
}

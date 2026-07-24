import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
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
      <HardwarePageHeader description="Reports are calculated only from saved tenant records; empty periods remain zero." eyebrow="Analysis" title="Reports" />
      <HardwareReportsPanel reports={reports} />
    </div>
  );
}

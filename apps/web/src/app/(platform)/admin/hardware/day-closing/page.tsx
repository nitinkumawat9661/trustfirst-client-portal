import { getPrisma } from "@trustfirst/database";
import { HardwareDayClosingWorkbench } from "@/components/hardware/hardware-day-closing-workbench";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareDayClosingService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareDayClosingPage() {
  const user = await requireCurrentUser();
  const service = new HardwareDayClosingService(getPrisma());
  const summary = await service.summary({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Close the India business day from server-calculated payments, purchases, returns, refunds, and cash totals. Printing or reprinting this report does not create transactions."
        eyebrow="Day closing"
        title="Daily cash and operations close"
      />
      <HardwareDayClosingWorkbench initialSummary={summary} />
    </div>
  );
}

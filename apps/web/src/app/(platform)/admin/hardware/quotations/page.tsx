import { getPrisma } from "@trustfirst/database";
import { Plus } from "lucide-react";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeList } from "@/components/hardware/hardware-trade-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareQuotationsPage() {
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const trade = new HardwareTradeService(prisma);
  const hardware = new HardwareService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [documents, locations] = await Promise.all([
    trade.listQuotations(context),
    hardware.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        actionHref="/admin/hardware/quotations/new"
        actionIcon={Plus}
        actionLabel="New Estimate Bill"
        description="Create and save Estimate Bills with optional line-wise GST. Confirmed quantities deduct stock, taxed lines feed the sales GST report, and every document can be printed or reprinted."
        eyebrow="Sales"
        title="Estimate Bills"
      />
      <HardwareTradeList documents={documents} emptyMessage="No Estimate Bills have been created." locations={locations} title="Estimate Bill history" />
    </div>
  );
}

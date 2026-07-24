import { getPrisma } from "@trustfirst/database";
import { Plus } from "lucide-react";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeList } from "@/components/hardware/hardware-trade-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService, type HardwareTradeSummary } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareSalesPage() {
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const service = new HardwareTradeService(prisma);
  const hardware = new HardwareService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [documents, locations]: [HardwareTradeSummary[], Awaited<ReturnType<HardwareService["listLocations"]>>] = await Promise.all([
    service.listSales(context),
    hardware.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader actionHref="/admin/hardware/sales/new" actionIcon={Plus} actionLabel="New bill" description="Fast billing, stock confirmation, payment mode, invoice draft, and print." eyebrow="Sales" title="Sales and billing" />
      <HardwareTradeList documents={documents} emptyMessage="No sales have been recorded." locations={locations} title="Sales documents" />
    </div>
  );
}

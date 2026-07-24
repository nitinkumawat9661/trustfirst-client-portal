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
      <HardwarePageHeader actionHref="/admin/hardware/quotations/new" actionIcon={Plus} actionLabel="New quotation" description="Create a draft, finalize it, then convert the approved quotation to a sale." eyebrow="Sales" title="Quotations" />
      <HardwareTradeList documents={documents} emptyMessage="No quotations have been created." locations={locations} title="Quotation history" />
    </div>
  );
}

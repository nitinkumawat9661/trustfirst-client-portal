import { getPrisma } from "@trustfirst/database";
import { Plus } from "lucide-react";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeList } from "@/components/hardware/hardware-trade-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService, type HardwareTradeSummary } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwarePurchasesPage() {
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const service = new HardwareTradeService(prisma);
  const hardware = new HardwareService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [documents, locations]: [HardwareTradeSummary[], Awaited<ReturnType<HardwareService["listLocations"]>>] = await Promise.all([
    service.listPurchases(context),
    hardware.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader actionHref="/admin/hardware/purchases/new" actionIcon={Plus} actionLabel="New purchase" description="Purchase orders, supplier bills, stock inward, tax, discounts, and supplier balances." eyebrow="Purchasing" title="Purchases" />
      <HardwareTradeList documents={documents} emptyMessage="No verified purchase documents have been entered." locations={locations} title="Purchase documents" />
    </div>
  );
}

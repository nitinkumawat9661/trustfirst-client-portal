import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareReturnsWorkbench } from "@/components/hardware/hardware-returns-workbench";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareReturnsPage() {
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const hardware = new HardwareService(prisma);
  const trade = new HardwareTradeService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [locations, sales, purchases] = await Promise.all([
    hardware.listLocations(context),
    trade.listSales(context),
    trade.listPurchases(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Record partial or full sale and purchase returns from original documents. Original documents stay immutable; return documents carry stock, financial, timeline, and audit effects."
        eyebrow="Returns"
        title="Sale and purchase returns"
      />
      <HardwareReturnsWorkbench locations={locations} purchases={purchases.filter((document) => document.status === "CONFIRMED" && (document.type === "PURCHASE_ENTRY" || document.type === "SUPPLIER_BILL"))} sales={sales.filter((document) => document.status === "CONFIRMED" && document.type === "SALES_ORDER")} />
    </div>
  );
}

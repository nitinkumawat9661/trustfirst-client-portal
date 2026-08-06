import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeForm } from "@/components/hardware/hardware-trade-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function NewHardwarePurchasePage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [parties, products, locations] = await Promise.all([
    service.listParties(context, "supplier"),
    service.listProducts(context),
    service.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Enter only a verified supplier document. Purchase Entry and Supplier Bill post stock and supplier accounting after payment confirmation." eyebrow="Purchasing" title="New purchase" />
      <HardwareTradeForm locations={locations} mode="purchase" parties={parties} products={products} />
    </div>
  );
}

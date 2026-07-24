import { getPrisma } from "@trustfirst/database";
import { HardwareInventoryPanel } from "@/components/hardware/hardware-inventory-panel";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { InventoryCards } from "@/components/hardware/hardware-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareInventoryPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [dashboard, locations, movements, products] = await Promise.all([
    service.dashboard(context),
    service.listLocations(context),
    service.listMovements(context),
    service.listProducts(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Tenant-scoped stock inward, outward, adjustments, and immutable movement history." eyebrow="Inventory" title="Stock and inventory" />
      <InventoryCards dashboard={dashboard} />
      <HardwareInventoryPanel locations={locations} movements={movements} products={products} />
    </div>
  );
}

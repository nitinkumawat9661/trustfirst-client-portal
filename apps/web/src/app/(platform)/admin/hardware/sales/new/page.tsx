import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeForm } from "@/components/hardware/hardware-trade-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function NewHardwareSalePage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [parties, products] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Scan a barcode or select a product. Saving creates a draft; confirmation validates stock before deduction." eyebrow="Sales" title="New bill" />
      <HardwareTradeForm mode="sale" parties={parties} products={products} />
    </div>
  );
}

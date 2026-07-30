import { getPrisma } from "@trustfirst/database";
import { EstimateBillForm } from "@/components/hardware/estimate-bill-form";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function NewHardwareQuotationPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [parties, products, locations] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
    service.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Fast counter-style Estimate Bill: line-wise GST defaults to 0%, stock and customer balance post as a final sale, and Enter moves through products without the mouse."
        eyebrow="Sales"
        title="New Estimate Bill"
      />
      <EstimateBillForm locations={locations} parties={parties} products={products} />
    </div>
  );
}

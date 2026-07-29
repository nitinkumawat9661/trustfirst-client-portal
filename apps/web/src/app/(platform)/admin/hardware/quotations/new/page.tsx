import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareTradeForm } from "@/components/hardware/hardware-trade-form";
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
        description="Create a saved Estimate Bill with editable line-wise GST, automatic GST reporting for taxed lines, immediate stock deduction, and direct A4 printing."
        eyebrow="Sales"
        title="New Estimate Bill"
      />
      <HardwareTradeForm locations={locations} mode="quotation" parties={parties} products={products} />
    </div>
  );
}

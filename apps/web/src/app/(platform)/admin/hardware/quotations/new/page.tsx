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
  const [parties, products] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Pricing and taxes remain editable while the quotation is a draft. Finalization does not move stock." eyebrow="Sales" title="New quotation" />
      <HardwareTradeForm mode="quotation" parties={parties} products={products} />
    </div>
  );
}

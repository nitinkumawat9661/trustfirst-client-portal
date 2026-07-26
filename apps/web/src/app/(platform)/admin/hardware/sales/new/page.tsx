import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { QuickPosForm } from "@/components/hardware/quick-pos-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function NewHardwareSalePage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [parties, products, locations, settings] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
    service.listLocations(context),
    service.getSettings(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Type product name, add missing items without leaving the bill, preview totals, then confirm and print." eyebrow="Sales" title="Quick POS bill" />
      <QuickPosForm
        customers={parties}
        defaultFirmName={settings?.firmName ?? "Mangalam Sanitary"}
        locations={locations}
        products={products}
      />
    </div>
  );
}

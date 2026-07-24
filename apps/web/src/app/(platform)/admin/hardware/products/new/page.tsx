import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareProductForm } from "@/components/hardware/hardware-product-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function NewHardwareProductPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [brands, categories, units] = await Promise.all([
    service.listBrands(context),
    service.listCategories(context),
    service.listUnits(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Leave unknown HSN, GST, pricing, brand, category, or unit fields blank until the client confirms them." eyebrow="Catalog" title="Add product" />
      <HardwareProductForm brands={brands} categories={categories} units={units} />
    </div>
  );
}

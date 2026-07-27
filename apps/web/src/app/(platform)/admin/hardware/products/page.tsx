import { getPrisma } from "@trustfirst/database";
import { Card, CardContent } from "@trustfirst/ui";
import { Upload } from "lucide-react";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareProductTable } from "@/components/hardware/hardware-product-table";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, type HardwareProductSummary } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareProductsPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const products: HardwareProductSummary[] = await service.listProducts({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  return (
    <div className="space-y-6">
      <HardwarePageHeader actionHref="/admin/hardware/products/import" actionIcon={Upload} actionLabel="Import products" description="Verified product master with pricing, tax, HSN, and stock status." eyebrow="Catalog" title="Products" />
      <Card><CardContent className="pt-5"><HardwareProductTable products={products} /></CardContent></Card>
    </div>
  );
}

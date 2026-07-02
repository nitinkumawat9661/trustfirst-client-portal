import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { ProductList } from "@/components/hardware/hardware-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareProductsPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const products = await service.listProducts({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  return (
    <div className="space-y-6">
      <div>
        <Badge>Hardware catalog</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Products and SKUs</h1>
      </div>
      <ProductList products={products} />
    </div>
  );
}

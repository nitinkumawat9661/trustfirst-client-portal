import { getPrisma } from "@trustfirst/database";
import { Button, Card, CardContent } from "@trustfirst/ui";
import { Plus, ScanSearch, Upload } from "lucide-react";
import Link from "next/link";
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
      <HardwarePageHeader
        actionHref="/admin/hardware/products/new"
        actionIcon={Plus}
        actionLabel="Add single product"
        description="Add products one by one, import them in bulk, edit products, and audit same-name variants without deleting catalogue history."
        eyebrow="Catalog"
        secondaryActionHref="/admin/hardware/products/import"
        secondaryActionIcon={Upload}
        secondaryActionLabel="Bulk import"
        title="Products"
      />
      <div className="flex justify-end">
        <Button asChild variant="outline"><Link href="/admin/hardware/products/audit"><ScanSearch className="size-4" />Catalogue audit</Link></Button>
      </div>
      <Card><CardContent className="pt-5"><HardwareProductTable products={products} /></CardContent></Card>
    </div>
  );
}

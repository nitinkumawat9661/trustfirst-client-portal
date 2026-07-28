import { getPrisma } from "@trustfirst/database";
import { Button, Card, CardContent } from "@trustfirst/ui";
import { ListChecks, Plus, Upload } from "lucide-react";
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
        description="Add products one by one, import them in bulk, edit any product, and audit same-name variants without changing price or stock."
        eyebrow="Catalog"
        secondaryActionHref="/admin/hardware/products/import"
        secondaryActionIcon={Upload}
        secondaryActionLabel="Bulk import"
        title="Products"
      />
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Same product name or different rate?</p>
            <p className="mt-1 text-sm text-muted-foreground">Open the catalog audit to review variants, missing barcode/HSN fields, and safe display-name suggestions.</p>
          </div>
          <Button asChild variant="outline"><Link href="/admin/hardware/products/audit"><ListChecks className="size-4" />Catalog audit</Link></Button>
        </CardContent>
      </Card>
      <Card><CardContent className="pt-5"><HardwareProductTable products={products} /></CardContent></Card>
    </div>
  );
}

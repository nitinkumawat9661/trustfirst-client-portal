import { getPrisma } from "@trustfirst/database";
import { CatalogAuditPanel } from "@/components/hardware/catalog-audit-panel";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, buildCatalogAudit } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareCatalogAuditPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const products = await service.listProducts({
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });
  const audit = buildCatalogAudit(products);

  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Inspect same-name products, different-rate variants, missing identifiers, and preview safe display-name improvements without deleting or merging catalog records."
        eyebrow="Catalog quality"
        title="Product catalog audit"
      />
      <CatalogAuditPanel audit={audit} />
    </div>
  );
}

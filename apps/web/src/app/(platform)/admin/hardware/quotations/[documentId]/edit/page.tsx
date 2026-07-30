import { getPrisma } from "@trustfirst/database";
import { EstimateBillForm } from "@/components/hardware/estimate-bill-form";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function EditEstimateBillPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const service = new HardwareService(prisma);
  const tradeService = new HardwareTradeService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [initialDocument, parties, products, locations] = await Promise.all([
    tradeService.estimateForEdit(context, documentId),
    service.listParties(context, "customer"),
    service.listProducts(context),
    service.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Update products, quantities, rates, line-wise GST, payment, customer, or stock location. Previous stock and customer-balance impact is reversed and reposted atomically."
        eyebrow="Sales"
        title={`Edit ${initialDocument.documentNumber}`}
      />
      <EstimateBillForm
        initialDocument={initialDocument}
        locations={locations}
        parties={parties}
        products={products}
      />
    </div>
  );
}

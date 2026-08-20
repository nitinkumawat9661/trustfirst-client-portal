import { getPrisma } from "@trustfirst/database";
import { HardwareBillEditForm } from "@/components/hardware/hardware-bill-edit-form";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareBillEditService, HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function EditHardwareBillPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const billService = new HardwareBillEditService(prisma);
  const hardwareService = new HardwareService(prisma);
  const bill = await billService.billForEdit(context, documentId);
  const purchase = bill.type === "PURCHASE_ENTRY" || bill.type === "SUPPLIER_BILL";
  const [parties, products, locations] = await Promise.all([
    hardwareService.listParties(context, purchase ? "supplier" : "customer"),
    hardwareService.listProducts(context),
    hardwareService.listLocations(context),
  ]);
  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="The document number stays locked. Saving atomically reverses the active stock, accounting, and payment postings, then records corrected postings and a full immutable audit snapshot."
        eyebrow="Audited correction"
        title={`Edit ${bill.documentNumber}`}
      />
      <HardwareBillEditForm bill={bill} locations={locations} parties={parties} products={products} />
    </div>
  );
}

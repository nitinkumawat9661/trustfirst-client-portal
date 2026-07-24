import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwarePartyPanel } from "@/components/hardware/hardware-party-panel";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareSuppliersPage() {
  const user = await requireCurrentUser();
  const parties = await new HardwareService(getPrisma()).listParties(
    { tenantId: user.activeTenantId ?? "public", userId: user.id },
    "supplier",
  );
  return <div className="space-y-6"><HardwarePageHeader description="Supplier identity, GSTIN, contact, and balances from saved purchase records." eyebrow="Purchasing" title="Suppliers" /><HardwarePartyPanel parties={parties} role="supplier" /></div>;
}

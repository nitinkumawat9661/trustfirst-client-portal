import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwarePartyPanel } from "@/components/hardware/hardware-party-panel";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareCustomersPage() {
  const user = await requireCurrentUser();
  const parties = await new HardwareService(getPrisma()).listParties(
    { tenantId: user.activeTenantId ?? "public", userId: user.id },
    "customer",
  );
  return <div className="space-y-6"><HardwarePageHeader description="Customer identity, contact, GSTIN, credit, and balances from saved billing records." eyebrow="Sales" title="Customers" /><HardwarePartyPanel parties={parties} role="customer" /></div>;
}

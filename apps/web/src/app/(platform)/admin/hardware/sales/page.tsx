import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { HardwareTradeList } from "@/components/hardware/hardware-trade-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareTradeService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function HardwareSalesPage() {
  const user = await requireCurrentUser();
  const service = new HardwareTradeService(getPrisma());
  const documents = await service.listSales({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  return (
    <div className="space-y-6">
      <div>
        <Badge>Hardware sales</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Sales orders and quotations</h1>
      </div>
      <HardwareTradeList documents={documents} />
    </div>
  );
}

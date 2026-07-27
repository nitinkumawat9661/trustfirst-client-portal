import { getPrisma } from "@trustfirst/database";
import { Badge } from "@trustfirst/ui";
import { headers } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { InventoryCards, ProductList } from "@/components/hardware/hardware-panels";
import { requireCurrentUser } from "@/server/auth/session";
import { readEffectiveHost, resolveAppSurfaceFromHost } from "@/server/domain/host-routing";
import { HardwareService } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function ClientHardwareOverviewPage() {
  const requestHeaders = await headers();
  const surface = resolveAppSurfaceFromHost(readEffectiveHost(requestHeaders));
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [dashboard, products] = await Promise.all([service.dashboard(context), service.listProducts(context)]);
  return (
    <AppShell brandName={surface === "MANGALAM_ERP" ? "MANGALAM SANITARY" : undefined} mode="client">
      <div className="mb-6">
        <Badge>Readonly</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Hardware overview</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Readonly hardware and sanitary catalog visibility when permitted.</p>
      </div>
      <div className="space-y-6">
        <InventoryCards dashboard={dashboard} />
        <ProductList products={products} />
      </div>
    </AppShell>
  );
}

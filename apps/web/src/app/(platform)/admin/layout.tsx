import { getPrisma } from "@trustfirst/database";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { OfflineScopeRegistration } from "@/components/offline/offline-scope-registration";
import { requireCurrentUser } from "@/server/auth/session";
import { readEffectiveHost, resolveAppSurfaceFromHost } from "@/server/domain/host-routing";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const surface = resolveAppSurfaceFromHost(readEffectiveHost(requestHeaders));
  const user = await requireCurrentUser();
  const tenant = user.activeTenantId
    ? await getPrisma().tenant.findUnique({ select: { name: true }, where: { id: user.activeTenantId } })
    : null;
  const offlineScope = {
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  };

  return (
    <>
      <OfflineScopeRegistration scope={offlineScope} />
      <AdminDashboardShell
        brandName={tenant?.name ?? "Business workspace"}
        offlineScope={offlineScope}
        permissions={user.permissions}
        signOutCallbackUrl={surface === "MANGALAM_ERP" ? "/signin" : "/sign-in"}
        userName={user.name ?? user.email ?? "Account"}
      >
        {children}
      </AdminDashboardShell>
    </>
  );
}

import type { ReactNode } from "react";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { requireCurrentUser } from "@/server/auth/session";
import { isHttpStagingAuthBypassActive } from "@/server/auth/staging-auth-bypass";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, stagingAuthBypass] = await Promise.all([
    requireCurrentUser(),
    isHttpStagingAuthBypassActive(),
  ]);

  return (
    <AdminDashboardShell
      offlineScope={{
        tenantId: user.activeTenantId ?? "public",
        userId: user.id,
      }}
      stagingAuthBypass={stagingAuthBypass}
    >
      {children}
    </AdminDashboardShell>
  );
}

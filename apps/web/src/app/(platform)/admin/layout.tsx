import type { ReactNode } from "react";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { requireCurrentUser } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <AdminDashboardShell
      offlineScope={{
        tenantId: user.activeTenantId ?? "public",
        userId: user.id,
      }}
    >
      {children}
    </AdminDashboardShell>
  );
}

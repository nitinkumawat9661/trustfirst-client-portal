import { getPrisma } from "@trustfirst/database";
import type { ReactNode } from "react";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { requireCurrentUser } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const tenant = user.activeTenantId
    ? await getPrisma().tenant.findUnique({ select: { name: true }, where: { id: user.activeTenantId } })
    : null;

  return (
    <AdminDashboardShell
      brandName={tenant?.name ?? "Business workspace"}
      offlineScope={{
        tenantId: user.activeTenantId ?? "public",
        userId: user.id,
      }}
      permissions={user.permissions}
      userName={user.name ?? user.email ?? "Account"}
    >
      {children}
    </AdminDashboardShell>
  );
}

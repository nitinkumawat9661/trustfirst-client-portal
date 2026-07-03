import { getPrisma } from "@trustfirst/database";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import type { Permission } from "../authorization/authorization";
import { isHttpStagingAuthBypassEnabled } from "./staging-auth-bypass-gate";

const MANGLAM_TENANT_SLUG = "manglam-trading-demo";
const DEMO_ADMIN_EMAIL = "manglam-demo-admin@trustfirst.example.com";

export async function isHttpStagingAuthBypassActive() {
  const requestHeaders = await headers();
  return isHttpStagingAuthBypassEnabled({ host: requestHeaders.get("host") });
}

export async function getHttpStagingBypassUser(): Promise<Session["user"] | null> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    include: {
      tenantMemberships: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          tenant: true,
        },
        where: {
          status: "ACTIVE",
          tenant: {
            slug: MANGLAM_TENANT_SLUG,
            status: {
              in: ["ACTIVE", "TRIAL"],
            },
          },
        },
      },
    },
    where: { normalizedEmail: DEMO_ADMIN_EMAIL },
  });

  const membership = user?.tenantMemberships[0];
  if (!user || !membership) return null;

  return {
    activeTenantId: membership.tenantId,
    email: user.email,
    id: user.id,
    name: user.name ?? "Manglam Demo Admin",
    permissions: [
      ...new Set(
        membership.role.permissions.map((entry) => entry.permission.key as Permission),
      ),
    ],
    role: "ADMIN",
    status: user.status,
  };
}

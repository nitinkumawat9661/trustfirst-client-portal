import type { NextRequest } from "next/server";
import {
  readEffectiveHost,
  tenantSlugForHost,
} from "@/server/domain/host-routing";

export type TenantContext = {
  id: string;
  source: "header" | "host" | "anonymous";
};

export function resolveTenant(request: NextRequest): TenantContext {
  const host = readEffectiveHost(request.headers);

  /*
   * Known production hosts take precedence over any caller-supplied
   * tenant header so a public/client request cannot switch the
   * Mangalam tenant context by spoofing x-tenant-id.
   */
  const mappedTenant = tenantSlugForHost(host);

  if (mappedTenant) {
    return {
      id: mappedTenant,
      source: "host",
    };
  }

  const headerTenant = request.headers.get("x-tenant-id")?.trim();

  if (headerTenant) {
    return {
      id: headerTenant,
      source: "header",
    };
  }

  /*
   * Legacy/generic subdomain fallback.
   *
   * Root domains such as trustfirstsolutions.in must not accidentally
   * become tenant IDs. Only hosts with at least three DNS labels are
   * considered subdomain-based tenants.
   */
  const labels = host.split(".").filter(Boolean);
  const subdomain = labels.length >= 3 ? labels[0] : "";

  if (
    subdomain &&
    !["localhost", "www", "app", "client"].includes(subdomain)
  ) {
    return {
      id: subdomain,
      source: "host",
    };
  }

  return {
    id: "public",
    source: "anonymous",
  };
}

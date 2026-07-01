import type { NextRequest } from "next/server";

export type TenantContext = {
  id: string;
  source: "header" | "host" | "anonymous";
};

export function resolveTenant(request: NextRequest): TenantContext {
  const headerTenant = request.headers.get("x-tenant-id")?.trim();

  if (headerTenant) {
    return {
      id: headerTenant,
      source: "header",
    };
  }

  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0];

  if (subdomain && !["localhost", "127", "www"].includes(subdomain)) {
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

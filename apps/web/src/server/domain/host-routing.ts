export const MANGALAM_TENANT_SLUG = "manglam-trading-demo" as const;

export type AppSurface =
  | "MANGALAM_PUBLIC"
  | "MANGALAM_ERP"
  | "TRUSTFIRST_PORTAL"
  | "UNKNOWN";

const surfaceByHost: Readonly<Record<string, AppSurface>> = {
  "mangalamsanitary.in": "MANGALAM_PUBLIC",
  "www.mangalamsanitary.in": "MANGALAM_PUBLIC",
  "app.mangalamsanitary.in": "MANGALAM_ERP",
  "client.trustfirstsolutions.in": "TRUSTFIRST_PORTAL",
};

const tenantByHost: Readonly<Record<string, string>> = {
  "mangalamsanitary.in": MANGALAM_TENANT_SLUG,
  "www.mangalamsanitary.in": MANGALAM_TENANT_SLUG,
  "app.mangalamsanitary.in": MANGALAM_TENANT_SLUG,
};

export function normalizeRequestHost(value: string | null | undefined) {
  if (!value) return "";

  const firstHost = value.split(",")[0]?.trim().toLowerCase() ?? "";

  if (firstHost.startsWith("[")) {
    const closingBracket = firstHost.indexOf("]");
    return closingBracket > 0
      ? firstHost.slice(1, closingBracket)
      : firstHost;
  }

  return firstHost.split(":")[0] ?? "";
}

export function resolveAppSurfaceFromHost(
  value: string | null | undefined,
): AppSurface {
  const host = normalizeRequestHost(value);
  return surfaceByHost[host] ?? "UNKNOWN";
}

export function tenantSlugForHost(
  value: string | null | undefined,
): string | null {
  const host = normalizeRequestHost(value);
  return tenantByHost[host] ?? null;
}

export function readEffectiveHost(headers: Pick<Headers, "get">) {
  return normalizeRequestHost(
    headers.get("host") ?? headers.get("x-forwarded-host"),
  );
}

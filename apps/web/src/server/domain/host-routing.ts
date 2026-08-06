export const MANGALAM_TENANT_SLUG = "manglam-trading-demo" as const;

export const CANONICAL_ORIGINS = {
  mangalamPublic: "https://mangalamsanitary.in",
  mangalamErp: "https://app.mangalamsanitary.in",
  trustFirstPortal: "https://client.trustfirstsolutions.in",
} as const;

export const CONFIGURED_HOSTS = {
  mangalamPublic: [
    "mangalamsanitary.in",
    "www.mangalamsanitary.in",
  ],
  mangalamErp: [
    "app.mangalamsanitary.in",
  ],
  trustFirstPortal: [
    "client.trustfirstsolutions.in",
  ],
} as const;

export type AppSurface =
  | "MANGALAM_PUBLIC"
  | "MANGALAM_ERP"
  | "TRUSTFIRST_PORTAL"
  | "UNKNOWN";

type HostRoutingEnv = {
  NODE_ENV?: string;
  TRUSTFIRST_ALLOW_LOOPBACK_STAGING?: string;
  TRUSTFIRST_DEMO_MODE?: string;
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

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

export function isExplicitStagingLoopbackHost(
  value: string | null | undefined,
  env: HostRoutingEnv = process.env,
) {
  const host = normalizeRequestHost(value);

  return (
    env.NODE_ENV === "production" &&
    env.TRUSTFIRST_DEMO_MODE === "staging" &&
    env.TRUSTFIRST_ALLOW_LOOPBACK_STAGING === "true" &&
    LOOPBACK_HOSTS.has(host)
  );
}

export function resolveAppSurfaceFromHost(
  value: string | null | undefined,
  env: HostRoutingEnv = process.env,
): AppSurface {
  const host = normalizeRequestHost(value);

  if (isExplicitStagingLoopbackHost(host, env)) {
    return "MANGALAM_ERP";
  }

  return surfaceByHost[host] ?? "UNKNOWN";
}

export function tenantSlugForHost(
  value: string | null | undefined,
  env: HostRoutingEnv = process.env,
): string | null {
  const host = normalizeRequestHost(value);

  if (isExplicitStagingLoopbackHost(host, env)) {
    return MANGALAM_TENANT_SLUG;
  }

  return tenantByHost[host] ?? null;
}

export function readEffectiveHost(headers: Pick<Headers, "get">) {
  return normalizeRequestHost(
    headers.get("host") ?? headers.get("x-forwarded-host"),
  );
}

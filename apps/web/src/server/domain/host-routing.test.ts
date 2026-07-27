import { describe, expect, it } from "vitest";
import {
  CANONICAL_ORIGINS,
  CONFIGURED_HOSTS,
  normalizeRequestHost,
  resolveAppSurfaceFromHost,
  tenantSlugForHost,
} from "./host-routing";

describe("host routing", () => {
  it("maps only canonical Mangalam hosts to public and ERP surfaces", () => {
    expect(CONFIGURED_HOSTS.mangalamPublic).toEqual([
      "mangalamsanitary.in",
      "www.mangalamsanitary.in",
    ]);
    expect(CONFIGURED_HOSTS.mangalamErp).toEqual([
      "app.mangalamsanitary.in",
    ]);
    expect(CANONICAL_ORIGINS.mangalamPublic).toBe("https://mangalamsanitary.in");
    expect(CANONICAL_ORIGINS.mangalamErp).toBe("https://app.mangalamsanitary.in");
    expect(resolveAppSurfaceFromHost("mangalamsanitary.in")).toBe("MANGALAM_PUBLIC");
    expect(resolveAppSurfaceFromHost("app.mangalamsanitary.in")).toBe("MANGALAM_ERP");
    expect(resolveAppSurfaceFromHost("client.trustfirstsolutions.in")).toBe("TRUSTFIRST_PORTAL");
  });

  it("normalizes forwarded hosts and keeps tenant lookup scoped", () => {
    expect(normalizeRequestHost("App.Mangalamsanitary.In:443")).toBe("app.mangalamsanitary.in");
    expect(normalizeRequestHost("app.mangalamsanitary.in, injected.example")).toBe("app.mangalamsanitary.in");
    expect(tenantSlugForHost("app.mangalamsanitary.in")).toBe("manglam-trading-demo");
    expect(tenantSlugForHost("client.trustfirstsolutions.in")).toBeNull();
    expect(resolveAppSurfaceFromHost("evil.example")).toBe("UNKNOWN");
    expect(resolveAppSurfaceFromHost("unsupported-domain.example")).toBe("UNKNOWN");
  });
});

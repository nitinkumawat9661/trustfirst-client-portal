import { describe, expect, it } from "vitest";
import {
  CANONICAL_ORIGINS,
  CONFIGURED_HOSTS,
  normalizeRequestHost,
  resolveAppSurfaceFromHost,
  tenantSlugForHost,
} from "./host-routing";

describe("host routing", () => {
  it("maps canonical and alias Mangalam hosts to public and ERP surfaces", () => {
    expect(CONFIGURED_HOSTS.mangalamPublic).toEqual([
      "mangalamsanitary.in",
      "www.mangalamsanitary.in",
      "manglam.in",
      "www.manglam.in",
    ]);
    expect(CONFIGURED_HOSTS.mangalamErp).toEqual([
      "app.mangalamsanitary.in",
      "app.manglam.in",
    ]);
    expect(CANONICAL_ORIGINS.mangalamPublic).toBe("https://mangalamsanitary.in");
    expect(CANONICAL_ORIGINS.mangalamErp).toBe("https://app.mangalamsanitary.in");
    expect(resolveAppSurfaceFromHost("manglam.in")).toBe("MANGALAM_PUBLIC");
    expect(resolveAppSurfaceFromHost("app.manglam.in")).toBe("MANGALAM_ERP");
    expect(resolveAppSurfaceFromHost("client.trustfirstsolutions.in")).toBe("TRUSTFIRST_PORTAL");
  });

  it("normalizes forwarded hosts and keeps tenant lookup scoped", () => {
    expect(normalizeRequestHost("App.Manglam.In:443")).toBe("app.manglam.in");
    expect(normalizeRequestHost("app.manglam.in, injected.example")).toBe("app.manglam.in");
    expect(tenantSlugForHost("app.manglam.in")).toBe("manglam-trading-demo");
    expect(tenantSlugForHost("client.trustfirstsolutions.in")).toBeNull();
    expect(resolveAppSurfaceFromHost("evil.example")).toBe("UNKNOWN");
  });
});

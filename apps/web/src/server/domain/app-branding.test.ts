import { describe, expect, it } from "vitest";
import {
  manifestForSurface,
  metadataForSurface,
  serviceWorkerCachePrefix,
} from "./app-branding";

const blockedMangalamStrings = [
  "TrustFirst Client Portal",
  "Client Portal",
  "client.trustfirstsolutions.in",
];

describe("host-specific app branding", () => {
  it("returns Mangalam ERP metadata without TrustFirst portal branding", () => {
    const metadata = metadataForSurface("MANGALAM_ERP");
    const text = JSON.stringify(metadata);

    expect(metadata.applicationName).toBe("MANGALAM SANITARY ERP");
    expect(text).toContain("MANGALAM SANITARY ERP");
    for (const blocked of blockedMangalamStrings) {
      expect(text).not.toContain(blocked);
    }
  });

  it("returns Mangalam PWA identity with canonical ERP start URL", () => {
    const manifest = manifestForSurface("MANGALAM_ERP");
    const text = JSON.stringify(manifest);

    expect(manifest.name).toBe("MANGALAM SANITARY ERP");
    expect(manifest.short_name).toBe("Mangalam ERP");
    expect(manifest.id).toBe("https://app.mangalamsanitary.in/mangalam-erp");
    expect(manifest.start_url).toBe("https://app.mangalamsanitary.in/admin");
    expect(manifest.scope).toBe("https://app.mangalamsanitary.in/");
    for (const blocked of blockedMangalamStrings) {
      expect(text).not.toContain(blocked);
    }
  });

  it("keeps TrustFirst portal manifest separate", () => {
    const manifest = manifestForSurface("TRUSTFIRST_PORTAL");

    expect(manifest.name).toBe("TrustFirst Client Portal");
    expect(manifest.start_url).toBe("https://client.trustfirstsolutions.in/client");
    expect(manifest.scope).toBe("https://client.trustfirstsolutions.in/");
  });

  it("uses host-safe service worker cache prefixes", () => {
    expect(serviceWorkerCachePrefix("MANGALAM_ERP")).toBe("mangalam-sanitary-erp");
    expect(serviceWorkerCachePrefix("MANGALAM_PUBLIC")).toBe("mangalam-sanitary-erp");
    expect(serviceWorkerCachePrefix("TRUSTFIRST_PORTAL")).toBe("trustfirst-client-portal");
  });
});

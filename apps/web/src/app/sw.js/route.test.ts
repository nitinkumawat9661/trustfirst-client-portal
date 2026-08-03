import { describe, expect, it } from "vitest";
import { renderServiceWorker } from "./route";

describe("Mangalam offline service worker", () => {
  it("renders valid JavaScript with offline navigation and warm-up support", () => {
    const source = renderServiceWorker("mangalam-sanitary-erp-test");

    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain('const OFFLINE_URL = "/offline"');
    expect(source).toContain('data.type === "WARM_ROUTES"');
    expect(source).toContain("networkFirstPage(request)");
    expect(source).toContain('pathname.startsWith("/api/")');
  });

  it("keeps private API calls outside Cache Storage", () => {
    const source = renderServiceWorker("mangalam-sanitary-erp-test");

    expect(source).toContain("if (shouldBypass(url.pathname)) return;");
    expect(source).not.toContain('cache.put("/api/');
  });
});

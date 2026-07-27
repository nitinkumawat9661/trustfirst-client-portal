import { describe, expect, it } from "vitest";
import { CANONICAL_ORIGINS } from "../domain/host-routing";
import { isApprovedAuthOrigin, safeAuthRedirect } from "./redirect-policy";

describe("auth redirect policy", () => {
  it("allows only canonical production auth origins", () => {
    expect(isApprovedAuthOrigin(CANONICAL_ORIGINS.mangalamErp)).toBe(true);
    expect(isApprovedAuthOrigin(CANONICAL_ORIGINS.mangalamPublic)).toBe(true);
    expect(isApprovedAuthOrigin(CANONICAL_ORIGINS.trustFirstPortal)).toBe(true);
    expect(isApprovedAuthOrigin("https://evil.example")).toBe(false);
  });

  it("keeps relative Mangalam callbacks on the Mangalam ERP origin", () => {
    expect(safeAuthRedirect("/admin", CANONICAL_ORIGINS.mangalamErp)).toBe("https://app.mangalamsanitary.in/admin");
    expect(safeAuthRedirect("/api/auth/session", CANONICAL_ORIGINS.mangalamErp)).toBe("https://app.mangalamsanitary.in/api/auth/session");
  });

  it("keeps relative TrustFirst callbacks on the TrustFirst portal origin", () => {
    expect(safeAuthRedirect("/client", CANONICAL_ORIGINS.trustFirstPortal)).toBe("https://client.trustfirstsolutions.in/client");
  });

  it("rejects open redirects and host-header injection fallbacks", () => {
    expect(safeAuthRedirect("//evil.example/admin", CANONICAL_ORIGINS.mangalamErp)).toBe(CANONICAL_ORIGINS.mangalamErp);
    expect(safeAuthRedirect("https://evil.example/admin", CANONICAL_ORIGINS.mangalamErp)).toBe(CANONICAL_ORIGINS.mangalamErp);
    expect(safeAuthRedirect("/admin", "https://evil.example")).toBe("https://client.trustfirstsolutions.in/admin");
  });
});

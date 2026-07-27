import { describe, expect, it } from "vitest";
import { defaultSignInDestination, safeSignInCallback, signInBrandForSurface } from "./sign-in-surface";

describe("sign-in surface decisions", () => {
  it("keeps Mangalam ERP on admin and TrustFirst portal on client", () => {
    expect(defaultSignInDestination("MANGALAM_ERP")).toBe("/admin");
    expect(defaultSignInDestination("TRUSTFIRST_PORTAL")).toBe("/client");
    expect(defaultSignInDestination("UNKNOWN")).toBe("/admin");
  });

  it("selects host-specific sign-in branding", () => {
    expect(signInBrandForSurface("MANGALAM_ERP")).toBe("MANGALAM");
    expect(signInBrandForSurface("MANGALAM_PUBLIC")).toBe("MANGALAM");
    expect(signInBrandForSurface("TRUSTFIRST_PORTAL")).toBe("TRUSTFIRST");
    expect(signInBrandForSurface("UNKNOWN")).toBe("TRUSTFIRST");
  });

  it("preserves relative callback safety", () => {
    expect(safeSignInCallback("/admin/hardware", "/admin")).toBe("/admin/hardware");
    expect(safeSignInCallback("//evil.example", "/admin")).toBe("/admin");
    expect(safeSignInCallback("https://evil.example", "/admin")).toBe("/admin");
  });
});

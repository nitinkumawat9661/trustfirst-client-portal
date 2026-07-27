import { describe, expect, it } from "vitest";
import {
  authSessionCookieName,
  shouldUseSecureAuthCookies,
} from "./cookie-policy";

describe("Auth cookie policy", () => {
  it("keeps secure cookies as the production default", () => {
    const env = { NODE_ENV: "production" };

    expect(shouldUseSecureAuthCookies(env)).toBe(true);
    expect(authSessionCookieName(env)).toBe("__Secure-authjs.session-token");
  });

  it("uses host-only cookie identity without a shared domain suffix", () => {
    const cookieName = authSessionCookieName({ NODE_ENV: "production" });

    expect(cookieName).toBe("__Secure-authjs.session-token");
    expect(cookieName).not.toContain("trustfirstsolutions");
    expect(cookieName).not.toContain("mangalamsanitary");
  });

  it("uses non-secure cookies only outside production", () => {
    const env = { NODE_ENV: "development" };
    expect(shouldUseSecureAuthCookies(env)).toBe(false);
    expect(authSessionCookieName(env)).toBe("authjs.session-token");
  });
});

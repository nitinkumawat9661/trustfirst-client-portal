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

  it("uses non-secure cookies outside production", () => {
    const env = { NODE_ENV: "development" };
    expect(shouldUseSecureAuthCookies(env)).toBe(false);
    expect(authSessionCookieName(env)).toBe("authjs.session-token");
  });

  it("uses a non-secure cookie only for explicit HTTP loopback staging", () => {
    const stagingEnv = {
      AUTH_URL: "http://127.0.0.1:3100",
      NODE_ENV: "production",
      TRUSTFIRST_ALLOW_LOOPBACK_STAGING: "true",
      TRUSTFIRST_DEMO_MODE: "staging",
    };

    expect(shouldUseSecureAuthCookies(stagingEnv)).toBe(false);
    expect(authSessionCookieName(stagingEnv)).toBe("authjs.session-token");
  });

  it("does not weaken canonical production cookies when staging flags leak", () => {
    const productionEnv = {
      AUTH_URL: "https://app.mangalamsanitary.in",
      NODE_ENV: "production",
      TRUSTFIRST_ALLOW_LOOPBACK_STAGING: "true",
      TRUSTFIRST_DEMO_MODE: "staging",
    };

    expect(shouldUseSecureAuthCookies(productionEnv)).toBe(true);
    expect(authSessionCookieName(productionEnv)).toBe("__Secure-authjs.session-token");
  });
});

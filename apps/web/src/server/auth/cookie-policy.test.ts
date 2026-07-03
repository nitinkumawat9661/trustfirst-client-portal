import { describe, expect, it } from "vitest";
import {
  authSessionCookieName,
  isTemporaryHttpStagingLoginEnabled,
  shouldUseSecureAuthCookies,
} from "./cookie-policy";

describe("Auth cookie policy", () => {
  it("keeps secure cookies as the production default", () => {
    const env = {
      AUTH_URL: "https://demo.trustfirstsolutions.in",
      NODE_ENV: "production",
      TRUSTFIRST_HTTP_STAGING_LOGIN: "yes",
    };

    expect(isTemporaryHttpStagingLoginEnabled(env)).toBe(false);
    expect(shouldUseSecureAuthCookies(env)).toBe(true);
    expect(authSessionCookieName(env)).toBe("__Secure-authjs.session-token");
  });

  it("allows non-secure cookies only for the explicit HTTP IP staging URL", () => {
    const env = {
      AUTH_URL: "http://45.10.21.141:3010",
      NODE_ENV: "production",
      TRUSTFIRST_HTTP_STAGING_LOGIN: "yes",
    };

    expect(isTemporaryHttpStagingLoginEnabled(env)).toBe(true);
    expect(shouldUseSecureAuthCookies(env)).toBe(false);
    expect(authSessionCookieName(env)).toBe("authjs.session-token");
  });

  it("does not enable the staging exception for localhost or a missing gate", () => {
    expect(
      isTemporaryHttpStagingLoginEnabled({
        AUTH_URL: "http://localhost:3010",
        NODE_ENV: "production",
        TRUSTFIRST_HTTP_STAGING_LOGIN: "yes",
      }),
    ).toBe(false);

    expect(
      isTemporaryHttpStagingLoginEnabled({
        AUTH_URL: "http://45.10.21.141:3010",
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });
});

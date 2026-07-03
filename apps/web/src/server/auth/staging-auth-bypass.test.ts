import { describe, expect, it } from "vitest";
import { isHttpStagingAuthBypassEnabled } from "./staging-auth-bypass-gate";

const validEnv = {
  AUTH_URL: "http://45.10.21.141:3010",
  DEPLOY_ALLOW_SHARED_OLD_VPS: "yes",
  NODE_ENV: "production",
  TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS: "yes",
  TRUSTFIRST_HTTP_STAGING_LOGIN: "yes",
};

describe("HTTP staging auth bypass gate", () => {
  it("enables bypass only for the direct staging IP host", () => {
    expect(
      isHttpStagingAuthBypassEnabled({
        env: validEnv,
        host: "45.10.21.141:3010",
        internalQaHeader: "yes",
      }),
    ).toBe(true);
  });

  it("requires the internal QA header so public browsers cannot unlock admin routes", () => {
    expect(
      isHttpStagingAuthBypassEnabled({
        env: validEnv,
        host: "45.10.21.141:3010",
      }),
    ).toBe(false);
  });

  it("keeps HTTPS/domain deployments on normal auth", () => {
    expect(
      isHttpStagingAuthBypassEnabled({
        env: { ...validEnv, AUTH_URL: "https://demo.trustfirstsolutions.in" },
        host: "demo.trustfirstsolutions.in",
        internalQaHeader: "yes",
      }),
    ).toBe(false);
  });

  it("requires the shared VPS safety flag and exact host", () => {
    expect(
      isHttpStagingAuthBypassEnabled({
        env: withoutSharedVpsSafetyFlag(validEnv),
        host: "45.10.21.141:3010",
        internalQaHeader: "yes",
      }),
    ).toBe(false);

    expect(
      isHttpStagingAuthBypassEnabled({
        env: validEnv,
        host: "localhost:3010",
        internalQaHeader: "yes",
      }),
    ).toBe(false);
  });
});

function withoutSharedVpsSafetyFlag(env: typeof validEnv) {
  return {
    AUTH_URL: env.AUTH_URL,
    NODE_ENV: env.NODE_ENV,
    TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS: env.TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS,
    TRUSTFIRST_HTTP_STAGING_LOGIN: env.TRUSTFIRST_HTTP_STAGING_LOGIN,
  };
}

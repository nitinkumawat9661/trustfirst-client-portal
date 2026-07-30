import { describe, expect, it } from "vitest";
import { isDirectLoopbackSessionHealthProbe } from "./health-probe";

function probe(input: {
  headers?: Record<string, string>;
  method?: string;
  pathname?: string;
} = {}) {
  return isDirectLoopbackSessionHealthProbe({
    headers: new Headers({
      host: "127.0.0.1:3012",
      ...input.headers,
    }),
    method: input.method ?? "GET",
    pathname: input.pathname ?? "/api/auth/session",
  });
}

describe("isDirectLoopbackSessionHealthProbe", () => {
  it("accepts only the unauthenticated direct loopback session probe", () => {
    expect(probe()).toBe(true);
    expect(probe({ headers: { host: "localhost:3010" } })).toBe(true);
  });

  it("rejects mutations and every other route", () => {
    expect(probe({ method: "POST" })).toBe(false);
    expect(probe({ pathname: "/api/hardware/sales" })).toBe(false);
    expect(probe({ pathname: "/" })).toBe(false);
  });

  it("rejects proxied, browser, authenticated, and non-loopback requests", () => {
    expect(probe({ headers: { "x-forwarded-for": "198.51.100.10" } })).toBe(false);
    expect(probe({ headers: { "x-real-ip": "198.51.100.10" } })).toBe(false);
    expect(probe({ headers: { cookie: "authjs.session-token=secret" } })).toBe(false);
    expect(probe({ headers: { authorization: "Bearer secret" } })).toBe(false);
    expect(probe({ headers: { origin: "https://attacker.example" } })).toBe(false);
    expect(probe({ headers: { "sec-fetch-site": "cross-site" } })).toBe(false);
    expect(probe({ headers: { host: "attacker.example" } })).toBe(false);
  });
});

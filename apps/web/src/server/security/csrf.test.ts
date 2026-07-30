import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCsrfSafeRequest } from "./csrf";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertCsrfSafeRequest", () => {
  it("accepts a same-origin HTTPS request on a configured production host", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://app.mangalamsanitary.in/api/hardware", {
      method: "POST",
      headers: {
        host: "app.mangalamsanitary.in",
        origin: "https://app.mangalamsanitary.in",
        "sec-fetch-site": "same-origin",
      },
    });

    expect(() => assertCsrfSafeRequest(request)).not.toThrow();
  });

  it("rejects cross-site requests before trusting origin headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://app.mangalamsanitary.in/api/hardware", {
      method: "POST",
      headers: {
        host: "app.mangalamsanitary.in",
        origin: "https://app.mangalamsanitary.in",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(() => assertCsrfSafeRequest(request)).toThrow("CSRF validation failed");
  });

  it("rejects origin and host mismatches", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://app.mangalamsanitary.in/api/hardware", {
      method: "POST",
      headers: {
        host: "app.mangalamsanitary.in",
        origin: "https://client.trustfirstsolutions.in",
      },
    });

    expect(() => assertCsrfSafeRequest(request)).toThrow("CSRF validation failed");
  });

  it("rejects unknown production hosts even when origin matches", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("https://attacker.example/api/hardware", {
      method: "POST",
      headers: {
        host: "attacker.example",
        origin: "https://attacker.example",
      },
    });

    expect(() => assertCsrfSafeRequest(request)).toThrow("CSRF validation failed");
  });
});

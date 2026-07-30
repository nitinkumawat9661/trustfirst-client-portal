import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applySecurityHeaders,
  createSecurityHeaderContext,
} from "./headers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("security headers", () => {
  it("propagates the same CSP nonce to the request and response", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("https://app.mangalamsanitary.in/admin", {
      headers: {
        host: "app.mangalamsanitary.in",
      },
    });
    const context = createSecurityHeaderContext(request);
    const response = applySecurityHeaders(NextResponse.next(), request, context);
    const requestCsp = context.requestHeaders.get("content-security-policy");
    const responseCsp = response.headers.get("content-security-policy");

    expect(context.requestHeaders.get("x-nonce")).toBeTruthy();
    expect(requestCsp).toBe(responseCsp);
    expect(responseCsp).toContain("strict-dynamic");
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
  });

  it("marks API responses as non-cacheable", () => {
    const request = new NextRequest("http://localhost:3000/api/hardware", {
      headers: {
        host: "localhost:3000",
      },
    });
    const response = applySecurityHeaders(NextResponse.next(), request);

    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});

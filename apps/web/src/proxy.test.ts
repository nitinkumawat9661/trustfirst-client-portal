import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { enforceHostBoundary } from "./server/domain/host-boundary";

describe("host boundary proxy decisions", () => {
  it("redirects Mangalam public signin aliases only to the Mangalam ERP sign-in", () => {
    const response = enforceHostBoundary(
      request("https://mangalamsanitary.in/signin"),
      "MANGALAM_PUBLIC",
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://app.mangalamsanitary.in/signin");
    expect(response?.headers.get("location")).not.toContain("client.trustfirstsolutions.in");
  });

  it("allows the approved Mangalam public intake route on the public host", () => {
    const response = enforceHostBoundary(
      request("https://mangalamsanitary.in/intake/manglam-trading-demo"),
      "MANGALAM_PUBLIC",
    );

    expect(response).toBeNull();
  });

  it("keeps other intake routes off the Mangalam public host", () => {
    const response = enforceHostBoundary(
      request("https://mangalamsanitary.in/intake/other-tenant"),
      "MANGALAM_PUBLIC",
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://mangalamsanitary.in/");
  });

  it("renders Mangalam ERP signin on the ERP host without cross-host redirect", () => {
    const response = enforceHostBoundary(
      request("https://app.mangalamsanitary.in/signin"),
      "MANGALAM_ERP",
    );

    expect(response).toBeNull();
  });

  it("keeps Mangalam ERP client portal paths inside Mangalam ERP", () => {
    const response = enforceHostBoundary(
      request("https://app.mangalamsanitary.in/client/documents"),
      "MANGALAM_ERP",
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://app.mangalamsanitary.in/admin");
  });

  it("keeps TrustFirst portal boundary for Mangalam ERP routes", () => {
    const response = enforceHostBoundary(
      request("https://client.trustfirstsolutions.in/admin/hardware"),
      "TRUSTFIRST_PORTAL",
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://app.mangalamsanitary.in/admin/hardware");
  });
});

function request(url: string) {
  return new NextRequest(url, { headers: { host: new URL(url).host } });
}

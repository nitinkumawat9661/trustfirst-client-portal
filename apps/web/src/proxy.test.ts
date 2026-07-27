import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { enforceHostBoundary } from "./server/domain/host-boundary";

describe("host boundary proxy decisions", () => {
  it("redirects Mangalam public signin aliases only to the Mangalam ERP sign-in", () => {
    const response = enforceHostBoundary(
      request("https://manglam.in/signin"),
      "MANGALAM_PUBLIC",
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://app.mangalamsanitary.in/sign-in");
    expect(response?.headers.get("location")).not.toContain("client.trustfirstsolutions.in");
  });

  it("keeps Mangalam ERP client portal paths inside Mangalam ERP", () => {
    const response = enforceHostBoundary(
      request("https://app.manglam.in/client/documents"),
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

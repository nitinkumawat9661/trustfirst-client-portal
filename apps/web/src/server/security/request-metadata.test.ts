import { describe, expect, it } from "vitest";
import { readRequestMetadata } from "./request-metadata";

describe("readRequestMetadata", () => {
  it("prefers the reverse proxy observed IP over a spoofed forwarded chain", () => {
    const request = new Request("https://app.mangalamsanitary.in/api/hardware", {
      headers: {
        "x-forwarded-for": "198.51.100.10, 203.0.113.20",
        "x-real-ip": "192.0.2.44",
      },
    });

    expect(readRequestMetadata(request).ipAddress).toBe("192.0.2.44");
  });

  it("uses the right-most valid forwarded address when x-real-ip is absent", () => {
    const request = new Request("https://app.mangalamsanitary.in/api/hardware", {
      headers: {
        "x-forwarded-for": "spoofed, 198.51.100.10, 203.0.113.20",
      },
    });

    expect(readRequestMetadata(request).ipAddress).toBe("203.0.113.20");
  });

  it("replaces unsafe request identifiers and drops oversized user agents", () => {
    const request = new Request("https://app.mangalamsanitary.in", {
      headers: {
        "user-agent": "x".repeat(513),
        "x-correlation-id": "bad\r\nvalue",
        "x-request-id": "<script>alert(1)</script>",
      },
    });
    const metadata = readRequestMetadata(request);

    expect(metadata.requestId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(metadata.correlationId).toBe(metadata.requestId);
    expect(metadata.userAgent).toBeUndefined();
  });
});

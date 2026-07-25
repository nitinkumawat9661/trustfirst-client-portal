import { beforeEach, describe, expect, it } from "vitest";
import {
  enforcePublicReceiptRateLimit,
  resetPublicReceiptRateLimitForTests,
} from "./public-receipt-rate-limit";

describe("public receipt rate limit", () => {
  beforeEach(() => {
    resetPublicReceiptRateLimitForTests();
  });

  it("allows twenty attempts inside the window", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(() =>
        enforcePublicReceiptRateLimit("127.0.0.1", 1_000),
      ).not.toThrow();
    }
  });

  it("blocks the twenty-first attempt", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      enforcePublicReceiptRateLimit("127.0.0.1", 1_000);
    }

    expect(() =>
      enforcePublicReceiptRateLimit("127.0.0.1", 1_000),
    ).toThrow("Too many receipt lookup attempts");
  });

  it("resets after ten minutes", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      enforcePublicReceiptRateLimit("127.0.0.1", 1_000);
    }

    expect(() =>
      enforcePublicReceiptRateLimit(
        "127.0.0.1",
        1_000 + 10 * 60 * 1000,
      ),
    ).not.toThrow();
  });
});
import { describe, expect, it } from "vitest";
import { hardwareProductSchema } from "./schemas";

describe("hardwareProductSchema", () => {
  it("requires a product name", () => {
    const result = hardwareProductSchema.safeParse({
      name: "",
      salesPriceCents: 100,
    });
    expect(result.success).toBe(false);
  });

  it("requires a positive sale price", () => {
    const missing = hardwareProductSchema.safeParse({ name: "Tap" });
    const zero = hardwareProductSchema.safeParse({ name: "Tap", salesPriceCents: 0 });
    expect(missing.success).toBe(false);
    expect(zero.success).toBe(false);
  });

  it("accepts a named product with a positive sale price", () => {
    const result = hardwareProductSchema.safeParse({
      name: "Tap",
      salesPriceCents: 12_345,
    });
    expect(result.success).toBe(true);
  });
});

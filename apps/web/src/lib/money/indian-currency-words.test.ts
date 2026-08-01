import { describe, expect, it } from "vitest";
import { formatIndianCurrencyWords } from "./indian-currency-words";

describe("Indian currency words", () => {
  it("writes a rounded whole-rupee total without duplicate Rupees", () => {
    expect(formatIndianCurrencyWords(435_600)).toBe("Rupees Four Thousand Three Hundred Fifty Six Only");
  });

  it("uses the singular Paisa label", () => {
    expect(formatIndianCurrencyWords(436_001)).toBe("Rupees Four Thousand Three Hundred Sixty and One Paisa Only");
  });
});

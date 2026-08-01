import { describe, expect, it } from "vitest";
import { formatPartyName, resolveReferenceTerms } from "./reference-bill-layout";

describe("reference bill content rules", () => {
  it("normalizes an all-lowercase party name without changing mixed-case names", () => {
    expect(formatPartyName("nitin kumawat")).toBe("Nitin Kumawat");
    expect(formatPartyName("ABC Traders")).toBe("ABC Traders");
  });

  it("uses Estimate-specific fallback terms", () => {
    expect(resolveReferenceTerms(null, true)).toContain("This estimate is not a tax invoice.");
    expect(resolveReferenceTerms(null, false)).toContain("Goods once sold will not be taken back.");
  });
});

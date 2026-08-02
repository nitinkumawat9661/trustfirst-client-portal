import { describe, expect, it } from "vitest";
import { formatAddress, formatPartyName, resolveReferenceTerms } from "./reference-bill-layout";

describe("reference bill content rules", () => {
  it("normalizes an all-lowercase party name without changing mixed-case names", () => {
    expect(formatPartyName("nitin kumawat")).toBe("Nitin Kumawat");
    expect(formatPartyName("ABC Traders")).toBe("ABC Traders");
  });

  it("uses Estimate-specific fallback terms", () => {
    expect(resolveReferenceTerms(null, true)).toContain("This estimate is not a tax invoice.");
    expect(resolveReferenceTerms(null, false)).toContain("Goods once sold will not be taken back.");
  });

  it("deduplicates and normalizes firm address parts for customer print", () => {
    expect(formatAddress({
      addressLine1: "SIKAR, JAIPUR JHUNJHUNU BYPASS, GROUND FLOOR",
      addressLine2: "SHOP NO.01, JAIPUR JHUNJHUNU BYPASS, NAWALGARH ROAD",
      city: "SIKAR",
      state: "RAJASTHAN",
      country: "India",
      postalCode: "332001",
    })).toBe(
      "Sikar, Jaipur Jhunjhunu Bypass, Ground Floor, Shop No.01, Nawalgarh Road, Rajasthan, India, 332001",
    );
  });
});

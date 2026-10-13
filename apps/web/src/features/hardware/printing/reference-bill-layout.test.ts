import { describe, expect, it } from "vitest";
import { buildReferenceGstSummary, formatAddress, formatPartyName, resolveReferenceTerms } from "./reference-bill-layout";

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

describe("format 3 historical and future bill GST summary", () => {
  const originalInvoiceTax = [{ taxableCents: 223740, taxCents: 40273, taxRateBps: 1800 }];

  it("shows an old intra-state invoice with exact stored 9% CGST and SGST paise", () => {
    const summary = buildReferenceGstSummary(originalInvoiceTax, "intra-state");
    expect(summary.rows).toEqual([{
      taxableCents: 223740,
      taxCents: 40273,
      taxRateBps: 1800,
      cgstCents: 20136,
      sgstCents: 20137,
    }]);
    expect(summary.totalTaxCents).toBe(40273);
    expect(summary.totalTaxableCents).toBe(223740);
    expect(summary.rateLabel).toBe("18%");
    expect(originalInvoiceTax[0]!.taxCents).toBe(40273);
  });

  it("uses the IGST column for inter-state documents without duplicate split tax", () => {
    const summary = buildReferenceGstSummary(originalInvoiceTax, "inter-state");
    expect(summary.rows[0]!.cgstCents).toBe(0);
    expect(summary.rows[0]!.sgstCents).toBe(0);
    expect(summary.rows[0]!.taxCents).toBe(40273);
  });

  it("keeps separate taxable and tax amounts for multiple GST rates", () => {
    const summary = buildReferenceGstSummary([
      { taxableCents: 50000, taxCents: 2500, taxRateBps: 500 },
      { taxableCents: 100000, taxCents: 12000, taxRateBps: 1200 },
      { taxableCents: 0, taxCents: 0, taxRateBps: 0 },
    ], "intra-state");
    expect(summary.rows).toHaveLength(3);
    expect(summary.rows[0]!.cgstCents + summary.rows[0]!.sgstCents).toBe(2500);
    expect(summary.rows[1]!.cgstCents + summary.rows[1]!.sgstCents).toBe(12000);
    expect(summary.rateLabel).toBe("Multiple rates");
    expect(summary.totalTaxableCents).toBe(150000);
    expect(summary.totalTaxCents).toBe(14500);
  });

  it("handles no taxable rows without inventing any GST", () => {
    expect(buildReferenceGstSummary([], "intra-state")).toEqual({
      rows: [],
      rateLabel: "0%",
      totalTaxableCents: 0,
      totalTaxCents: 0,
    });
  });
});

import { describe, expect, it } from "vitest";
import { REFERENCE_BILL_PDF_OVERRIDES } from "./reference-bill-pdf-overrides";

describe("Mangalam bill PDF balance overrides", () => {
  it("reduces the oversized empty item area on short bills", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page { min-height: 245mm; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page { min-height: 245mm !important; }");
  });

  it("labels the pre-discount summary accurately", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain('content: "Gross Total"');
  });

  it("improves customer address and financial-section readability", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("text-transform: capitalize");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-grand-total { font-size: 10px; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-footer { font-size: 8px; }");
  });
});

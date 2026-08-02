import { describe, expect, it } from "vitest";
import { REFERENCE_BILL_PDF_OVERRIDES } from "./reference-bill-pdf-overrides";

describe("Mangalam bill PDF balance overrides", () => {
  it("lets the final bill page use only the content height", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page-final { min-height: 0; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page-final .bill-table-spacer { display: none; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page-final { min-height: 0 !important; }");
  });

  it("formats the financial summary as distinct label and amount rows", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-calculation-summary-row");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("grid-template-columns: minmax(0, 1fr) 30mm");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-roundoff-row");
  });

  it("improves customer address and final-section readability", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("text-transform: capitalize");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-grand-total { font-size: 10px; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-footer { font-size: 8px; }");
  });
});

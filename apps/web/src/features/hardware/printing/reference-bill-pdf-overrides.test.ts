import { describe, expect, it } from "vitest";
import { REFERENCE_BILL_PDF_OVERRIDES } from "./reference-bill-pdf-overrides";

describe("Mangalam bill PDF balance overrides", () => {
  it("lets the final bill page and table use only the content height", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page-final { min-height: 0; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("display: block;");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("height: auto;");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page-final .bill-table-spacer { display: none; }");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-page-final { min-height: 0 !important; }");
  });

  it("forces the complete printable canvas to remain white", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("html,");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("body > div,");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".print-sheet {");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("background: #fff !important;");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("color: #000 !important;");
  });

  it("formats the financial summary as distinct label and amount rows", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-calculation-summary-row");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("grid-template-columns: minmax(0, 1fr) 30mm");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-roundoff-row");
  });

  it("keeps terms readable and reduces the short-bill signature block", () => {
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain(".bill-footer {");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("font-size: 8.3px;");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("min-height: 6mm;");
    expect(REFERENCE_BILL_PDF_OVERRIDES).toContain("min-height: 16mm;");
  });
});

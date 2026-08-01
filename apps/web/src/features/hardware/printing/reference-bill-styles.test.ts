import { describe, expect, it } from "vitest";
import { REFERENCE_BILL_PRINT_CSS } from "./reference-bill-styles";

describe("reference-style A4 bill CSS", () => {
  it("fits the item table inside A4 without a printable scrollbar", () => {
    expect(REFERENCE_BILL_PRINT_CSS).toContain(".bill-table-wrap");
    expect(REFERENCE_BILL_PRINT_CSS).toContain("overflow: hidden");
    expect(REFERENCE_BILL_PRINT_CSS).toContain("min-width: 0");
    expect(REFERENCE_BILL_PRINT_CSS).not.toContain("overflow-x: auto");
    expect(REFERENCE_BILL_PRINT_CSS).not.toContain("min-width: 780px");
  });

  it("keeps dense product rows on one line and uses explicit A4 pagination", () => {
    expect(REFERENCE_BILL_PRINT_CSS).toContain("white-space: nowrap");
    expect(REFERENCE_BILL_PRINT_CSS).toContain("table-layout: fixed");
    expect(REFERENCE_BILL_PRINT_CSS).toContain("@page { size: A4 portrait; margin: 5mm 6mm; }");
    expect(REFERENCE_BILL_PRINT_CSS).toContain("page-break-after: always");
  });
});

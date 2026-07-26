import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/hardware/whatsapp", () => ({
  buildWhatsAppBillUrl: () => null,
}));

import { quickPosPrintTestUtils } from "./quick-pos-form";

const firm = {
  address: "Test address",
  email: "test@example.invalid",
  firmName: "MANGALAM SANITARY",
  gstin: "TESTGSTIN",
  phone: "0000000000",
  tagline: "BATHWARE · PLUMBING · HARDWARE",
  termsFooter: "TEST FOOTER",
};

describe("quick POS print preview helpers", () => {
  it("keeps preview totals aligned with the posted total contract", () => {
    const lines = [{
      barcode: "890000000001",
      discountPercent: "10",
      gstRate: "18",
      hsnCode: "3917",
      productId: "product_1",
      productName: "TEST PRODUCT",
      quantity: "2",
      rate: "100",
      sku: "TEST-SKU",
      unitCode: "PCS",
    }];

    const totals = quickPosPrintTestUtils.calculateTotals(lines, "100", "5");
    const preview = quickPosPrintTestUtils.buildBillPreview({
      cashierName: "Counter",
      customer: {
        balanceSide: null,
        contact: "9999999999",
        currentBalanceCents: 0,
        gstin: null,
        id: "customer_1",
        name: "TEST CUSTOMER",
        openingBalanceCents: 0,
        role: "customer",
      },
      firm,
      lines,
      notes: "Test note",
      paidCents: totals.paidCents,
      paymentMode: "CASH",
      posted: null,
      totals,
    });

    expect(preview.statusLabel).toBe("DRAFT PREVIEW");
    expect(preview.documentNumber).toBe("DRAFT PREVIEW");
    expect(preview.grandTotalCents).toBe(totals.totalCents);
    expect(preview.balanceCents).toBe(totals.balanceCents);
    expect(preview.lines[0]?.sku).toBe("TEST-SKU");
  });

  it("emits paper-specific CSS for thermal and A4 printing", () => {
    expect(quickPosPrintTestUtils.printCss("58mm")).toContain("@page { size: 58mm auto");
    expect(quickPosPrintTestUtils.printCss("80mm")).toContain("@page { size: 80mm auto");
    expect(quickPosPrintTestUtils.printCss("a4")).toContain("@page { size: A4 portrait");
  });

  it("renders a print-only document without ERP controls", () => {
    const bill = quickPosPrintTestUtils.buildTestPrintPreview({
      cashierName: "Counter",
      firm,
      format: "80mm",
    });
    const html = quickPosPrintTestUtils.printDocumentHtml(bill, "80mm", "TEST PRINT");

    expect(html).toContain("TEST PRINT ONLY");
    expect(html).toContain("MANGALAM SANITARY");
    expect(html).not.toContain("Post bill");
    expect(html).not.toContain("Reprint receipt");
  });
});

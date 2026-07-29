import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/hardware/whatsapp", () => ({
  buildWhatsAppBillUrl: () => null,
}));
import { hardwareTradeFormTestUtils } from "./hardware-trade-form";
import { quickPosPrintTestUtils } from "./quick-pos-form";

const baseLine = {
  barcode: null,
  discountPercent: "0",
  gstRate: "0",
  hsnCode: null,
  productId: "product-1",
  productName: "Test product",
  quantity: "1",
  rate: "100",
  sku: "TEST-1",
  unitCode: "PCS",
};

describe("bill and estimate GST behavior", () => {
  it("keeps a normal bill GST-free until a line rate is selected", () => {
    const totals = quickPosPrintTestUtils.calculateTotals([baseLine], "0", "0");

    expect(totals.subtotalCents).toBe(10_000);
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(10_000);
  });

  it("calculates GST independently for each normal bill line", () => {
    const totals = quickPosPrintTestUtils.calculateTotals([
      { ...baseLine, gstRate: "5" },
      { ...baseLine, gstRate: "18", productId: "product-2", rate: "200" },
      { ...baseLine, gstRate: "0", productId: "product-3", rate: "50" },
    ], "0", "0");

    expect(totals.subtotalCents).toBe(35_000);
    expect(totals.taxCents).toBe(4_100);
    expect(totals.totalCents).toBe(39_100);
  });

  it("keeps Estimate Bill GST editable per line and defaults other lines to zero", () => {
    const estimate = hardwareTradeFormTestUtils.calculatePreview([{
      discountPercent: "0",
      gstRate: "18",
      hsnCode: "",
      productId: "product-1",
      productName: "Taxed product",
      quantity: "2",
      unitCode: "PCS",
      unitRate: "100",
    }, {
      discountPercent: "0",
      gstRate: "0",
      hsnCode: "",
      productId: "product-2",
      productName: "Zero-rated product",
      quantity: "1",
      unitCode: "PCS",
      unitRate: "50",
    }], "0");

    expect(estimate.grossCents).toBe(25_000);
    expect(estimate.taxCents).toBe(3_600);
    expect(estimate.totalCents).toBe(28_600);
  });
});

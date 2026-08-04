import { describe, expect, it } from "vitest";
import {
  buildQueuedOfflineProductSummary,
  catalogProductPayloadToOfflineInput,
  validateOfflineProductInput,
} from "./product-result";

const brandId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const unitId = "33333333-3333-4333-8333-333333333333";

describe("queued offline product summaries", () => {
  it("maps the existing catalog payload into the authenticated quick-product sync contract", () => {
    expect(catalogProductPayloadToOfflineInput({
      barcode: "8901234567890",
      brandId,
      categoryId,
      gstTaxConfig: { rateBps: 1800 },
      lowStockThreshold: 2,
      metadata: { hsnCode: "6910" },
      name: "  Ceramic Basin  ",
      purchaseCostCents: 50000,
      salesPriceCents: 75000,
      sku: "BASIN-001",
      unitId,
    })).toEqual({
      barcode: "8901234567890",
      brandId,
      categoryId,
      gstRateBps: 1800,
      hsnCode: "6910",
      lowStockThreshold: 2,
      name: "Ceramic Basin",
      purchaseCostCents: 50000,
      salesPriceCents: 75000,
      sku: "BASIN-001",
      unitId,
    });
  });

  it("builds a pending table row without exposing a server product ID", () => {
    expect(buildQueuedOfflineProductSummary({
      brandId,
      categoryId,
      gstRateBps: 1800,
      hsnCode: "6910",
      lowStockThreshold: 1,
      name: "Ceramic Basin",
      purchaseCostCents: 50000,
      salesPriceCents: 75000,
      unitId,
    }, "queue-product-1", {
      brandName: "Test Brand",
      categoryName: "Sanitary",
      unitCode: "PCS",
    })).toMatchObject({
      brandName: "Test Brand",
      categoryName: "Sanitary",
      currentStock: 0,
      gstRateBps: 1800,
      hsnCode: "6910",
      id: "offline-product:queue-product-1",
      lowStock: true,
      name: "Ceramic Basin",
      offlineQueued: true,
      queueItemId: "queue-product-1",
      queueStatus: "pending",
      salesPriceCents: 75000,
      sku: "Auto after sync",
      stockSetupStatus: "PENDING",
      unitCode: "PCS",
    });
  });

  it("rejects malformed fields before queue persistence", () => {
    expect(() => validateOfflineProductInput({
      name: "A",
      salesPriceCents: 100,
    })).toThrow("Product name must be between 2 and 240 characters");
    expect(() => validateOfflineProductInput({
      hsnCode: "@bad",
      name: "Test Product",
      salesPriceCents: 100,
    })).toThrow("HSN / SAC must contain 2 to 12 letters, digits, or dashes");
    expect(() => validateOfflineProductInput({
      brandId: "not-a-uuid",
      name: "Test Product",
      salesPriceCents: 100,
    })).toThrow("Brand selection is invalid");
    expect(() => validateOfflineProductInput({
      name: "Test Product",
      salesPriceCents: 0,
    })).toThrow("Sale price must be greater than zero");
  });
});

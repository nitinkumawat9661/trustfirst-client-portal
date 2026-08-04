import type { QueuedMutationStatus } from "../offline-queue";

export type OfflineProductDraftInput = {
  barcode?: string;
  brandId?: string;
  categoryId?: string;
  gstRateBps?: number;
  hsnCode?: string;
  lowStockThreshold?: number;
  name: string;
  openingStock?: { locationId: string; quantity: number };
  purchaseCostCents?: number;
  salesPriceCents: number;
  sku?: string;
  unitId?: string;
};

export type OfflineProductDisplay = {
  brandName?: string | null;
  categoryName?: string | null;
  unitCode?: string | null;
};

export type QueuedOfflineProductSummary = {
  barcode: string | null;
  brandName: string | null;
  categoryName: string | null;
  currentStock: number;
  gstRateBps: number | null;
  hsnCode: string | null;
  id: string;
  lowStock: boolean;
  lowStockThreshold: number;
  name: string;
  offlineQueued: true;
  purchaseCostCents: number;
  queueItemId: string;
  queueStatus: QueuedMutationStatus;
  salesDiscountBps: number;
  salesPriceCents: number;
  sku: string;
  status: "ACTIVE";
  stockSetupStatus: "PENDING" | "TRACKED";
  unitCode: string | null;
};

export function catalogProductPayloadToOfflineInput(
  rawPayload: Record<string, unknown>,
): OfflineProductDraftInput {
  const metadata = asRecord(rawPayload.metadata);
  const gstTaxConfig = asRecord(rawPayload.gstTaxConfig);
  const stockLevel = asRecord(rawPayload.stockLevel);
  return validateOfflineProductInput({
    barcode: rawPayload.barcode,
    brandId: rawPayload.brandId,
    categoryId: rawPayload.categoryId,
    gstRateBps: gstTaxConfig.rateBps,
    hsnCode: metadata.hsnCode,
    lowStockThreshold: rawPayload.lowStockThreshold,
    name: rawPayload.name,
    openingStock: Object.keys(stockLevel).length ? stockLevel : undefined,
    purchaseCostCents: rawPayload.purchaseCostCents,
    salesPriceCents: rawPayload.salesPriceCents,
    sku: rawPayload.sku,
    unitId: rawPayload.unitId,
  });
}

export function validateOfflineProductInput(
  rawInput: Record<string, unknown>,
): OfflineProductDraftInput {
  const name = requiredText(rawInput.name, "Product name", 2, 240);
  const salesPriceCents = nonNegativeInteger(rawInput.salesPriceCents, "Sale price", true);
  if (salesPriceCents <= 0) throw new Error("Sale price must be greater than zero.");
  const purchaseCostCents = nonNegativeInteger(rawInput.purchaseCostCents ?? 0, "Purchase price");
  const lowStockThreshold = nonNegativeInteger(rawInput.lowStockThreshold ?? 0, "Low-stock threshold");
  const gstRateBps = optionalInteger(rawInput.gstRateBps, "GST rate");
  if (gstRateBps !== undefined && gstRateBps > 10_000) {
    throw new Error("GST rate must be between 0 and 10000 basis points.");
  }
  const hsnCode = optionalText(rawInput.hsnCode, 12)?.toUpperCase();
  const openingStockRecord = asRecord(rawInput.openingStock);
  const openingStock = Object.keys(openingStockRecord).length
    ? {
        locationId: optionalUuid(openingStockRecord.locationId, "Stock location") as string,
        quantity: nonNegativeInteger(openingStockRecord.quantity, "Stock level"),
      }
    : undefined;
  if (openingStock && !openingStock.locationId) throw new Error("Select a stock location when setting stock level.");
  if (hsnCode && !/^[A-Z0-9-]{2,12}$/u.test(hsnCode)) {
    throw new Error("HSN / SAC must contain 2 to 12 letters, digits, or dashes.");
  }
  return {
    ...(optionalText(rawInput.barcode, 120) ? { barcode: optionalText(rawInput.barcode, 120) as string } : {}),
    ...(optionalUuid(rawInput.brandId, "Brand") ? { brandId: optionalUuid(rawInput.brandId, "Brand") as string } : {}),
    ...(optionalUuid(rawInput.categoryId, "Category") ? { categoryId: optionalUuid(rawInput.categoryId, "Category") as string } : {}),
    ...(gstRateBps === undefined ? {} : { gstRateBps }),
    ...(hsnCode ? { hsnCode } : {}),
    lowStockThreshold,
    name,
    ...(openingStock ? { openingStock } : {}),
    purchaseCostCents,
    salesPriceCents,
    ...(optionalText(rawInput.sku, 120) ? { sku: optionalText(rawInput.sku, 120) as string } : {}),
    ...(optionalUuid(rawInput.unitId, "Unit") ? { unitId: optionalUuid(rawInput.unitId, "Unit") as string } : {}),
  };
}

export function buildQueuedOfflineProductSummary(
  rawInput: Record<string, unknown>,
  queueItemId: string,
  display: OfflineProductDisplay = {},
  queueStatus: QueuedMutationStatus = "pending",
): QueuedOfflineProductSummary {
  const input = validateOfflineProductInput(rawInput);
  const lowStockThreshold = input.lowStockThreshold ?? 0;
  const currentStock = input.openingStock?.quantity ?? 0;
  return {
    barcode: input.barcode ?? null,
    brandName: normalizedDisplay(display.brandName),
    categoryName: normalizedDisplay(display.categoryName),
    currentStock,
    gstRateBps: input.gstRateBps ?? null,
    hsnCode: input.hsnCode ?? null,
    id: `offline-product:${queueItemId}`,
    lowStock: currentStock <= lowStockThreshold,
    lowStockThreshold,
    name: input.name,
    offlineQueued: true,
    purchaseCostCents: input.purchaseCostCents ?? 0,
    queueItemId,
    queueStatus,
    salesDiscountBps: 0,
    salesPriceCents: input.salesPriceCents,
    sku: input.sku ?? "Auto after sync",
    status: "ACTIVE",
    stockSetupStatus: input.openingStock ? "TRACKED" : "PENDING",
    unitCode: normalizedDisplay(display.unitCode),
  };
}

function requiredText(value: unknown, label: string, minLength: number, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new Error(`${label} must be between ${minLength} and ${maxLength} characters.`);
  }
  return normalized;
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Product text fields must be strings.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`Product field cannot exceed ${maxLength} characters.`);
  return normalized || null;
}

function nonNegativeInteger(value: unknown, label: string, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${label} is required.`);
    return 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number of paise.`);
  }
  return value;
}

function optionalInteger(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }
  return value;
}

function optionalUuid(value: unknown, label: string) {
  const normalized = optionalText(value, 80);
  if (!normalized) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(normalized)) {
    throw new Error(`${label} selection is invalid.`);
  }
  return normalized;
}

function normalizedDisplay(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

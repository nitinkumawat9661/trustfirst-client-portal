import type { QueuedMutationStatus } from "../offline-queue";

export type OfflineStockMovementType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

export type OfflineStockMovementInput = {
  locationId: string;
  notes?: string;
  productId: string;
  quantity: number;
  type: OfflineStockMovementType;
};

export type OfflineStockDisplay = {
  locationName?: string | null;
  productName?: string | null;
};

export type QueuedOfflineStockMovement = {
  expectedCurrentStock: number;
  id: string;
  locationName: string;
  occurredAt: Date;
  offlineQueued: true;
  productId: string;
  productName: string;
  projectedStock: number;
  quantity: number;
  queueItemId: string;
  queueStatus: QueuedMutationStatus;
  type: OfflineStockMovementType;
};

export function validateOfflineStockMovement(
  rawInput: Record<string, unknown>,
  expectedCurrentStock: unknown,
): { expectedCurrentStock: number; input: OfflineStockMovementInput } {
  const productId = requiredText(rawInput.productId, "Product");
  const locationId = requiredText(rawInput.locationId, "Stock location");
  const type = rawInput.type;
  if (type !== "STOCK_IN" && type !== "STOCK_OUT" && type !== "ADJUSTMENT") {
    throw new Error("Stock movement type is invalid.");
  }
  const quantity = nonNegativeInteger(rawInput.quantity, "Quantity");
  if (type !== "ADJUSTMENT" && quantity === 0) {
    throw new Error("Stock in and stock out quantity must be greater than zero.");
  }
  const snapshotStock = nonNegativeInteger(expectedCurrentStock, "Expected current stock");
  if (type === "STOCK_OUT" && quantity > snapshotStock) {
    throw new Error(`Stock out quantity ${quantity} exceeds the visible stock ${snapshotStock}.`);
  }
  const notes = optionalText(rawInput.notes, 2000);
  return {
    expectedCurrentStock: snapshotStock,
    input: {
      locationId,
      ...(notes ? { notes } : {}),
      productId,
      quantity,
      type,
    },
  };
}

export function buildQueuedOfflineStockMovement(
  rawInput: Record<string, unknown>,
  expectedCurrentStock: unknown,
  queueItemId: string,
  createdAt: string,
  display: OfflineStockDisplay = {},
  queueStatus: QueuedMutationStatus = "pending",
): QueuedOfflineStockMovement {
  const validated = validateOfflineStockMovement(rawInput, expectedCurrentStock);
  return {
    expectedCurrentStock: validated.expectedCurrentStock,
    id: `offline-stock:${queueItemId}`,
    locationName: normalizedDisplay(display.locationName, "Selected location"),
    occurredAt: validDate(createdAt),
    offlineQueued: true,
    productId: validated.input.productId,
    productName: normalizedDisplay(display.productName, "Selected product"),
    projectedStock: projectedStock(validated.expectedCurrentStock, validated.input),
    quantity: validated.input.quantity,
    queueItemId,
    queueStatus,
    type: validated.input.type,
  };
}

export function projectedStock(
  currentStock: number,
  input: Pick<OfflineStockMovementInput, "quantity" | "type">,
) {
  if (input.type === "STOCK_IN") return currentStock + input.quantity;
  if (input.type === "STOCK_OUT") return currentStock - input.quantity;
  return input.quantity;
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Stock notes must be text.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`Stock notes cannot exceed ${maxLength} characters.`);
  return normalized || null;
}

function nonNegativeInteger(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }
  return value;
}

function normalizedDisplay(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

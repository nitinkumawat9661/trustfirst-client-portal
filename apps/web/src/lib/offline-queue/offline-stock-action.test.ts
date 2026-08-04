import { describe, expect, it } from "vitest";
import { endpointForQueuedMutation } from "./hardware-actions";
import type { QueuedMutation } from "./types";

function queuedStockMovement(): QueuedMutation {
  return {
    action: "hardware.stockAdjustmentDraft.create",
    attemptCount: 0,
    createdAt: "2026-08-04T00:00:00.000Z",
    id: "queue-stock-1",
    idempotencyKey: "stock-idempotency-123",
    module: "hardware",
    payload: {
      expectedCurrentStock: 10,
      input: {
        locationId: "location-1",
        productId: "product-1",
        quantity: 8,
        type: "ADJUSTMENT",
      },
    },
    sequence: 1,
    status: "pending",
    tenantId: "tenant-1",
    updatedAt: "2026-08-04T00:00:00.000Z",
    userId: "user-1",
  };
}

describe("offline stock queue endpoint", () => {
  it("uses authenticated device sync instead of the browser-session inventory API", () => {
    const item = queuedStockMovement();
    expect(endpointForQueuedMutation(item)).toEqual({
      body: { item },
      method: "POST",
      path: "/api/offline/sync",
      requiresDeviceAuth: true,
    });
  });
});

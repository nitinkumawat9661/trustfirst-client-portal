import { describe, expect, it } from "vitest";
import { endpointForQueuedMutation } from "./hardware-actions";
import type { QueuedMutation } from "./types";

function queuedProduct(): QueuedMutation {
  return {
    action: "hardware.productDraft.create",
    attemptCount: 0,
    createdAt: "2026-08-04T00:00:00.000Z",
    id: "queue-product-1",
    idempotencyKey: "product-idempotency-123",
    module: "hardware",
    payload: {
      input: {
        name: "Test Product",
        salesPriceCents: 10000,
      },
    },
    sequence: 1,
    status: "pending",
    tenantId: "tenant-1",
    updatedAt: "2026-08-04T00:00:00.000Z",
    userId: "user-1",
  };
}

describe("offline product queue endpoint", () => {
  it("uses authenticated device sync instead of a browser-session product API", () => {
    const item = queuedProduct();
    expect(endpointForQueuedMutation(item)).toEqual({
      body: { item },
      method: "POST",
      path: "/api/offline/sync",
      requiresDeviceAuth: true,
    });
  });
});

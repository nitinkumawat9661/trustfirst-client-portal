import { describe, expect, it } from "vitest";
import { endpointForQueuedMutation } from "./hardware-actions";
import type { QueuedMutation } from "./types";

function queuedPayment(): QueuedMutation {
  return {
    action: "hardware.partyPaymentDraft.create",
    attemptCount: 0,
    createdAt: "2026-08-04T05:30:00.000Z",
    id: "queue-payment-1",
    idempotencyKey: "payment-idempotency-123",
    module: "hardware",
    payload: {
      expectedTargets: [{ dueCents: 5_000, targetTransactionId: "target-1" }],
      input: {
        allocations: [{ amountCents: 2_500, targetTransactionId: "target-1" }],
        amountCents: 2_500,
        excessAsAdvance: false,
        idempotencyKey: "manual-customer-payment-123",
        mode: "CASH",
        partyId: "customer-1",
      },
      role: "customer",
    },
    sequence: 1,
    status: "pending",
    tenantId: "tenant-1",
    updatedAt: "2026-08-04T05:30:00.000Z",
    userId: "user-1",
  };
}

describe("offline party payment endpoint", () => {
  it("uses device-authenticated offline sync instead of browser-session financial APIs", () => {
    const item = queuedPayment();
    expect(endpointForQueuedMutation(item)).toEqual({
      body: { item },
      method: "POST",
      path: "/api/offline/sync",
      requiresDeviceAuth: true,
    });
  });
});

import { describe, expect, it } from "vitest";
import { endpointForQueuedMutation } from "./hardware-actions";
import type { QueuedMutation } from "./types";

function queuedParty(): QueuedMutation {
  return {
    action: "hardware.partyDraft.create",
    attemptCount: 0,
    createdAt: "2026-08-04T00:00:00.000Z",
    id: "queue-party-1",
    idempotencyKey: "party-idempotency-123",
    module: "hardware",
    payload: {
      input: {
        name: "Test Customer",
        role: "customer",
      },
    },
    sequence: 1,
    status: "pending",
    tenantId: "tenant-1",
    updatedAt: "2026-08-04T00:00:00.000Z",
    userId: "user-1",
  };
}

describe("offline party queue endpoint", () => {
  it("uses the authenticated device sync endpoint instead of a browser-session API", () => {
    const item = queuedParty();
    expect(endpointForQueuedMutation(item)).toEqual({
      body: { item },
      method: "POST",
      path: "/api/offline/sync",
      requiresDeviceAuth: true,
    });
  });
});

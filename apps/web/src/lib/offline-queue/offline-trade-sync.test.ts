import { describe, expect, it } from "vitest";
import { formatOfflineNumber } from "../offline-data/storage";
import { endpointForQueuedMutation } from "./hardware-actions";
import { sanitizeQueuedPayload } from "./security";
import type { QueuedMutation } from "./types";

function item(): QueuedMutation {
  return {
    action: "hardware.tradeDraft.create",
    attemptCount: 0,
    createdAt: "2026-08-03T18:00:00.000Z",
    id: "queue_1",
    idempotencyKey: "idem_1",
    module: "hardware",
    payload: {
      confirm: true,
      documentNumber: "HSQ-2026-0101",
      input: { items: [], type: "SALES_QUOTATION" },
      leaseId: "11111111-1111-4111-8111-111111111111",
      leaseValue: 101,
    },
    sequence: 1,
    status: "pending",
    tenantId: "tenant_1",
    updatedAt: "2026-08-03T18:00:00.000Z",
    userId: "user_1",
  };
}

describe("offline trade sync contract", () => {
  it("routes the complete queue item through device-authenticated sync", () => {
    const queued = item();
    expect(endpointForQueuedMutation(queued)).toEqual({
      body: { item: queued },
      method: "POST",
      path: "/api/offline/sync",
      requiresDeviceAuth: true,
    });
  });

  it("preserves reserved-number evidence while removing secrets", () => {
    expect(sanitizeQueuedPayload({
      documentNumber: "HSQ-2026-0101",
      leaseId: "lease_1",
      leaseValue: 101,
      password: "remove",
      token: "remove",
    })).toEqual({
      documentNumber: "HSQ-2026-0101",
      leaseId: "lease_1",
      leaseValue: 101,
    });
  });

  it("formats trade and invoice ranges without changing visible series", () => {
    expect(formatOfflineNumber({
      deviceId: "device_1",
      endValue: 200,
      expiresAt: "2027-01-01T00:00:00.000Z",
      financialYear: "2026",
      format: "trade",
      id: "lease_1",
      nextValue: 101,
      prefix: "HSQ",
      series: "HSQ",
      startValue: 101,
    }, 101)).toBe("HSQ-2026-0101");
    expect(formatOfflineNumber({
      deviceId: "device_1",
      endValue: 200,
      expiresAt: "2027-01-01T00:00:00.000Z",
      financialYear: "2026-27",
      format: "invoice",
      id: "lease_2",
      nextValue: 101,
      prefix: "MS/INV",
      series: "MS/INV",
      startValue: 101,
    }, 101)).toBe("MS/INV/2026-27/00101");
  });
});

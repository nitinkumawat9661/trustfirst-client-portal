import { describe, expect, it } from "vitest";
import { LocalStorageOfflineQueueStorage } from "./storage";
import type { QueuedMutation } from "./types";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

const item: QueuedMutation = {
  action: "hardware.saleDraft.create",
  attemptCount: 0,
  createdAt: "2026-08-03T00:00:00.000Z",
  id: "queue-1",
  idempotencyKey: "idempotency-1",
  module: "hardware",
  payload: { customerId: "customer-1" },
  sequence: 1,
  status: "pending",
  tenantId: "tenant-1",
  updatedAt: "2026-08-03T00:00:00.000Z",
  userId: "user-1",
};

describe("browser offline queue storage", () => {
  it("retains the localStorage fallback when IndexedDB is unavailable", async () => {
    const storage = new LocalStorageOfflineQueueStorage(memoryStorage());

    await storage.write("scope-1", [item]);

    await expect(storage.read("scope-1")).resolves.toEqual([item]);
  });

  it("treats invalid fallback JSON as an empty queue", async () => {
    const fallback = memoryStorage();
    fallback.setItem("scope-1", "not-json");
    const storage = new LocalStorageOfflineQueueStorage(fallback);

    await expect(storage.read("scope-1")).resolves.toEqual([]);
  });
});

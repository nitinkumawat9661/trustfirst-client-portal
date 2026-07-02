import { describe, expect, it } from "vitest";
import {
  endpointForQueuedMutation,
  getOfflineBannerState,
  getSyncStatusViewModel,
  MemoryOfflineQueueStorage,
  OfflineMutationQueue,
  processOfflineQueue,
  queueHardwareManualPaymentDraft,
  queueHardwareProductDraft,
  queueHardwarePurchaseDraft,
  queueHardwareSaleDraft,
  retryDelay,
} from ".";

function queue(now = new Date("2026-07-02T10:00:00.000Z")) {
  let nextId = 0;
  return new OfflineMutationQueue({
    idFactory: () => `id_${++nextId}`,
    now: () => now,
    scope: { tenantId: "tenant_1", userId: "user_1" },
    storage: new MemoryOfflineQueueStorage(),
  });
}

describe("offline queue foundation", () => {
  it("adds tenant and user scoped hardware actions with sanitized payloads", async () => {
    const offlineQueue = queue();

    const item = await queueHardwareProductDraft(offlineQueue, {
      name: "PVC Pipe",
      password: "do-not-store",
      sku: "PVC-1",
      token: "do-not-store",
    });

    expect(item).toMatchObject({
      action: "hardware.productDraft.create",
      sequence: 1,
      status: "pending",
      tenantId: "tenant_1",
      userId: "user_1",
    });
    expect(item.payload).toEqual({ name: "PVC Pipe", sku: "PVC-1" });
    await expect(offlineQueue.snapshot()).resolves.toMatchObject({ pending: 1, total: 1 });
  });

  it("preserves queued mutation order during sync", async () => {
    const offlineQueue = queue();
    const processed: string[] = [];
    await queueHardwareSaleDraft(offlineQueue, { documentNumber: "sale" });
    await queueHardwarePurchaseDraft(offlineQueue, { documentNumber: "purchase" });

    await processOfflineQueue(offlineQueue, async (item) => {
      processed.push(item.action);
      return { ok: true };
    });

    expect(processed).toEqual(["hardware.saleDraft.create", "hardware.purchaseDraft.create"]);
    await expect(offlineQueue.snapshot()).resolves.toMatchObject({ pending: 0, synced: 2 });
  });

  it("marks retryable failures and allows manual retry", async () => {
    const offlineQueue = queue();
    await queueHardwareSaleDraft(offlineQueue, { customerId: "client_1" });

    await processOfflineQueue(offlineQueue, async () => ({ error: "Network unavailable.", ok: false, retryable: true }));
    const failed = (await offlineQueue.list())[0];

    expect(failed?.status).toBe("failed");
    expect(failed?.attemptCount).toBe(1);
    expect(failed?.retryAfterAt).toBe("2026-07-02T10:00:05.000Z");
    expect(retryDelay({ baseDelayMs: 1000, maxAttempts: 5, maxDelayMs: 10_000 }, 4)).toBe(8000);

    if (!failed) throw new Error("Expected failed queue item.");
    await offlineQueue.retryFailed(failed.id);
    await processOfflineQueue(offlineQueue, async () => ({ ok: true }));

    expect((await offlineQueue.list())[0]?.status).toBe("synced");
  });

  it("stores conflict detection details without scheduling retry", async () => {
    const offlineQueue = queue();
    await queueHardwareSaleDraft(offlineQueue, { customerId: "client_1" });

    await processOfflineQueue(offlineQueue, async () => ({
      conflict: { resolvedBy: "manual", serverVersion: "v2" },
      error: "Sync conflict detected.",
      ok: false,
      retryable: false,
    }));

    const failed = (await offlineQueue.list())[0];
    expect(failed?.status).toBe("failed");
    expect(failed?.retryAfterAt).toBeUndefined();
    expect(failed?.conflict).toEqual({ resolvedBy: "manual", serverVersion: "v2" });
  });

  it("maps manual payment drafts to invoice payment endpoints without leaking invoiceId into the body", async () => {
    const offlineQueue = queue();
    const item = await queueHardwareManualPaymentDraft(offlineQueue, {
      amountCents: 2500,
      invoiceId: "inv_1",
      mode: "Cash",
    });

    expect(endpointForQueuedMutation(item)).toEqual({
      body: { amountCents: 2500, mode: "Cash" },
      method: "POST",
      path: "/api/billing/invoices/inv_1/payments",
    });
  });

  it("projects offline UI and sync status states", () => {
    expect(getOfflineBannerState(false)).toEqual({
      message: "Offline. New hardware actions will be queued on this device.",
      visible: true,
    });
    expect(
      getSyncStatusViewModel(
        { failed: 1, pending: 0, scopedKey: "scope", synced: 0, syncing: 0, total: 1 },
        true,
      ),
    ).toEqual({ text: "1 failed sync action", tone: "error" });
  });
});

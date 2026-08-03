import { IndexedDbOfflineDataStorage } from "../offline-data/storage";
import { endpointForQueuedMutation } from "./hardware-actions";
import type { OfflineMutationQueue } from "./queue";
import type { QueuedMutation, QueuedMutationExecutor, SyncResult } from "./types";

export async function processOfflineQueue(queue: OfflineMutationQueue, executor: QueuedMutationExecutor = fetchQueuedMutation) {
  const results: Array<{ id: string; result: SyncResult }> = [];

  for (const item of await queue.readyItems()) {
    await queue.markSyncing(item.id);
    const result = await executor(item);
    results.push({ id: item.id, result });

    if (result.ok) {
      await queue.markSynced(item.id);
      continue;
    }

    await queue.markFailed(item.id, result.error, result.retryable, "conflict" in result ? result.conflict : undefined);
  }

  return results;
}

export async function fetchQueuedMutation(item: QueuedMutation): Promise<SyncResult> {
  try {
    const endpoint = endpointForQueuedMutation(item);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-idempotency-key": item.idempotencyKey,
      "x-offline-queue-id": item.id,
    };

    if (endpoint.requiresDeviceAuth) {
      const record = await new IndexedDbOfflineDataStorage().read({ tenantId: item.tenantId, userId: item.userId });
      if (!record) {
        return {
          conflict: item.conflict ?? { resolvedBy: "manual" },
          error: "Offline device setup is missing on this browser.",
          ok: false,
          retryable: false,
        };
      }
      headers["x-offline-device-id"] = record.enrollment.deviceId;
      headers["x-offline-device-token"] = record.enrollment.token;
    }

    const response = await fetch(endpoint.path, {
      body: JSON.stringify(endpoint.body),
      credentials: "same-origin",
      headers,
      method: endpoint.method,
    });
    if (response.ok) return { ok: true };

    const message = await readErrorMessage(response);
    if (response.status === 409) {
      return {
        conflict: item.conflict ?? { resolvedBy: "manual" },
        error: message ?? "Sync conflict detected.",
        ok: false,
        retryable: false,
      };
    }
    if ([400, 401, 403, 404, 422].includes(response.status)) {
      return {
        conflict: item.conflict ?? { resolvedBy: "manual" },
        error: message ?? "Queued action was rejected and requires review.",
        ok: false,
        retryable: false,
      };
    }
    return {
      error: message ?? `Sync failed with status ${response.status}.`,
      ok: false,
      retryable: response.status >= 500 || response.status === 408 || response.status === 425 || response.status === 429,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network sync failed.",
      ok: false,
      retryable: true,
    };
  }
}

async function readErrorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: { message?: unknown } };
    return typeof body.error?.message === "string" && body.error.message.trim()
      ? body.error.message.trim()
      : null;
  } catch {
    return null;
  }
}

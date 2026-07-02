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
    const response = await fetch(endpoint.path, {
      body: JSON.stringify(endpoint.body),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": item.idempotencyKey,
        "x-offline-queue-id": item.id,
      },
      method: endpoint.method,
    });

    if (response.ok) {
      return { ok: true };
    }

    if (response.status === 409) {
      return {
        conflict: item.conflict ?? { resolvedBy: "manual" },
        error: "Sync conflict detected.",
        ok: false,
        retryable: false,
      };
    }

    return {
      error: `Sync failed with status ${response.status}.`,
      ok: false,
      retryable: response.status >= 500 || response.status === 429,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network sync failed.",
      ok: false,
      retryable: true,
    };
  }
}

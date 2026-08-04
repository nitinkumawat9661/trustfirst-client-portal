import {
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  queueHardwarePartyDraft,
  type OfflineQueueScope,
  type QueuedMutation,
} from "../offline-queue";
import {
  buildQueuedOfflinePartySummary,
  type QueuedOfflinePartySummary,
} from "./party-result";

export type QueuedOfflinePartyDraft = {
  party: QueuedOfflinePartySummary;
  queueItem: QueuedMutation;
};

export async function queueOfflinePartyDraft(
  scope: OfflineQueueScope,
  input: Record<string, unknown>,
): Promise<QueuedOfflinePartyDraft> {
  if (typeof window === "undefined") {
    throw new Error("Offline parties can only be queued in the installed browser app.");
  }
  const queue = browserQueue(scope);
  const queueItem = await queueHardwarePartyDraft(queue, { input });
  return {
    party: buildQueuedOfflinePartySummary(input, queueItem.id, queueItem.status),
    queueItem,
  };
}

export async function listQueuedOfflineParties(
  scope: OfflineQueueScope,
  role: "customer" | "supplier",
): Promise<QueuedOfflinePartySummary[]> {
  if (typeof window === "undefined") return [];
  const items = await browserQueue(scope).list();
  return items.flatMap((item) => {
    if (
      item.action !== "hardware.partyDraft.create"
      || item.status === "synced"
      || !item.payload.input
      || typeof item.payload.input !== "object"
      || Array.isArray(item.payload.input)
    ) {
      return [];
    }
    try {
      const party = buildQueuedOfflinePartySummary(
        item.payload.input as Record<string, unknown>,
        item.id,
        item.status,
      );
      return party.role === role ? [party] : [];
    } catch {
      return [];
    }
  });
}

function browserQueue(scope: OfflineQueueScope) {
  return new OfflineMutationQueue({
    scope,
    storage: new LocalStorageOfflineQueueStorage(window.localStorage),
  });
}

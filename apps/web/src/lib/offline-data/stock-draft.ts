import {
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  queueHardwareStockAdjustmentDraft,
  type OfflineQueueScope,
  type QueuedMutation,
} from "../offline-queue";
import {
  buildQueuedOfflineStockMovement,
  validateOfflineStockMovement,
  type OfflineStockDisplay,
  type QueuedOfflineStockMovement,
} from "./stock-result";

export type QueuedOfflineStockDraft = {
  movement: QueuedOfflineStockMovement;
  queueItem: QueuedMutation;
};

export async function queueOfflineStockMovement(
  scope: OfflineQueueScope,
  rawInput: Record<string, unknown>,
  expectedCurrentStock: number,
  display: OfflineStockDisplay = {},
): Promise<QueuedOfflineStockDraft> {
  if (typeof window === "undefined") {
    throw new Error("Offline stock movements can only be queued in the installed browser app.");
  }
  const validated = validateOfflineStockMovement(rawInput, expectedCurrentStock);
  const queue = browserQueue(scope);
  const queueItem = await queueHardwareStockAdjustmentDraft(queue, {
    display,
    expectedCurrentStock: validated.expectedCurrentStock,
    input: validated.input,
  });
  return {
    movement: buildQueuedOfflineStockMovement(
      validated.input,
      validated.expectedCurrentStock,
      queueItem.id,
      queueItem.createdAt,
      display,
      queueItem.status,
    ),
    queueItem,
  };
}

export async function listQueuedOfflineStockMovements(
  scope: OfflineQueueScope,
): Promise<QueuedOfflineStockMovement[]> {
  if (typeof window === "undefined") return [];
  const items = await browserQueue(scope).list();
  return items.flatMap((item) => {
    if (
      item.action !== "hardware.stockAdjustmentDraft.create"
      || item.status === "synced"
      || !item.payload.input
      || typeof item.payload.input !== "object"
      || Array.isArray(item.payload.input)
    ) {
      return [];
    }
    const display = item.payload.display && typeof item.payload.display === "object" && !Array.isArray(item.payload.display)
      ? item.payload.display as OfflineStockDisplay
      : {};
    try {
      return [buildQueuedOfflineStockMovement(
        item.payload.input as Record<string, unknown>,
        item.payload.expectedCurrentStock,
        item.id,
        item.createdAt,
        display,
        item.status,
      )];
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

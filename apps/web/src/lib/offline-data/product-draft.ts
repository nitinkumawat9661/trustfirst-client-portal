import {
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  queueHardwareProductDraft,
  type OfflineQueueScope,
  type QueuedMutation,
} from "../offline-queue";
import {
  buildQueuedOfflineProductSummary,
  catalogProductPayloadToOfflineInput,
  type OfflineProductDisplay,
  type QueuedOfflineProductSummary,
} from "./product-result";

export type QueuedOfflineProductDraft = {
  product: QueuedOfflineProductSummary;
  queueItem: QueuedMutation;
};

export async function queueOfflineCatalogProduct(
  scope: OfflineQueueScope,
  catalogPayload: Record<string, unknown>,
  display: OfflineProductDisplay = {},
): Promise<QueuedOfflineProductDraft> {
  if (typeof window === "undefined") {
    throw new Error("Offline products can only be queued in the installed browser app.");
  }
  const input = catalogProductPayloadToOfflineInput(catalogPayload);
  const queue = browserQueue(scope);
  const queueItem = await queueHardwareProductDraft(queue, { display, input });
  return {
    product: buildQueuedOfflineProductSummary(input, queueItem.id, display, queueItem.status),
    queueItem,
  };
}

export async function listQueuedOfflineProducts(
  scope: OfflineQueueScope,
): Promise<QueuedOfflineProductSummary[]> {
  if (typeof window === "undefined") return [];
  const items = await browserQueue(scope).list();
  return items.flatMap((item) => {
    if (
      item.action !== "hardware.productDraft.create"
      || item.status === "synced"
      || !item.payload.input
      || typeof item.payload.input !== "object"
      || Array.isArray(item.payload.input)
    ) {
      return [];
    }
    const display = item.payload.display && typeof item.payload.display === "object" && !Array.isArray(item.payload.display)
      ? item.payload.display as OfflineProductDisplay
      : {};
    try {
      return [buildQueuedOfflineProductSummary(
        item.payload.input as Record<string, unknown>,
        item.id,
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

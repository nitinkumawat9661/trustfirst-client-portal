import {
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  queueHardwareTradeDraft,
  type OfflineQueueScope,
  type QueuedMutation,
} from "../offline-queue";
import { IndexedDbOfflineDataStorage } from "./storage";
import type { OfflineNumberSeries } from "./types";

export type QueueReservedTradeDraftInput = {
  confirm?: boolean;
  input: Record<string, unknown>;
  locationId?: string | null;
  series: Exclude<OfflineNumberSeries, "HPR" | "HSR" | "MS/INV">;
};

export type QueuedReservedTradeDraft = {
  documentNumber: string;
  queueItem: QueuedMutation;
};

export async function queueReservedTradeDraft(
  scope: OfflineQueueScope,
  input: QueueReservedTradeDraftInput,
): Promise<QueuedReservedTradeDraft> {
  if (typeof window === "undefined") {
    throw new Error("Offline trade drafts can only be queued in the installed browser app.");
  }
  const dataStorage = new IndexedDbOfflineDataStorage();
  const reserved = await dataStorage.consumeNumber(scope, input.series);
  const queue = new OfflineMutationQueue({
    scope,
    storage: new LocalStorageOfflineQueueStorage(window.localStorage),
  });
  const queueItem = await queueHardwareTradeDraft(queue, {
    confirm: input.confirm ?? true,
    documentNumber: reserved.formattedNumber,
    input: input.input,
    leaseId: reserved.leaseId,
    leaseValue: reserved.value,
    locationId: input.locationId ?? null,
  });
  return { documentNumber: reserved.formattedNumber, queueItem };
}

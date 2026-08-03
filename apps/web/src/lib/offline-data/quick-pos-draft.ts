import {
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  queueHardwareQuickPosSale,
  type OfflineQueueScope,
  type QueuedMutation,
} from "../offline-queue";
import { IndexedDbOfflineDataStorage, type ConsumedOfflineNumber } from "./storage";

export type QueuedReservedQuickPosSale = {
  documentNumber: string;
  invoiceNumber: string;
  queueItem: QueuedMutation;
};

export async function queueReservedQuickPosSale(
  scope: OfflineQueueScope,
  input: Record<string, unknown>,
): Promise<QueuedReservedQuickPosSale> {
  if (typeof window === "undefined") {
    throw new Error("Offline counter sales can only be queued in the installed browser app.");
  }

  const dataStorage = new IndexedDbOfflineDataStorage();
  const consumed = await dataStorage.consumeNumbers(scope, ["HSO", "MS/INV"]);
  const trade = requiredNumber(consumed, "HSO");
  const invoice = requiredNumber(consumed, "MS/INV");
  const queue = new OfflineMutationQueue({
    scope,
    storage: new LocalStorageOfflineQueueStorage(window.localStorage),
  });

  try {
    const queueItem = await queueHardwareQuickPosSale(queue, {
      input,
      invoice: {
        invoiceNumber: invoice.formattedNumber,
        leaseId: invoice.leaseId,
        leaseValue: invoice.value,
      },
      trade: {
        documentNumber: trade.formattedNumber,
        leaseId: trade.leaseId,
        leaseValue: trade.value,
      },
    });
    return {
      documentNumber: trade.formattedNumber,
      invoiceNumber: invoice.formattedNumber,
      queueItem,
    };
  } catch (error) {
    await dataStorage.restoreNumbers(scope, consumed).catch(() => {
      // Preserve the queue persistence error. Lease ordering validation will
      // surface any failed local rollback before a later bill can sync.
    });
    throw error;
  }
}

function requiredNumber(consumed: ConsumedOfflineNumber[], series: "HSO" | "MS/INV") {
  const number = consumed.find((candidate) => candidate.series === series);
  if (!number) throw new Error(`Reserved ${series} number was not created.`);
  return number;
}

import {
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  queueHardwarePartyPaymentDraft,
  type OfflineQueueScope,
  type QueuedMutation,
} from "../offline-queue";
import { IndexedDbOfflineDataStorage } from "./storage";
import type { OfflineSnapshotFinancialPosition } from "./types";
import {
  buildQueuedOfflinePartyPayment,
  parseOfflinePaymentReceipt,
  validateOfflinePartyPayment,
  type OfflinePaymentDisplay,
  type OfflinePaymentExpectedTarget,
  type OfflinePaymentReceipt,
  type OfflinePaymentRole,
  type QueuedOfflinePartyPayment,
} from "./payment-result";

export type QueuedOfflinePaymentDraft = {
  payment: QueuedOfflinePartyPayment;
  queueItem: QueuedMutation;
};

export async function queueOfflinePartyPayment(
  scope: OfflineQueueScope,
  role: OfflinePaymentRole,
  rawInput: Record<string, unknown>,
  expectedTargets: OfflinePaymentExpectedTarget[],
  display: OfflinePaymentDisplay = {},
): Promise<QueuedOfflinePaymentDraft> {
  if (typeof window === "undefined") {
    throw new Error("Offline payments can only be queued in the installed browser app.");
  }
  const validated = validateOfflinePartyPayment(role, rawInput, expectedTargets);
  const queue = browserQueue(scope);
  const queueItem = await queueHardwarePartyPaymentDraft(queue, {
    display,
    expectedTargets: validated.expectedTargets,
    input: validated.input,
    role: validated.role,
  }, {
    conflict: {
      fingerprint: validated.expectedTargets
        .map((target) => `${target.targetTransactionId}:${target.dueCents}`)
        .sort()
        .join("|"),
      resolvedBy: "manual",
    },
  });
  return {
    payment: buildQueuedOfflinePartyPayment(
      validated,
      queueItem.id,
      queueItem.createdAt,
      display,
      queueItem.status,
      queueItem.error ?? null,
    ),
    queueItem,
  };
}

export async function listQueuedOfflinePartyPayments(
  scope: OfflineQueueScope,
  role?: OfflinePaymentRole,
): Promise<QueuedOfflinePartyPayment[]> {
  if (typeof window === "undefined") return [];
  const items = await browserQueue(scope).list();
  return items.flatMap((item) => {
    if (item.action !== "hardware.partyPaymentDraft.create") return [];
    const itemRole = item.payload.role;
    if ((itemRole !== "customer" && itemRole !== "supplier") || (role && itemRole !== role)) return [];
    const input = asRecord(item.payload.input);
    const display = asRecord(item.payload.display) as OfflinePaymentDisplay;
    try {
      const validated = validateOfflinePartyPayment(itemRole, input, item.payload.expectedTargets);
      return [buildQueuedOfflinePartyPayment(
        validated,
        item.id,
        item.createdAt,
        display,
        item.status,
        item.error ?? null,
      )];
    } catch {
      return [];
    }
  }).sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

export async function readOfflineFinancialPosition(
  scope: OfflineQueueScope,
  role: OfflinePaymentRole,
  partyId: string,
): Promise<OfflineSnapshotFinancialPosition | null> {
  const record = await new IndexedDbOfflineDataStorage().read(scope);
  const positions = role === "supplier"
    ? record?.snapshot.financialPositions?.suppliers
    : record?.snapshot.financialPositions?.customers;
  return positions?.find((position) => position.partyId === partyId) ?? null;
}

export async function readOfflinePaymentReceipt(
  scope: OfflineQueueScope,
  queueItemId: string,
): Promise<OfflinePaymentReceipt | null> {
  if (typeof window === "undefined" || !navigator.onLine) return null;
  const record = await new IndexedDbOfflineDataStorage().read(scope);
  if (!record) return null;
  const response = await fetch(
    `/api/offline/receipts/${encodeURIComponent(queueItemId)}?deviceId=${encodeURIComponent(record.enrollment.deviceId)}`,
    { credentials: "same-origin", headers: { accept: "application/json" } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const envelope = await response.json() as { data?: { result?: unknown }; ok?: boolean };
  if (!envelope.ok) return null;
  return parseOfflinePaymentReceipt(envelope.data?.result);
}

function browserQueue(scope: OfflineQueueScope) {
  return new OfflineMutationQueue({
    scope,
    storage: new LocalStorageOfflineQueueStorage(window.localStorage),
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function readErrorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: { message?: unknown } };
    return typeof body.error?.message === "string" && body.error.message.trim()
      ? body.error.message.trim()
      : "Synced payment receipt could not be loaded.";
  } catch {
    return "Synced payment receipt could not be loaded.";
  }
}

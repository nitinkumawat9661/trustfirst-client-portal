import { assertAllowedAction, sanitizeQueuedPayload, scopedOfflineQueueKey } from "./security";
import type {
  OfflineQueueScope,
  OfflineQueueStorage,
  QueueAddInput,
  QueueSnapshot,
  QueuedMutation,
  ConflictDetectionContract,
  RetryPolicy,
} from "./types";

export const defaultRetryPolicy: RetryPolicy = {
  baseDelayMs: 5_000,
  maxAttempts: 5,
  maxDelayMs: 5 * 60_000,
};

type OfflineQueueOptions = {
  idFactory?: () => string;
  now?: () => Date;
  retryPolicy?: RetryPolicy;
  scope: OfflineQueueScope;
  storage: OfflineQueueStorage;
};

export class OfflineMutationQueue {
  private readonly idFactory: () => string;
  private readonly now: () => Date;
  private readonly retryPolicy: RetryPolicy;
  readonly scopedKey: string;

  constructor(private readonly options: OfflineQueueOptions) {
    this.idFactory = options.idFactory ?? randomId;
    this.now = options.now ?? (() => new Date());
    this.retryPolicy = options.retryPolicy ?? defaultRetryPolicy;
    this.scopedKey = scopedOfflineQueueKey(options.scope);
  }

  async add(input: QueueAddInput) {
    assertAllowedAction(input.action);
    const items = await this.readOrdered();
    const timestamp = this.now().toISOString();
    const item = cleanQueueItem({
      action: input.action,
      attemptCount: 0,
      conflict: input.conflict,
      createdAt: timestamp,
      id: this.idFactory(),
      idempotencyKey: this.idFactory(),
      module: "hardware",
      payload: sanitizeQueuedPayload(input.payload),
      sequence: nextSequence(items),
      status: "pending",
      tenantId: this.options.scope.tenantId,
      updatedAt: timestamp,
      userId: this.options.scope.userId,
    });
    await this.write([...items, item]);
    return item;
  }

  async list() {
    return this.readOrdered();
  }

  async readyItems() {
    const now = this.now().getTime();
    return (await this.readOrdered()).filter((item) => {
      if (item.status !== "pending") return false;
      if (!item.retryAfterAt) return true;
      return new Date(item.retryAfterAt).getTime() <= now;
    });
  }

  async markSyncing(id: string) {
    await this.update(id, (item) => ({ ...item, status: "syncing", updatedAt: this.now().toISOString() }));
  }

  async markSynced(id: string) {
    await this.update(id, (item) => cleanQueueItem({ ...item, error: undefined, status: "synced", updatedAt: this.now().toISOString() }));
  }

  async markFailed(id: string, error: string, retryable: boolean, conflict?: ConflictDetectionContract) {
    await this.update(id, (item) => {
      const attemptCount = item.attemptCount + 1;
      return cleanQueueItem({
        ...item,
        attemptCount,
        conflict: conflict ?? item.conflict,
        error,
        retryAfterAt: retryable && attemptCount < this.retryPolicy.maxAttempts
          ? new Date(this.now().getTime() + retryDelay(this.retryPolicy, attemptCount)).toISOString()
          : undefined,
        status: "failed",
        updatedAt: this.now().toISOString(),
      });
    });
  }

  async retryFailed(id: string) {
    await this.update(id, (item) => cleanQueueItem({ ...item, error: undefined, retryAfterAt: undefined, status: "pending", updatedAt: this.now().toISOString() }));
  }

  async clearFailed(id: string) {
    const items = await this.readOrdered();
    await this.write(items.filter((item) => item.id !== id || item.status !== "failed"));
  }

  async snapshot(): Promise<QueueSnapshot> {
    const items = await this.readOrdered();
    return {
      failed: items.filter((item) => item.status === "failed").length,
      pending: items.filter((item) => item.status === "pending").length,
      scopedKey: this.scopedKey,
      synced: items.filter((item) => item.status === "synced").length,
      syncing: items.filter((item) => item.status === "syncing").length,
      total: items.length,
    };
  }

  private async update(id: string, updater: (item: QueuedMutation) => QueuedMutation) {
    const items = await this.readOrdered();
    await this.write(items.map((item) => (item.id === id ? sanitizeQueueItem(updater(item), this.options.scope) : item)));
  }

  private async readOrdered() {
    const items = await this.options.storage.read(this.scopedKey);
    return items
      .filter((item) => item.tenantId === this.options.scope.tenantId && item.userId === this.options.scope.userId)
      .map((item) => sanitizeQueueItem(item, this.options.scope))
      .sort((a, b) => a.sequence - b.sequence || a.createdAt.localeCompare(b.createdAt));
  }

  private async write(items: QueuedMutation[]) {
    await this.options.storage.write(this.scopedKey, items.map((item) => sanitizeQueueItem(item, this.options.scope)));
  }
}

export function retryDelay(policy: RetryPolicy, attemptCount: number) {
  return Math.min(policy.baseDelayMs * 2 ** Math.max(attemptCount - 1, 0), policy.maxDelayMs);
}

function sanitizeQueueItem(item: QueuedMutation, scope: OfflineQueueScope): QueuedMutation {
  return {
    ...item,
    payload: sanitizeQueuedPayload(item.payload),
    tenantId: scope.tenantId,
    userId: scope.userId,
  };
}

function nextSequence(items: QueuedMutation[]) {
  return items.reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type QueueItemWithOptionalUndefined = Omit<QueuedMutation, "conflict" | "error" | "retryAfterAt"> & {
  conflict?: ConflictDetectionContract | undefined;
  error?: string | undefined;
  retryAfterAt?: string | undefined;
};

function cleanQueueItem(value: QueueItemWithOptionalUndefined): QueuedMutation {
  const clean = { ...value };
  if (clean.conflict === undefined) delete clean.conflict;
  if (clean.error === undefined) delete clean.error;
  if (clean.retryAfterAt === undefined) delete clean.retryAfterAt;
  return clean as QueuedMutation;
}

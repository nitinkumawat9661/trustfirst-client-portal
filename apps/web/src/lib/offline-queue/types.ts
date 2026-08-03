export type OfflineQueueScope = {
  tenantId: string;
  userId: string;
};

export type HardwareOfflineAction =
  | "hardware.tradeDraft.create"
  | "hardware.saleDraft.create"
  | "hardware.purchaseDraft.create"
  | "hardware.customerDraft.create"
  | "hardware.productDraft.create"
  | "hardware.stockAdjustmentDraft.create"
  | "hardware.manualPaymentDraft.create";

export type QueuedMutationAction = HardwareOfflineAction;

export type QueuedMutationStatus = "pending" | "syncing" | "failed" | "synced";

export type ConflictDetectionContract = {
  expectedVersion?: string;
  fingerprint?: string;
  resolvedBy: "manual" | "server" | "client";
  serverVersion?: string;
};

export type RetryPolicy = {
  baseDelayMs: number;
  maxAttempts: number;
  maxDelayMs: number;
};

export type QueuedMutation = {
  id: string;
  action: QueuedMutationAction;
  attemptCount: number;
  conflict?: ConflictDetectionContract;
  createdAt: string;
  error?: string;
  idempotencyKey: string;
  module: "hardware";
  payload: Record<string, unknown>;
  retryAfterAt?: string;
  sequence: number;
  status: QueuedMutationStatus;
  tenantId: string;
  updatedAt: string;
  userId: string;
};

export type QueueAddInput = {
  action: QueuedMutationAction;
  conflict?: ConflictDetectionContract;
  payload: Record<string, unknown>;
};

export type QueueSnapshot = {
  failed: number;
  pending: number;
  scopedKey: string;
  syncing: number;
  synced: number;
  total: number;
};

export type SyncResult =
  | { ok: true }
  | { conflict: ConflictDetectionContract; error: string; ok: false; retryable: false }
  | { error: string; ok: false; retryable: boolean };

export type QueuedMutationExecutor = (item: QueuedMutation) => Promise<SyncResult>;

export type OfflineQueueStorage = {
  read(scopeKey: string): Promise<QueuedMutation[]>;
  write(scopeKey: string, items: QueuedMutation[]): Promise<void>;
};

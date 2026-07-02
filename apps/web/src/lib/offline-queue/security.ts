import type { OfflineQueueScope, QueuedMutationAction } from "./types";

const forbiddenPayloadKeys = [
  "authorization",
  "cookie",
  "password",
  "refreshToken",
  "secret",
  "session",
  "token",
];

const allowedActions = new Set<QueuedMutationAction>([
  "hardware.saleDraft.create",
  "hardware.purchaseDraft.create",
  "hardware.customerDraft.create",
  "hardware.productDraft.create",
  "hardware.stockAdjustmentDraft.create",
  "hardware.manualPaymentDraft.create",
]);

export function assertAllowedAction(action: QueuedMutationAction) {
  if (!allowedActions.has(action)) {
    throw new Error(`Unsupported offline action: ${action}`);
  }
}

export function scopedOfflineQueueKey(scope: OfflineQueueScope) {
  return `trustfirst.offlineQueue.v1.${safeScopeSegment(scope.tenantId)}.${safeScopeSegment(scope.userId)}`;
}

export function sanitizeQueuedPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return sanitizeRecord(payload);
}

function sanitizeRecord(payload: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (isForbiddenKey(key) || value === undefined || typeof value === "function" || typeof value === "symbol") {
      continue;
    }

    if (isFileLike(value)) {
      continue;
    }

    if (Array.isArray(value)) {
      clean[key] = value
        .map((entry) => sanitizeValue(entry))
        .filter((entry) => entry !== undefined);
      continue;
    }

    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) {
      clean[key] = sanitized;
    }
  }

  return clean;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry)).filter((entry) => entry !== undefined);
  }

  if (typeof value === "object" && value && !isFileLike(value)) {
    return sanitizeRecord(value as Record<string, unknown>);
  }

  return undefined;
}

function isForbiddenKey(key: string) {
  const normalized = key.toLowerCase();
  return forbiddenPayloadKeys.some((forbidden) => normalized.includes(forbidden.toLowerCase()));
}

function isFileLike(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { arrayBuffer?: unknown; stream?: unknown };
  return typeof candidate.arrayBuffer === "function" || typeof candidate.stream === "function";
}

function safeScopeSegment(value: string) {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!sanitized) throw new Error("Offline queue scope cannot be empty.");
  return sanitized.slice(0, 120);
}

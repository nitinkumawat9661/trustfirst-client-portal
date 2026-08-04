import type { QueuedMutationStatus } from "../offline-queue";

export const offlinePaymentModes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"] as const;

export type OfflinePaymentRole = "customer" | "supplier";
export type OfflinePaymentMode = typeof offlinePaymentModes[number];

export type OfflinePaymentAllocation = {
  amountCents: number;
  targetTransactionId: string;
};

export type OfflinePaymentExpectedTarget = {
  documentNumber?: string;
  dueCents: number;
  targetTransactionId: string;
};

export type OfflinePaymentDisplay = {
  documentNumbers?: string[];
  partyName?: string;
};

export type ValidatedOfflinePayment = {
  expectedTargets: OfflinePaymentExpectedTarget[];
  input: {
    allocations: OfflinePaymentAllocation[];
    amountCents: number;
    excessAsAdvance: boolean;
    idempotencyKey: string;
    mode: OfflinePaymentMode;
    notes?: string;
    partyId: string;
    reference?: string;
  };
  role: OfflinePaymentRole;
};

export type QueuedOfflinePartyPayment = {
  advanceCents: number;
  allocatedCents: number;
  amountCents: number;
  documentNumbers: string[];
  error: string | null;
  id: string;
  occurredAt: Date;
  offlineQueued: true;
  partyId: string;
  partyName: string;
  queueItemId: string;
  queueStatus: QueuedMutationStatus;
  role: OfflinePaymentRole;
};

export type OfflinePaymentReceipt = {
  advanceCents: number;
  advanceTransactionId: string | null;
  allocatedCents: number;
  amountCents: number;
  occurredAt: string;
  partyId: string;
  partyName: string;
  paymentTransactionId: string | null;
  printTransactionId: string | null;
  receiptNumber: string | null;
  role: OfflinePaymentRole;
};

export function validateOfflinePartyPayment(
  role: unknown,
  rawInput: Record<string, unknown>,
  rawExpectedTargets: unknown,
): ValidatedOfflinePayment {
  if (role !== "customer" && role !== "supplier") {
    throw new Error("Payment role must be customer or supplier.");
  }
  const allocations = readAllocations(rawInput.allocations);
  const expectedTargets = readExpectedTargets(rawExpectedTargets);
  const allocationIds = allocations.map((allocation) => allocation.targetTransactionId);
  const expectedIds = expectedTargets.map((target) => target.targetTransactionId);
  if (new Set(allocationIds).size !== allocationIds.length) {
    throw new Error("The same invoice or bill cannot be allocated more than once.");
  }
  if (new Set(expectedIds).size !== expectedIds.length) {
    throw new Error("Expected payment targets contain duplicates.");
  }
  if (
    allocationIds.length !== expectedIds.length
    || allocationIds.some((id) => !expectedIds.includes(id))
  ) {
    throw new Error("Every payment allocation requires its expected outstanding balance.");
  }
  const expectedById = new Map(expectedTargets.map((target) => [target.targetTransactionId, target]));
  for (const allocation of allocations) {
    const target = expectedById.get(allocation.targetTransactionId);
    if (!target || allocation.amountCents > target.dueCents) {
      throw new Error(`Allocation for ${target?.documentNumber ?? "the selected document"} exceeds its saved outstanding balance.`);
    }
  }

  const amountCents = readPositiveInteger(rawInput.amountCents, "Payment amount");
  const allocationTotal = allocations.reduce((total, allocation) => total + allocation.amountCents, 0);
  if (allocationTotal > amountCents) {
    throw new Error("Allocation total cannot exceed the payment amount.");
  }
  const excessAsAdvance = rawInput.excessAsAdvance === true;
  if (amountCents > allocationTotal && !excessAsAdvance) {
    throw new Error("Confirm the unallocated amount as advance before saving.");
  }
  const partyId = readText(rawInput.partyId);
  if (!partyId) throw new Error("Select a synced customer or supplier.");
  const mode = readPaymentMode(rawInput.mode);
  const idempotencyKey = readText(rawInput.idempotencyKey);
  if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 120) {
    throw new Error("Payment identity is invalid. Reopen the payment form and retry.");
  }
  const notes = readOptionalText(rawInput.notes, 1000, "Payment notes");
  const reference = readOptionalText(rawInput.reference, 120, "Payment reference");

  return {
    expectedTargets,
    input: {
      allocations,
      amountCents,
      excessAsAdvance,
      idempotencyKey,
      mode,
      ...(notes ? { notes } : {}),
      partyId,
      ...(reference ? { reference } : {}),
    },
    role,
  };
}

export function buildQueuedOfflinePartyPayment(
  validated: ValidatedOfflinePayment,
  queueItemId: string,
  createdAt: string,
  display: OfflinePaymentDisplay = {},
  queueStatus: QueuedMutationStatus = "pending",
  error: string | null = null,
): QueuedOfflinePartyPayment {
  const allocatedCents = validated.input.allocations.reduce((total, allocation) => total + allocation.amountCents, 0);
  return {
    advanceCents: validated.input.amountCents - allocatedCents,
    allocatedCents,
    amountCents: validated.input.amountCents,
    documentNumbers: cleanDocumentNumbers(display.documentNumbers ?? validated.expectedTargets.map((target) => target.documentNumber ?? "")),
    error,
    id: `offline-payment:${queueItemId}`,
    occurredAt: new Date(createdAt),
    offlineQueued: true,
    partyId: validated.input.partyId,
    partyName: readText(display.partyName) ?? (validated.role === "supplier" ? "Supplier" : "Customer"),
    queueItemId,
    queueStatus,
    role: validated.role,
  };
}

export function parseOfflinePaymentReceipt(value: unknown): OfflinePaymentReceipt | null {
  const record = asRecord(value);
  const role = record.role;
  if (role !== "customer" && role !== "supplier") return null;
  const amountCents = readIntegerOrNull(record.amountCents);
  const allocatedCents = readIntegerOrNull(record.allocatedCents);
  const advanceCents = readIntegerOrNull(record.advanceCents);
  const occurredAt = readText(record.occurredAt);
  const partyId = readText(record.partyId);
  const partyName = readText(record.partyName);
  if (
    amountCents === null || amountCents <= 0
    || allocatedCents === null || allocatedCents < 0
    || advanceCents === null || advanceCents < 0
    || !occurredAt || !partyId || !partyName
  ) {
    return null;
  }
  return {
    advanceCents,
    advanceTransactionId: readNullableText(record.advanceTransactionId),
    allocatedCents,
    amountCents,
    occurredAt,
    partyId,
    partyName,
    paymentTransactionId: readNullableText(record.paymentTransactionId),
    printTransactionId: readNullableText(record.printTransactionId),
    receiptNumber: readNullableText(record.receiptNumber),
    role,
  };
}

function readAllocations(value: unknown): OfflinePaymentAllocation[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("Payment allocations are invalid.");
  }
  return value.map((entry) => {
    const record = asRecord(entry);
    const targetTransactionId = readText(record.targetTransactionId);
    if (!targetTransactionId) throw new Error("Payment allocation target is missing.");
    return {
      amountCents: readPositiveInteger(record.amountCents, "Allocation amount"),
      targetTransactionId,
    };
  });
}

function readExpectedTargets(value: unknown): OfflinePaymentExpectedTarget[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("Expected payment targets are invalid.");
  }
  return value.map((entry) => {
    const record = asRecord(entry);
    const targetTransactionId = readText(record.targetTransactionId);
    if (!targetTransactionId) throw new Error("Expected payment target is missing.");
    const documentNumber = readText(record.documentNumber);
    return {
      ...(documentNumber ? { documentNumber } : {}),
      dueCents: readPositiveInteger(record.dueCents, "Expected outstanding amount"),
      targetTransactionId,
    };
  });
}

function readPaymentMode(value: unknown): OfflinePaymentMode {
  if (typeof value !== "string" || !offlinePaymentModes.includes(value as OfflinePaymentMode)) {
    throw new Error("Select a valid payment mode.");
  }
  return value as OfflinePaymentMode;
}

function readPositiveInteger(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number of paise.`);
  }
  return value;
}

function readIntegerOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function readOptionalText(value: unknown, maxLength: number, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) throw new Error(`${label} is too long.`);
  return normalized;
}

function cleanDocumentNumbers(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 100);
}

function readNullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  return readText(value);
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

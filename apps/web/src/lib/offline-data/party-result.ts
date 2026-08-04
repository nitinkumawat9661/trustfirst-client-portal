import type { QueuedMutationStatus } from "../offline-queue";

export type OfflinePartyDraftInput = {
  address?: string;
  balanceDirection?: "DR" | "CR";
  gstin?: string;
  mobile?: string;
  name: string;
  openingBalanceCents?: number;
  role: "customer" | "supplier";
};

export type QueuedOfflinePartySummary = {
  balanceSide: "DR" | "CR" | null;
  contact: string | null;
  currentBalanceCents: number;
  gstin: string | null;
  id: string;
  name: string;
  offlineQueued: true;
  openingBalanceCents: number;
  queueItemId: string;
  queueStatus: QueuedMutationStatus;
  role: "customer" | "supplier";
};

export function buildQueuedOfflinePartySummary(
  rawInput: Record<string, unknown>,
  queueItemId: string,
  queueStatus: QueuedMutationStatus = "pending",
): QueuedOfflinePartySummary {
  const input = validateOfflinePartyInput(rawInput);
  const signedOpening = signedOpeningBalance(input);
  return {
    balanceSide: balanceSideFor(input.role, signedOpening),
    contact: normalizeMobile(input.mobile),
    currentBalanceCents: signedOpening,
    gstin: input.gstin?.trim().toUpperCase() || null,
    id: `offline-party:${queueItemId}`,
    name: input.name.trim(),
    offlineQueued: true,
    openingBalanceCents: signedOpening,
    queueItemId,
    queueStatus,
    role: input.role,
  };
}

export function validateOfflinePartyInput(rawInput: Record<string, unknown>): OfflinePartyDraftInput {
  const name = typeof rawInput.name === "string" ? rawInput.name.trim() : "";
  if (name.length < 2 || name.length > 240) {
    throw new Error("Party name must be between 2 and 240 characters.");
  }
  const role = rawInput.role;
  if (role !== "customer" && role !== "supplier") {
    throw new Error("Party role must be customer or supplier.");
  }
  const openingBalanceCents = rawInput.openingBalanceCents;
  if (
    openingBalanceCents !== undefined
    && (!Number.isInteger(openingBalanceCents) || Number(openingBalanceCents) < 0)
  ) {
    throw new Error("Opening balance must be a non-negative whole number of paise.");
  }
  const balanceDirection = rawInput.balanceDirection;
  if (
    balanceDirection !== undefined
    && balanceDirection !== "DR"
    && balanceDirection !== "CR"
  ) {
    throw new Error("Opening balance direction must be DR or CR.");
  }
  if (Number(openingBalanceCents ?? 0) > 0 && !balanceDirection) {
    throw new Error("Opening balance direction is required when an opening balance is provided.");
  }
  const gstin = optionalText(rawInput.gstin, 15);
  if (gstin && !/^[0-9A-Z]{15}$/u.test(gstin.toUpperCase())) {
    throw new Error("GSTIN must be 15 uppercase letters or digits.");
  }
  return {
    ...(optionalText(rawInput.address, 500) ? { address: optionalText(rawInput.address, 500) as string } : {}),
    ...(balanceDirection ? { balanceDirection } : {}),
    ...(gstin ? { gstin: gstin.toUpperCase() } : {}),
    ...(optionalText(rawInput.mobile, 30) ? { mobile: optionalText(rawInput.mobile, 30) as string } : {}),
    name,
    ...(openingBalanceCents === undefined ? {} : { openingBalanceCents: Number(openingBalanceCents) }),
    role,
  };
}

function signedOpeningBalance(input: OfflinePartyDraftInput) {
  const amount = input.openingBalanceCents ?? 0;
  if (amount === 0) return 0;
  return input.balanceDirection === "CR" ? -amount : amount;
}

function balanceSideFor(role: "customer" | "supplier", value: number): "DR" | "CR" | null {
  if (value === 0) return null;
  return role === "supplier"
    ? value > 0 ? "CR" : "DR"
    : value > 0 ? "DR" : "CR";
}

function normalizeMobile(value: string | undefined) {
  const digits = value?.replace(/\D+/gu, "") ?? "";
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Party text fields must be strings.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`Party field cannot exceed ${maxLength} characters.`);
  return normalized || null;
}

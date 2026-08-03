import type { OfflineMutationQueue } from "./queue";
import type { ConflictDetectionContract } from "./types";

type HardwareDraftOptions = {
  conflict?: ConflictDetectionContract;
};

export function queueHardwareTradeDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.tradeDraft.create", payload }, options));
}

export function queueHardwareQuickPosSale(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.quickPosSale.create", payload }, options));
}

export function queueHardwareSaleDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.saleDraft.create", payload }, options));
}

export function queueHardwarePurchaseDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.purchaseDraft.create", payload }, options));
}

export function queueHardwareCustomerDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.customerDraft.create", payload }, options));
}

export function queueHardwareProductDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.productDraft.create", payload }, options));
}

export function queueHardwareStockAdjustmentDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.stockAdjustmentDraft.create", payload }, options));
}

export function queueHardwareManualPaymentDraft(
  queue: OfflineMutationQueue,
  payload: Record<string, unknown>,
  options: HardwareDraftOptions = {},
) {
  return queue.add(withConflict({ action: "hardware.manualPaymentDraft.create", payload }, options));
}

function withConflict(
  input: { action: Parameters<OfflineMutationQueue["add"]>[0]["action"]; payload: Record<string, unknown> },
  options: HardwareDraftOptions,
) {
  return options.conflict ? { ...input, conflict: options.conflict } : input;
}

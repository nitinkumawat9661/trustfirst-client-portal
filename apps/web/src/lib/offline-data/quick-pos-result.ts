export type QueuedQuickPosNumbers = {
  documentNumber: string;
  invoiceNumber: string;
  queueItemId: string;
};

export type QueuedQuickPosResult = {
  documentId: string;
  documentNumber: string;
  invoiceId: null;
  invoiceNumber: string;
  offlineQueued: true;
  paymentStatus: "paid" | "partial" | "unpaid";
  totalCents: number;
};

export function buildQueuedQuickPosResult(
  input: Record<string, unknown>,
  numbers: QueuedQuickPosNumbers,
): QueuedQuickPosResult {
  const totalCents = readNonNegativeInteger(input.clientTotalCents);
  const paidAmountCents = readNonNegativeInteger(input.paidAmountCents) ?? 0;
  if (totalCents === null) throw new Error("Counter sale total is invalid.");
  if (paidAmountCents > totalCents) throw new Error("Paid amount cannot exceed bill total.");
  if (!numbers.documentNumber.trim() || !numbers.invoiceNumber.trim() || !numbers.queueItemId.trim()) {
    throw new Error("Reserved counter-sale numbers are incomplete.");
  }

  return {
    documentId: numbers.queueItemId,
    documentNumber: numbers.documentNumber,
    invoiceId: null,
    invoiceNumber: numbers.invoiceNumber,
    offlineQueued: true,
    paymentStatus: paidAmountCents >= totalCents
      ? "paid"
      : paidAmountCents > 0
        ? "partial"
        : "unpaid",
    totalCents,
  };
}

function readNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

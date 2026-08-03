import { describe, expect, it } from "vitest";
import { buildQueuedQuickPosResult } from "./quick-pos-result";

const numbers = {
  documentNumber: "HSO-2026-0201",
  invoiceNumber: "MS/INV/2026-27/00301",
  queueItemId: "queue-pos-1",
};

describe("queued Quick POS result", () => {
  it.each([
    [0, "unpaid"],
    [2500, "partial"],
    [5000, "paid"],
  ] as const)("maps paid amount %s to %s", (paidAmountCents, paymentStatus) => {
    expect(buildQueuedQuickPosResult({
      clientTotalCents: 5000,
      paidAmountCents,
    }, numbers)).toEqual({
      documentId: "queue-pos-1",
      documentNumber: "HSO-2026-0201",
      invoiceId: null,
      invoiceNumber: "MS/INV/2026-27/00301",
      offlineQueued: true,
      paymentStatus,
      totalCents: 5000,
    });
  });

  it("rejects a paid amount above the queued bill total", () => {
    expect(() => buildQueuedQuickPosResult({
      clientTotalCents: 5000,
      paidAmountCents: 5001,
    }, numbers)).toThrow("Paid amount cannot exceed bill total");
  });
});

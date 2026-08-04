import { describe, expect, it } from "vitest";
import type { QueuedOfflinePartyPayment } from "../../lib/offline-data";
import type { PartyFinancialPosition } from "@/server/hardware";
import { buildExpectedPaymentTargets, mergeQueuedPaymentRows } from "./hardware-payment-workbench";

const position: PartyFinancialPosition = {
  advanceBalanceCents: 0,
  openItems: [{
    documentNumber: "HSO-1",
    dueCents: 5_000,
    hardwareDocumentId: "document-1",
    invoiceId: "invoice-1",
    invoiceNumber: "MS/INV/1",
    occurredAt: new Date("2026-08-04T06:00:00.000Z"),
    originalCents: 6_000,
    paidCents: 1_000,
    sourceId: "sale-1",
    targetTransactionId: "target-1",
  }],
  partyId: "customer-1",
  partyName: "A Customer",
  refundableBalanceCents: 0,
  totalOutstandingCents: 5_000,
};

function queued(id: string, amountCents: number): QueuedOfflinePartyPayment {
  return {
    advanceCents: 0,
    allocatedCents: amountCents,
    amountCents,
    documentNumbers: ["MS/INV/1"],
    error: null,
    id: `offline-payment:${id}`,
    occurredAt: new Date(`2026-08-04T06:${id === "one" ? "10" : "20"}:00.000Z`),
    offlineQueued: true,
    partyId: "customer-1",
    partyName: "A Customer",
    queueItemId: id,
    queueStatus: "pending",
    role: "customer",
  };
}

describe("hardware payment offline helpers", () => {
  it("pins each allocation to the exact loaded due amount and document number", () => {
    expect(buildExpectedPaymentTargets(position, [{
      amountCents: 2_500,
      targetTransactionId: "target-1",
    }])).toEqual([{
      documentNumber: "MS/INV/1",
      dueCents: 5_000,
      targetTransactionId: "target-1",
    }]);
  });

  it("preserves multiple queued payments and replaces only the matching queue item", () => {
    const first = queued("one", 1_000);
    const second = queued("two", 2_000);
    const updatedFirst = { ...first, amountCents: 1_500, allocatedCents: 1_500, queueStatus: "syncing" as const };
    expect(mergeQueuedPaymentRows([first, second], [updatedFirst])).toEqual([
      second,
      updatedFirst,
    ]);
  });
});

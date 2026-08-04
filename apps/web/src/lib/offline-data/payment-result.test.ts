import { describe, expect, it } from "vitest";
import {
  buildQueuedOfflinePartyPayment,
  parseOfflinePaymentReceipt,
  validateOfflinePartyPayment,
} from "./payment-result";

const input = {
  allocations: [{ amountCents: 2_500, targetTransactionId: "target-1" }],
  amountCents: 3_000,
  excessAsAdvance: true,
  idempotencyKey: "offline-customer-payment-123",
  mode: "CASH",
  partyId: "customer-1",
};
const targets = [{ documentNumber: "MS/INV/1", dueCents: 5_000, targetTransactionId: "target-1" }];

describe("offline payment result", () => {
  it("validates allocation and advance values against the saved due target", () => {
    const validated = validateOfflinePartyPayment("customer", input, targets);
    const queued = buildQueuedOfflinePartyPayment(
      validated,
      "queue-payment-1",
      "2026-08-04T06:30:00.000Z",
      { partyName: "A Customer" },
    );
    expect(queued).toMatchObject({
      advanceCents: 500,
      allocatedCents: 2_500,
      amountCents: 3_000,
      documentNumbers: ["MS/INV/1"],
      partyName: "A Customer",
      queueStatus: "pending",
      role: "customer",
    });
  });

  it("rejects an allocation above its saved outstanding balance", () => {
    expect(() => validateOfflinePartyPayment("customer", {
      ...input,
      allocations: [{ amountCents: 5_001, targetTransactionId: "target-1" }],
      amountCents: 5_001,
    }, targets)).toThrow("exceeds its saved outstanding balance");
  });

  it("rejects duplicate targets and unconfirmed excess", () => {
    expect(() => validateOfflinePartyPayment("customer", {
      ...input,
      allocations: [
        { amountCents: 1_000, targetTransactionId: "target-1" },
        { amountCents: 1_000, targetTransactionId: "target-1" },
      ],
    }, [targets[0], targets[0]])).toThrow("cannot be allocated more than once");
    expect(() => validateOfflinePartyPayment("supplier", {
      ...input,
      allocations: [],
      amountCents: 1_000,
      excessAsAdvance: false,
      partyId: "supplier-1",
    }, [])).toThrow("Confirm the unallocated amount as advance");
  });

  it("parses the authoritative server receipt after sync", () => {
    expect(parseOfflinePaymentReceipt({
      advanceCents: 500,
      advanceTransactionId: "advance-1",
      allocatedCents: 2_500,
      amountCents: 3_000,
      occurredAt: "2026-08-04T06:31:00.000Z",
      partyId: "customer-1",
      partyName: "A Customer",
      paymentTransactionId: "payment-1",
      printTransactionId: "payment-1",
      receiptNumber: "MS/REC/1",
      role: "customer",
    })).toMatchObject({ printTransactionId: "payment-1", receiptNumber: "MS/REC/1" });
    expect(parseOfflinePaymentReceipt({ amountCents: 0, role: "customer" })).toBeNull();
  });
});

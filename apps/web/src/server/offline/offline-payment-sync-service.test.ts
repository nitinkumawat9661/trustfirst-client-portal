import { PaymentMode } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { offlinePaymentSyncTestUtils } from "./offline-payment-sync-service";

const basePayment = {
  allocations: [{ amountCents: 2_500, targetTransactionId: "target-1" }],
  amountCents: 2_500,
  excessAsAdvance: false,
  idempotencyKey: "manual-customer-test-123",
  mode: PaymentMode.CASH,
  partyId: "customer-1",
};

describe("offline payment sync helpers", () => {
  it("requires an expected due balance for every queued allocation", () => {
    expect(() => offlinePaymentSyncTestUtils.validatePaymentShape(basePayment, [])).toThrow(
      "Every queued payment allocation requires its expected outstanding balance",
    );
    expect(() => offlinePaymentSyncTestUtils.validatePaymentShape(basePayment, [{
      dueCents: 5_000,
      targetTransactionId: "target-1",
    }])).not.toThrow();
  });

  it("rejects duplicate allocation targets", () => {
    expect(() => offlinePaymentSyncTestUtils.validatePaymentShape({
      ...basePayment,
      allocations: [
        { amountCents: 1_000, targetTransactionId: "target-1" },
        { amountCents: 1_500, targetTransactionId: "target-1" },
      ],
    }, [
      { dueCents: 5_000, targetTransactionId: "target-1" },
      { dueCents: 5_000, targetTransactionId: "target-1" },
    ])).toThrow("same invoice or bill cannot be allocated more than once");
  });

  it("requires explicit advance confirmation for unallocated excess", () => {
    expect(() => offlinePaymentSyncTestUtils.validatePaymentShape({
      ...basePayment,
      amountCents: 3_000,
    }, [{ dueCents: 5_000, targetTransactionId: "target-1" }])).toThrow(
      "Confirm excess amount as advance",
    );
    expect(() => offlinePaymentSyncTestUtils.validatePaymentShape({
      ...basePayment,
      amountCents: 3_000,
      excessAsAdvance: true,
    }, [{ dueCents: 5_000, targetTransactionId: "target-1" }])).not.toThrow();
  });

  it("allows a confirmed pure advance without allocation targets", () => {
    expect(() => offlinePaymentSyncTestUtils.validatePaymentShape({
      ...basePayment,
      allocations: [],
      amountCents: 1_000,
      excessAsAdvance: true,
    }, [])).not.toThrow();
  });

  it("serializes queue-item and idempotency identities before receipt checks", () => {
    expect(offlinePaymentSyncTestUtils.paymentIdentityLockKeys({
      id: "device-1",
      tenantId: "tenant-1",
    }, "queue-payment-1", "payment-idempotency-123")).toEqual([
      "offline-payment:tenant-1:device-1:idempotency:payment-idempotency-123",
      "offline-payment:tenant-1:device-1:item:queue-payment-1",
    ]);
  });
});

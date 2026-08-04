import { describe, expect, it } from "vitest";
import { buildQueuedOfflinePartySummary, validateOfflinePartyInput } from "./party-result";

describe("queued offline party summaries", () => {
  it("builds a customer row with normalized mobile, GSTIN and debit opening balance", () => {
    expect(buildQueuedOfflinePartySummary({
      balanceDirection: "DR",
      gstin: "08abcde1234f1z5",
      mobile: "+91 98765-43210",
      name: "  Test Customer  ",
      openingBalanceCents: 2500,
      role: "customer",
    }, "queue-1")).toEqual({
      balanceSide: "DR",
      contact: "9876543210",
      currentBalanceCents: 2500,
      gstin: "08ABCDE1234F1Z5",
      id: "offline-party:queue-1",
      name: "Test Customer",
      offlineQueued: true,
      openingBalanceCents: 2500,
      queueItemId: "queue-1",
      queueStatus: "pending",
      role: "customer",
    });
  });

  it("keeps supplier opening-balance display aligned with the ERP sign contract", () => {
    const supplier = buildQueuedOfflinePartySummary({
      balanceDirection: "DR",
      name: "Test Supplier",
      openingBalanceCents: 5000,
      role: "supplier",
    }, "queue-2", "failed");

    expect(supplier.openingBalanceCents).toBe(5000);
    expect(supplier.balanceSide).toBe("CR");
    expect(supplier.queueStatus).toBe("failed");
  });

  it("rejects malformed local payloads before they enter the queue", () => {
    expect(() => validateOfflinePartyInput({ name: "A", role: "customer" })).toThrow(
      "Party name must be between 2 and 240 characters",
    );
    expect(() => validateOfflinePartyInput({
      name: "Test Customer",
      openingBalanceCents: 100,
      role: "customer",
    })).toThrow("Opening balance direction is required");
    expect(() => validateOfflinePartyInput({
      gstin: "INVALID",
      name: "Test Customer",
      role: "customer",
    })).toThrow("GSTIN must be 15 uppercase letters or digits");
  });
});

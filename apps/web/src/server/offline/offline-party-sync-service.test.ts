import { describe, expect, it } from "vitest";
import { offlinePartySyncTestUtils } from "./offline-party-sync-service";

const identity = {
  deviceId: "device-1",
  idempotencyKey: "party-idempotency-123",
  queueItemId: "queue-party-1",
};

describe("offline party sync helpers", () => {
  it("normalizes Unicode names and Indian mobile formats for strict duplicate checks", () => {
    expect(offlinePartySyncTestUtils.normalizeComparable("  श्री राम  &  Sons ")).toBe("श्री राम sons");
    expect(offlinePartySyncTestUtils.normalizeMobile("+91 98765-43210")).toBe("9876543210");
    expect(offlinePartySyncTestUtils.normalizeMobile("98765 43210")).toBe("9876543210");
  });

  it("serializes name, mobile and fallback slug identities before party creation", () => {
    expect(offlinePartySyncTestUtils.partyLockKeys("tenant-1", {
      mobile: "+91 98765-43210",
      name: "श्री राम",
      role: "customer",
    })).toEqual([
      "offline-party:tenant-1:mobile:9876543210",
      "offline-party:tenant-1:name:श्री राम",
      "offline-party:tenant-1:slug:party",
    ]);
  });

  it("builds queue identity metadata and preserves the online opening-balance sign contract", () => {
    const input = {
      address: "Sikar",
      balanceDirection: "CR" as const,
      gstin: "08ABCDE1234F1Z5",
      mobile: "+91 98765-43210",
      name: "Test Supplier",
      openingBalanceCents: 2500,
      role: "supplier" as const,
    };
    const signedOpening = offlinePartySyncTestUtils.signedOpeningBalance(input);
    const fields = offlinePartySyncTestUtils.buildPartyCustomFields(input, identity, signedOpening);

    expect(signedOpening).toBe(-2500);
    expect(fields).toMatchObject({
      address: "Sikar",
      gstin: "08ABCDE1234F1Z5",
      hardwareOpeningBalances: { supplier: -2500 },
      hardwarePartyRole: "supplier",
      hardwarePartyRoles: ["supplier"],
      offlineDeviceId: "device-1",
      offlineIdempotencyKey: "party-idempotency-123",
      offlineSyncQueueItemId: "queue-party-1",
      phone: "9876543210",
    });
  });

  it("only treats the exact device, queue item and idempotency tuple as a recoverable retry", () => {
    const fields = offlinePartySyncTestUtils.buildPartyCustomFields({
      name: "Test Customer",
      role: "customer",
    }, identity, 0);

    expect(offlinePartySyncTestUtils.matchesOfflineIdentity(fields, identity)).toBe(true);
    expect(offlinePartySyncTestUtils.matchesOfflineIdentity(fields, {
      ...identity,
      queueItemId: "another-queue-item",
    })).toBe(false);
  });

  it("keeps customer and supplier balance-side mapping aligned with the current ERP contract", () => {
    expect(offlinePartySyncTestUtils.balanceSideFor("customer", 100)).toBe("DR");
    expect(offlinePartySyncTestUtils.balanceSideFor("customer", -100)).toBe("CR");
    expect(offlinePartySyncTestUtils.balanceSideFor("supplier", 100)).toBe("CR");
    expect(offlinePartySyncTestUtils.balanceSideFor("supplier", -100)).toBe("DR");
    expect(offlinePartySyncTestUtils.balanceSideFor("supplier", 0)).toBeNull();
  });

  it("creates stable internal slugs without exposing queue identifiers", () => {
    expect(offlinePartySyncTestUtils.slugify("Shri Ram & Sons")).toBe("shri-ram-sons");
    expect(offlinePartySyncTestUtils.slugify("  MANGALAM  SANITARY  ")).toBe("mangalam-sanitary");
  });
});

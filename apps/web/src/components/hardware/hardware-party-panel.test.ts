import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import type { QueuedOfflinePartySummary } from "../../lib/offline-data";
import type { HardwarePartySummary } from "@/server/hardware";
import { mergePartyRows } from "./hardware-party-panel";

function serverParty(id: string, name: string): HardwarePartySummary {
  return {
    balanceSide: null,
    contact: null,
    currentBalanceCents: 0,
    gstin: null,
    id,
    name,
    openingBalanceCents: 0,
    role: "customer",
  };
}

function queuedParty(id: string, name: string): QueuedOfflinePartySummary {
  return {
    ...serverParty(`offline-party:${id}`),
    id: `offline-party:${id}`,
    name,
    offlineQueued: true,
    queueItemId: id,
    queueStatus: "pending",
  };
}

describe("hardware party panel state", () => {
  it("keeps all pending rows ahead of authoritative server rows", () => {
    const rows = mergePartyRows(
      [serverParty("server-1", "Saved Customer")],
      [queuedParty("queue-1", "Offline One"), queuedParty("queue-2", "Offline Two")],
    );

    expect(rows.map((party) => party.name)).toEqual([
      "Offline One",
      "Offline Two",
      "Saved Customer",
    ]);
  });

  it("does not retain stale queued rows supplied as server rows", () => {
    const stale = queuedParty("old", "Old Pending");
    const fresh = queuedParty("new", "New Pending");
    expect(mergePartyRows([stale, serverParty("server-1", "Saved")], [fresh]).map((party) => party.name))
      .toEqual(["New Pending", "Saved"]);
  });
});

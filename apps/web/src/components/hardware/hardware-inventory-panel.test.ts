import { HardwareInventoryMovementType } from "@trustfirst/database";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import type { QueuedOfflineStockMovement } from "../../lib/offline-data";
import type { HardwareMovementSummary } from "@/server/hardware";
import { mergeMovementRows } from "./hardware-inventory-panel";

function serverMovement(id: string, productName: string): HardwareMovementSummary {
  return {
    id,
    locationName: "Main",
    occurredAt: new Date("2026-08-04T05:00:00.000Z"),
    productId: `product-${id}`,
    productName,
    quantity: 2,
    type: HardwareInventoryMovementType.STOCK_IN,
  };
}

function queuedMovement(id: string, productName: string): QueuedOfflineStockMovement {
  return {
    expectedCurrentStock: 10,
    id: `offline-stock:${id}`,
    locationName: "Main",
    occurredAt: new Date("2026-08-04T05:01:00.000Z"),
    offlineQueued: true,
    productId: `product-${id}`,
    productName,
    projectedStock: 12,
    quantity: 2,
    queueItemId: id,
    queueStatus: "pending",
    type: "STOCK_IN",
  };
}

describe("hardware inventory pending ledger", () => {
  it("keeps pending instructions ahead of authoritative server movements", () => {
    const rows = mergeMovementRows(
      [serverMovement("server-1", "Saved Movement")],
      [queuedMovement("queue-1", "Offline One"), queuedMovement("queue-2", "Offline Two")],
    );

    expect(rows.map((movement) => movement.productName)).toEqual([
      "Offline One",
      "Offline Two",
      "Saved Movement",
    ]);
  });

  it("drops stale pending rows once they are absent from the active queue", () => {
    const stale = queuedMovement("old", "Old Pending");
    const fresh = queuedMovement("new", "New Pending");
    expect(mergeMovementRows([stale, serverMovement("server-1", "Saved")], [fresh]).map((movement) => movement.productName))
      .toEqual(["New Pending", "Saved"]);
  });
});

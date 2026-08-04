import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import type { QueuedOfflineProductSummary } from "../../lib/offline-data";
import type { HardwareProductSummary } from "@/server/hardware";
import { mergeProductRows } from "./hardware-product-table";

function serverProduct(id: string, name: string): HardwareProductSummary {
  return {
    barcode: null,
    brandName: null,
    categoryName: null,
    currentStock: 5,
    gstRateBps: 1800,
    hsnCode: "6910",
    id,
    lowStock: false,
    lowStockThreshold: 1,
    name,
    purchaseCostCents: 5000,
    salesDiscountBps: 0,
    salesPriceCents: 7500,
    sku: `${id}-SKU`,
    status: "ACTIVE",
    stockSetupStatus: "TRACKED",
    unitCode: "PCS",
  };
}

function queuedProduct(id: string, name: string): QueuedOfflineProductSummary {
  return {
    ...serverProduct(`offline-product:${id}`, name),
    currentStock: 0,
    id: `offline-product:${id}`,
    lowStock: true,
    offlineQueued: true,
    queueItemId: id,
    queueStatus: "pending",
    stockSetupStatus: "PENDING",
  };
}

describe("hardware product table state", () => {
  it("keeps pending catalog rows ahead of authoritative server products", () => {
    const rows = mergeProductRows(
      [serverProduct("server-1", "Saved Product")],
      [queuedProduct("queue-1", "Offline One"), queuedProduct("queue-2", "Offline Two")],
    );

    expect(rows.map((product) => product.name)).toEqual([
      "Offline One",
      "Offline Two",
      "Saved Product",
    ]);
  });

  it("drops stale local rows when they are no longer present in the active queue", () => {
    const stale = queuedProduct("old", "Old Pending");
    const fresh = queuedProduct("new", "New Pending");
    expect(mergeProductRows([stale, serverProduct("server-1", "Saved")], [fresh]).map((product) => product.name))
      .toEqual(["New Pending", "Saved"]);
  });
});

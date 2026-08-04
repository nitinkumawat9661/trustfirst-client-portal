import { afterEach, describe, expect, it, vi } from "vitest";
import { listQueuedOfflineParties, queueOfflinePartyDraft } from "./party-draft";

const scope = { tenantId: "tenant-1", userId: "user-1" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("offline party draft queue", () => {
  it("persists multiple customer drafts and keeps supplier drafts role-scoped", async () => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("indexedDB", undefined);

    const first = await queueOfflinePartyDraft(scope, {
      name: "Customer One",
      role: "customer",
    });
    const second = await queueOfflinePartyDraft(scope, {
      mobile: "9876543210",
      name: "Customer Two",
      role: "customer",
    });
    await queueOfflinePartyDraft(scope, {
      name: "Supplier One",
      role: "supplier",
    });

    const customers = await listQueuedOfflineParties(scope, "customer");
    const suppliers = await listQueuedOfflineParties(scope, "supplier");

    expect(customers.map((party) => party.name)).toEqual(["Customer One", "Customer Two"]);
    expect(customers.map((party) => party.id)).toEqual([
      `offline-party:${first.queueItem.id}`,
      `offline-party:${second.queueItem.id}`,
    ]);
    expect(suppliers.map((party) => party.name)).toEqual(["Supplier One"]);
  });
});

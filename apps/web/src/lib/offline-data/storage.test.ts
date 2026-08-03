import { describe, expect, it } from "vitest";
import { MemoryOfflineDataStorage, offlineDataScopeKey, offlineSetupSummary } from "./storage";
import { offlineSnapshotSchemaVersion, type OfflineDeviceEnrollment, type OfflineSnapshot } from "./types";

const scope = { tenantId: "tenant_1", userId: "user_1" };

function enrollment(overrides: Partial<OfflineDeviceEnrollment> = {}): OfflineDeviceEnrollment {
  return {
    deviceId: "device_1",
    deviceKey: "mangalam-device-1",
    enrolledAt: "2026-08-03T12:00:00.000Z",
    label: "Windows laptop",
    tenantId: scope.tenantId,
    token: "one-time-device-token",
    userId: scope.userId,
    ...overrides,
  };
}

function snapshot(overrides: Partial<OfflineSnapshot> = {}): OfflineSnapshot {
  return {
    brands: [],
    categories: [],
    customers: [{
      balanceSide: "DR",
      contact: null,
      currentBalanceCents: 1000,
      gstin: null,
      id: "customer_1",
      name: "Customer",
      openingBalanceCents: 0,
      role: "customer",
    }],
    documents: { purchases: [], quotations: [], sales: [] },
    generatedAt: "2026-08-03T12:01:00.000Z",
    locations: [{ code: "MAIN", id: "location_1", name: "Main" }],
    numberLeases: [{
      deviceId: "device_1",
      endValue: 110,
      expiresAt: "2027-02-01T00:00:00.000Z",
      financialYear: "2026",
      format: "trade",
      id: "lease_1",
      nextValue: 101,
      prefix: "HSQ",
      series: "HSQ",
      startValue: 101,
    }],
    permissions: ["hardware.catalog.read"],
    products: [{
      barcode: null,
      brandName: null,
      categoryName: null,
      currentStock: 5,
      gstRateBps: 1800,
      hsnCode: "6910",
      id: "product_1",
      lowStock: false,
      lowStockThreshold: 1,
      name: "Basin",
      purchaseCostCents: 50000,
      salesDiscountBps: 0,
      salesPriceCents: 100000,
      sku: "BASIN-1",
      stockSetupStatus: "TRACKED",
      unitCode: "PCS",
    }],
    schemaVersion: offlineSnapshotSchemaVersion,
    settings: null,
    stock: [{ locationId: "location_1", productId: "product_1", quantity: 5 }],
    suppliers: [],
    tenant: { id: scope.tenantId, name: "Mangalam", slug: "manglam-trading-demo" },
    tenantId: scope.tenantId,
    units: [],
    userId: scope.userId,
    ...overrides,
  };
}

describe("offline data storage", () => {
  it("keeps device credentials and snapshot scoped to the active tenant and user", async () => {
    const storage = new MemoryOfflineDataStorage();
    await storage.write(scope, enrollment(), snapshot());

    const record = await storage.read(scope);
    expect(record?.scopeKey).toBe(offlineDataScopeKey(scope));
    expect(record?.enrollment.token).toBe("one-time-device-token");
    expect(record?.snapshot.products[0]?.name).toBe("Basin");
    expect(offlineSetupSummary(record)).toMatchObject({
      deviceId: "device_1",
      numberLeaseCount: 1,
      partyCount: 1,
      productCount: 1,
      stockRowCount: 1,
    });
  });

  it("consumes reserved series numbers in order and preserves local progress on refresh", async () => {
    const storage = new MemoryOfflineDataStorage();
    await storage.write(scope, enrollment(), snapshot());

    await expect(storage.consumeNumber(scope, "HSQ")).resolves.toEqual({
      formattedNumber: "HSQ-2026-0101",
      leaseId: "lease_1",
      series: "HSQ",
      value: 101,
    });
    await storage.write(scope, enrollment(), snapshot());
    await expect(storage.consumeNumber(scope, "HSQ")).resolves.toMatchObject({
      formattedNumber: "HSQ-2026-0102",
      value: 102,
    });
  });

  it("consumes and restores the HSO plus MS/INV pair atomically", async () => {
    const storage = new MemoryOfflineDataStorage();
    const numberLeases: OfflineSnapshot["numberLeases"] = [
      {
        deviceId: "device_1",
        endValue: 210,
        expiresAt: "2027-02-01T00:00:00.000Z",
        financialYear: "2026",
        format: "trade",
        id: "lease_hso",
        nextValue: 201,
        prefix: "HSO",
        series: "HSO",
        startValue: 201,
      },
      {
        deviceId: "device_1",
        endValue: 310,
        expiresAt: "2027-02-01T00:00:00.000Z",
        financialYear: "2026-27",
        format: "invoice",
        id: "lease_invoice",
        nextValue: 301,
        prefix: "MS/INV",
        series: "MS/INV",
        startValue: 301,
      },
    ];
    await storage.write(scope, enrollment(), snapshot({ numberLeases }));

    const consumed = await storage.consumeNumbers(scope, ["HSO", "MS/INV"]);
    expect(consumed).toEqual([
      {
        formattedNumber: "HSO-2026-0201",
        leaseId: "lease_hso",
        series: "HSO",
        value: 201,
      },
      {
        formattedNumber: "MS/INV/2026-27/00301",
        leaseId: "lease_invoice",
        series: "MS/INV",
        value: 301,
      },
    ]);

    await storage.restoreNumbers(scope, consumed);
    await expect(storage.consumeNumbers(scope, ["HSO", "MS/INV"])).resolves.toEqual(consumed);
  });

  it("does not consume the first number when a grouped lease is missing", async () => {
    const storage = new MemoryOfflineDataStorage();
    await storage.write(scope, enrollment(), snapshot({
      numberLeases: [{
        deviceId: "device_1",
        endValue: 210,
        expiresAt: "2027-02-01T00:00:00.000Z",
        financialYear: "2026",
        format: "trade",
        id: "lease_hso",
        nextValue: 201,
        prefix: "HSO",
        series: "HSO",
        startValue: 201,
      }],
    }));

    await expect(storage.consumeNumbers(scope, ["HSO", "MS/INV"]))
      .rejects.toThrow("No reserved offline MS/INV numbers remain");
    await expect(storage.consumeNumber(scope, "HSO")).resolves.toMatchObject({ value: 201 });
  });

  it("restores only the most recently consumed reserved number", async () => {
    const storage = new MemoryOfflineDataStorage();
    await storage.write(scope, enrollment(), snapshot());

    const first = await storage.consumeNumber(scope, "HSQ");
    await storage.restoreNumber(scope, first);
    await expect(storage.consumeNumber(scope, "HSQ")).resolves.toEqual(first);

    const second = await storage.consumeNumber(scope, "HSQ");
    await expect(storage.restoreNumber(scope, first)).rejects.toThrow(
      "cannot be restored after a later number has been consumed",
    );
    await storage.restoreNumber(scope, second);
  });

  it("rejects a snapshot from another tenant before writing local data", async () => {
    const storage = new MemoryOfflineDataStorage();
    await expect(storage.write(
      scope,
      enrollment(),
      snapshot({ tenantId: "tenant_2" }),
    )).rejects.toThrow("does not belong to the active tenant and user");
  });
});

import type {
  OfflineDataScope,
  OfflineDeviceEnrollment,
  OfflineNumberLease,
  OfflineNumberSeries,
  OfflineSetupSummary,
  OfflineSnapshot,
} from "./types";

export type OfflineDataRecord = {
  enrollment: OfflineDeviceEnrollment;
  scopeKey: string;
  snapshot: OfflineSnapshot;
  updatedAt: string;
};

export type ConsumedOfflineNumber = {
  formattedNumber: string;
  leaseId: string;
  series: OfflineNumberSeries;
  value: number;
};

export type OfflineDataStorage = {
  consumeNumber(scope: OfflineDataScope, series: OfflineNumberSeries): Promise<ConsumedOfflineNumber>;
  read(scope: OfflineDataScope): Promise<OfflineDataRecord | null>;
  write(scope: OfflineDataScope, enrollment: OfflineDeviceEnrollment, snapshot: OfflineSnapshot): Promise<void>;
};

const databaseName = "mangalam-offline-data";
const databaseVersion = 1;
const storeName = "tenantSnapshots";

export class IndexedDbOfflineDataStorage implements OfflineDataStorage {
  async read(scope: OfflineDataScope) {
    const database = await openDatabase();
    return new Promise<OfflineDataRecord | null>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).get(offlineDataScopeKey(scope));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(validateRecord(request.result, scope));
    });
  }

  async write(scope: OfflineDataScope, enrollment: OfflineDeviceEnrollment, snapshot: OfflineSnapshot) {
    assertScope(enrollment, scope, "Offline device enrollment");
    assertScope(snapshot, scope, "Offline snapshot");
    const existing = await this.read(scope);
    const database = await openDatabase();
    const record: OfflineDataRecord = {
      enrollment,
      scopeKey: offlineDataScopeKey(scope),
      snapshot: mergeLocalLeaseProgress(existing?.snapshot ?? null, snapshot),
      updatedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async consumeNumber(scope: OfflineDataScope, series: OfflineNumberSeries) {
    const database = await openDatabase();
    return new Promise<ConsumedOfflineNumber>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.get(offlineDataScopeKey(scope));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = validateRecord(request.result, scope);
        if (!record) {
          reject(new Error("Offline device data is not set up on this device."));
          return;
        }
        try {
          const consumed = consumeFromRecord(record, series);
          const put = objectStore.put(record);
          put.onerror = () => reject(put.error);
          put.onsuccess = () => resolve(consumed);
        } catch (error) {
          reject(error);
        }
      };
    });
  }
}

export class MemoryOfflineDataStorage implements OfflineDataStorage {
  private readonly records = new Map<string, OfflineDataRecord>();

  async read(scope: OfflineDataScope) {
    return this.records.get(offlineDataScopeKey(scope)) ?? null;
  }

  async write(scope: OfflineDataScope, enrollment: OfflineDeviceEnrollment, snapshot: OfflineSnapshot) {
    assertScope(enrollment, scope, "Offline device enrollment");
    assertScope(snapshot, scope, "Offline snapshot");
    const existing = await this.read(scope);
    this.records.set(offlineDataScopeKey(scope), {
      enrollment,
      scopeKey: offlineDataScopeKey(scope),
      snapshot: mergeLocalLeaseProgress(existing?.snapshot ?? null, snapshot),
      updatedAt: new Date().toISOString(),
    });
  }

  async consumeNumber(scope: OfflineDataScope, series: OfflineNumberSeries) {
    const record = await this.read(scope);
    if (!record) throw new Error("Offline device data is not set up on this device.");
    return consumeFromRecord(record, series);
  }
}

export function offlineDataScopeKey(scope: OfflineDataScope) {
  return `mangalam-offline:${scope.tenantId}:${scope.userId}`;
}

export function offlineSetupSummary(record: OfflineDataRecord | null): OfflineSetupSummary | null {
  if (!record) return null;
  return {
    deviceId: record.enrollment.deviceId,
    generatedAt: record.snapshot.generatedAt,
    numberLeaseCount: record.snapshot.numberLeases.length,
    partyCount: record.snapshot.customers.length + record.snapshot.suppliers.length,
    productCount: record.snapshot.products.length,
    stockRowCount: record.snapshot.stock.length,
  };
}

export function formatOfflineNumber(lease: OfflineNumberLease, value: number) {
  return lease.format === "invoice"
    ? `${lease.prefix}/${lease.financialYear}/${String(value).padStart(5, "0")}`
    : `${lease.prefix}-${lease.financialYear}-${String(value).padStart(4, "0")}`;
}

function consumeFromRecord(record: OfflineDataRecord, series: OfflineNumberSeries): ConsumedOfflineNumber {
  const lease = record.snapshot.numberLeases
    .filter((candidate) => candidate.series === series && candidate.nextValue <= candidate.endValue)
    .sort((left, right) => left.nextValue - right.nextValue)[0];
  if (!lease) throw new Error(`No reserved offline ${series} numbers remain. Connect to the internet to reserve more.`);
  const value = lease.nextValue;
  lease.nextValue += 1;
  record.updatedAt = new Date().toISOString();
  return {
    formattedNumber: formatOfflineNumber(lease, value),
    leaseId: lease.id,
    series,
    value,
  };
}

function mergeLocalLeaseProgress(previous: OfflineSnapshot | null, incoming: OfflineSnapshot): OfflineSnapshot {
  if (!previous) return incoming;
  const previousById = new Map(previous.numberLeases.map((lease) => [lease.id, lease]));
  return {
    ...incoming,
    numberLeases: incoming.numberLeases.map((lease) => {
      const local = previousById.get(lease.id);
      return local ? { ...lease, nextValue: Math.max(lease.nextValue, local.nextValue) } : lease;
    }),
  };
}

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is required for Mangalam offline setup.");
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "scopeKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function validateRecord(value: unknown, scope: OfflineDataScope): OfflineDataRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<OfflineDataRecord>;
  if (!record.enrollment || !record.snapshot || record.scopeKey !== offlineDataScopeKey(scope)) return null;
  try {
    assertScope(record.enrollment, scope, "Offline device enrollment");
    assertScope(record.snapshot, scope, "Offline snapshot");
    if (!Array.isArray(record.snapshot.numberLeases)) return null;
    return record as OfflineDataRecord;
  } catch {
    return null;
  }
}

function assertScope(value: OfflineDataScope, scope: OfflineDataScope, label: string) {
  if (value.tenantId !== scope.tenantId || value.userId !== scope.userId) {
    throw new Error(`${label} does not belong to the active tenant and user.`);
  }
}

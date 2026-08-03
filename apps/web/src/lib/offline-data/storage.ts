import type {
  OfflineDataScope,
  OfflineDeviceEnrollment,
  OfflineSetupSummary,
  OfflineSnapshot,
} from "./types";

type OfflineDataRecord = {
  enrollment: OfflineDeviceEnrollment;
  scopeKey: string;
  snapshot: OfflineSnapshot;
  updatedAt: string;
};

export type OfflineDataStorage = {
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
    const database = await openDatabase();
    const record: OfflineDataRecord = {
      enrollment,
      scopeKey: offlineDataScopeKey(scope),
      snapshot,
      updatedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
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
    this.records.set(offlineDataScopeKey(scope), {
      enrollment,
      scopeKey: offlineDataScopeKey(scope),
      snapshot,
      updatedAt: new Date().toISOString(),
    });
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
    partyCount: record.snapshot.customers.length + record.snapshot.suppliers.length,
    productCount: record.snapshot.products.length,
    stockRowCount: record.snapshot.stock.length,
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

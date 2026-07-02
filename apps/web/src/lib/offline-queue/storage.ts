import type { OfflineQueueStorage, QueuedMutation } from "./types";

const databaseVersion = 1;
const defaultDatabaseName = "trustfirst-offline-queue";
const defaultStoreName = "offlineQueues";

export class MemoryOfflineQueueStorage implements OfflineQueueStorage {
  private readonly items = new Map<string, QueuedMutation[]>();

  async read(scopeKey: string) {
    return [...(this.items.get(scopeKey) ?? [])];
  }

  async write(scopeKey: string, items: QueuedMutation[]) {
    this.items.set(scopeKey, [...items]);
  }
}

export class LocalStorageOfflineQueueStorage implements OfflineQueueStorage {
  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem">) {}

  async read(scopeKey: string) {
    const raw = this.storage.getItem(scopeKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
    } catch {
      return [];
    }
  }

  async write(scopeKey: string, items: QueuedMutation[]) {
    this.storage.setItem(scopeKey, JSON.stringify(items));
  }
}

export class IndexedDbOfflineQueueStorage implements OfflineQueueStorage {
  constructor(
    private readonly databaseName = defaultDatabaseName,
    private readonly storeName = defaultStoreName,
  ) {}

  async read(scopeKey: string) {
    const database = await this.open();
    return new Promise<QueuedMutation[]>((resolve, reject) => {
      const request = database
        .transaction(this.storeName, "readonly")
        .objectStore(this.storeName)
        .get(scopeKey);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as { items?: QueuedMutation[] } | undefined;
        resolve(result?.items ?? []);
      };
    });
  }

  async write(scopeKey: string, items: QueuedMutation[]) {
    const database = await this.open();
    return new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(this.storeName, "readwrite")
        .objectStore(this.storeName)
        .put({ items, scopeKey });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async open() {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available in this runtime.");
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, databaseVersion);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: "scopeKey" });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
}

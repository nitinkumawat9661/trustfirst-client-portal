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

/**
 * Browser-compatible queue storage.
 *
 * The existing constructor is retained for backwards compatibility, while
 * IndexedDB becomes the primary store whenever the browser supports it. The
 * small localStorage copy remains a fallback and migration source so pending
 * mutations are not lost during the upgrade.
 */
export class LocalStorageOfflineQueueStorage implements OfflineQueueStorage {
  private readonly indexedDb = typeof indexedDB === "undefined"
    ? null
    : new IndexedDbOfflineQueueStorage();

  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem">) {}

  async read(scopeKey: string) {
    const fallbackItems = this.readLocal(scopeKey);
    if (!this.indexedDb) return fallbackItems;

    try {
      const indexedItems = await this.indexedDb.read(scopeKey);
      if (indexedItems.length > 0) return indexedItems;
      if (fallbackItems.length > 0) {
        await this.indexedDb.write(scopeKey, fallbackItems);
      }
      return fallbackItems;
    } catch {
      return fallbackItems;
    }
  }

  async write(scopeKey: string, items: QueuedMutation[]) {
    this.storage.setItem(scopeKey, JSON.stringify(items));
    if (!this.indexedDb) return;

    try {
      await this.indexedDb.write(scopeKey, items);
    } catch {
      // The localStorage copy remains available when IndexedDB is blocked.
    }
  }

  private readLocal(scopeKey: string) {
    const raw = this.storage.getItem(scopeKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
    } catch {
      return [];
    }
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

"use client";

/**
 * Offline storage layer (Phase 1).
 *
 * Uses IndexedDB in the browser for structured lesson data and the offline
 * submission queue. Falls back to an in-memory store in environments where
 * IndexedDB is not available (tests, SSR). All operations are safe to call
 * from anywhere — they never throw for storage reasons.
 */

export interface CacheEntry {
  key: string;
  data: unknown;
  updatedAt: number;
  accessedAt: number;
  size: number;
  pinned: number;
}

export interface QueueRecord {
  id: string;
  userId: string;
  key: string;
  method: string;
  endpoint: string;
  body?: unknown;
  createdAt: number;
  attempts: number;
}

export interface OfflineBackend {
  kvGet(key: string): Promise<CacheEntry | null>;
  kvPut(entry: CacheEntry): Promise<void>;
  kvDelete(key: string): Promise<void>;
  kvAll(): Promise<CacheEntry[]>;
  kvClear(): Promise<void>;
  queueAdd(record: QueueRecord): Promise<void>;
  queueGet(id: string): Promise<QueueRecord | null>;
  queueAll(): Promise<QueueRecord[]>;
  queueDelete(id: string): Promise<void>;
  queueClear(): Promise<void>;
}

const DB_NAME = "el-bannawy-offline";
const DB_VERSION = 1;
const KV_STORE = "kv";
const QUEUE_STORE = "queue";

class MemoryBackend implements OfflineBackend {
  private readonly kv = new Map<string, CacheEntry>();
  private readonly queue = new Map<string, QueueRecord>();

  kvGet(key: string): Promise<CacheEntry | null> {
    return Promise.resolve(this.kv.get(key) ?? null);
  }

  kvPut(entry: CacheEntry): Promise<void> {
    this.kv.set(entry.key, entry);
    return Promise.resolve();
  }

  kvDelete(key: string): Promise<void> {
    this.kv.delete(key);
    return Promise.resolve();
  }

  kvAll(): Promise<CacheEntry[]> {
    return Promise.resolve(Array.from(this.kv.values()));
  }

  kvClear(): Promise<void> {
    this.kv.clear();
    return Promise.resolve();
  }

  queueAdd(record: QueueRecord): Promise<void> {
    this.queue.set(record.id, record);
    return Promise.resolve();
  }

  queueGet(id: string): Promise<QueueRecord | null> {
    return Promise.resolve(this.queue.get(id) ?? null);
  }

  queueAll(): Promise<QueueRecord[]> {
    return Promise.resolve(Array.from(this.queue.values()));
  }

  queueDelete(id: string): Promise<void> {
    this.queue.delete(id);
    return Promise.resolve();
  }

  queueClear(): Promise<void> {
    this.queue.clear();
    return Promise.resolve();
  }
}

function supportsIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = (): void => { resolve(request.result); };
    request.onerror = (): void => { reject(request.error ?? new Error("IndexedDB request failed")); };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = (): void => { resolve(); };
    transaction.onerror = (): void => { reject(transaction.error ?? new Error("IndexedDB transaction failed")); };
    transaction.onabort = (): void => { reject(transaction.error ?? new Error("IndexedDB transaction aborted")); };
  });
}

class IndexedDbBackend implements OfflineBackend {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = (): void => { resolve(request.result); };
      request.onerror = (): void => { reject(request.error ?? new Error("Failed to open IndexedDB")); };
    });
    return this.dbPromise;
  }

  async kvGet(key: string): Promise<CacheEntry | null> {
    const db = await this.open();
    const tx = db.transaction(KV_STORE, "readonly");
    const request = tx.objectStore(KV_STORE).get(key) as IDBRequest<CacheEntry | undefined>;
    const result = await requestToPromise<CacheEntry | undefined>(request);
    return result ?? null;
  }

  async kvPut(entry: CacheEntry): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(KV_STORE, "readwrite");
    tx.objectStore(KV_STORE).put(entry);
    await transactionDone(tx);
  }

  async kvDelete(key: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(KV_STORE, "readwrite");
    tx.objectStore(KV_STORE).delete(key);
    await transactionDone(tx);
  }

  async kvAll(): Promise<CacheEntry[]> {
    const db = await this.open();
    const tx = db.transaction(KV_STORE, "readonly");
    const request = tx.objectStore(KV_STORE).getAll() as IDBRequest<CacheEntry[]>;
    const result = await requestToPromise<CacheEntry[]>(request);
    return result;
  }

  async kvClear(): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(KV_STORE, "readwrite");
    tx.objectStore(KV_STORE).clear();
    await transactionDone(tx);
  }

  async queueAdd(record: QueueRecord): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put(record);
    await transactionDone(tx);
  }

  async queueGet(id: string): Promise<QueueRecord | null> {
    const db = await this.open();
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const request = tx.objectStore(QUEUE_STORE).get(id) as IDBRequest<QueueRecord | undefined>;
    const result = await requestToPromise<QueueRecord | undefined>(request);
    return result ?? null;
  }

  async queueAll(): Promise<QueueRecord[]> {
    const db = await this.open();
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const request = tx.objectStore(QUEUE_STORE).getAll() as IDBRequest<QueueRecord[]>;
    const result = await requestToPromise<QueueRecord[]>(request);
    return result;
  }

  async queueDelete(id: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(id);
    await transactionDone(tx);
  }

  async queueClear(): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).clear();
    await transactionDone(tx);
  }
}

let backendPromise: Promise<OfflineBackend> | null = null;

export function getBackend(): Promise<OfflineBackend> {
  backendPromise ??= supportsIndexedDb()
    ? Promise.resolve(new IndexedDbBackend())
    : Promise.resolve(new MemoryBackend());
  return backendPromise;
}

/**
 * Test helper: force the in-memory backend and reset the singleton so each
 * test starts with a clean store.
 */
export function __resetBackendForTests(): void {
  backendPromise = Promise.resolve(new MemoryBackend());
}

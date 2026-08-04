"use client";

import { getBackend, type CacheEntry } from "./db";

/** Structured-data quota (IndexedDB lesson cache). */
export const CACHE_QUOTA_BYTES = 60 * 1024 * 1024;

let cacheQuotaBytes = CACHE_QUOTA_BYTES;

/** Test helper: override the eviction quota. */
export function __setCacheQuotaForTests(bytes: number): void {
  cacheQuotaBytes = bytes;
}

function approxSize(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    try {
      return JSON.stringify(data).length * 2;
    } catch {
      return 0;
    }
  }
}

export interface CacheWriteOptions {
  pin?: boolean;
}

/**
 * Smart Lesson Cache over the structured kv store.
 *
 * Keys are fully-qualified by the caller (integration layer prefixes with the
 * user scope). Eviction is least-recently-used; pinned entries (current
 * lesson, current week, manually pinned) are never removed.
 */
export async function cachePut(key: string, data: unknown, options: CacheWriteOptions = {}): Promise<void> {
  try {
    const backend = await getBackend();
    const now = Date.now();
    const existing = await backend.kvGet(key);
    await backend.kvPut({
      key,
      data,
      updatedAt: now,
      accessedAt: now,
      size: existing ? Math.max(existing.size, approxSize(data)) : approxSize(data),
      pinned: options.pin === true ? 1 : (existing?.pinned ?? 0),
    });
    await enforceQuota();
  } catch {
    // Cache writes must never break the request path.
  }
}

export async function cacheGet(key: string): Promise<unknown> {
  try {
    const backend = await getBackend();
    const entry = await backend.kvGet(key);
    if (!entry) return null;
    if (entry.pinned !== 1) {
      await backend.kvPut({ ...entry, accessedAt: Date.now() });
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheDeleteKey(key: string): Promise<void> {
  try {
    const backend = await getBackend();
    await backend.kvDelete(key);
  } catch {
    // no-op
  }
}

export async function cacheDeleteWhereKeyStartsWith(prefix: string): Promise<void> {
  try {
    const backend = await getBackend();
    const entries = await backend.kvAll();
    const toDelete = entries.filter((entry) => entry.key.startsWith(prefix));
    await Promise.all(toDelete.map((entry) => backend.kvDelete(entry.key)));
  } catch {
    // no-op
  }
}

export async function cachePinWhereKeyStartsWith(prefix: string): Promise<void> {
  try {
    const backend = await getBackend();
    const entries = await backend.kvAll();
    const toPin = entries.filter((entry) => entry.key.startsWith(prefix) && entry.pinned !== 1);
    await Promise.all(
      toPin.map((entry) => backend.kvPut({ ...entry, pinned: 1 })),
    );
  } catch {
    // no-op
  }
}

export async function cacheClear(prefix = ""): Promise<void> {
  try {
    const backend = await getBackend();
    if (prefix) {
      await cacheDeleteWhereKeyStartsWith(prefix);
    } else {
      await backend.kvClear();
    }
  } catch {
    // no-op
  }
}

export async function cacheEntries(): Promise<CacheEntry[]> {
  try {
    const backend = await getBackend();
    return await backend.kvAll();
  } catch {
    return [];
  }
}

async function enforceQuota(): Promise<void> {
  try {
    const backend = await getBackend();
    const entries = await backend.kvAll();
    const total = entries.reduce((sum, entry) => sum + entry.size, 0);
    if (total <= cacheQuotaBytes) return;
    const evictable = entries
      .filter((entry) => entry.pinned !== 1)
      .sort((a, b) => a.accessedAt - b.accessedAt);
    let running = total;
    for (const entry of evictable) {
      if (running <= cacheQuotaBytes) break;
      await backend.kvDelete(entry.key);
      running -= entry.size;
    }
  } catch {
    // no-op
  }
}

export async function cacheTotalSize(): Promise<number> {
  try {
    const backend = await getBackend();
    const entries = await backend.kvAll();
    return entries.reduce((sum, entry) => sum + entry.size, 0);
  } catch {
    return 0;
  }
}

"use client";

import { pendingSubmissions, removeSubmission, markSubmissionAttempt } from "./queue";
import { currentUserScope } from "./scope";

export const MAX_SYNC_ATTEMPTS = 5;

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
}

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";
}

async function postRecord(record: {
  method: string;
  endpoint: string;
  body?: unknown;
}): Promise<boolean> {
  const response = await fetch(`${apiBaseUrl()}${record.endpoint}`, {
    method: record.method,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include",
    body: record.body === undefined ? undefined : JSON.stringify(record.body),
  });
  return response.ok;
}

/**
 * Synchronise queued offline submissions. FIFO order. Mergeable entries
 * already collapsed to a single "latest" entry at enqueue time, so
 * latest-timestamp-wins is guaranteed and duplicates are avoided.
 */
export async function runSync(): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, pending: (await pendingSubmissions()).length };
  }
  const userId = currentUserScope();
  const records = await pendingSubmissions(userId);

  let synced = 0;
  let failed = 0;
  for (const record of records) {
    if (record.attempts >= MAX_SYNC_ATTEMPTS) {
      failed += 1;
      continue;
    }
    try {
      const ok = await postRecord(record);
      if (ok) {
        await removeSubmission(record.id);
        synced += 1;
      } else {
        failed += 1;
        await markSubmissionAttempt(record.id, record.attempts + 1);
      }
    } catch {
      failed += 1;
      await markSubmissionAttempt(record.id, record.attempts + 1);
      break;
    }
  }

  const pending = (await pendingSubmissions(userId)).length;
  return { synced, failed, pending };
}

/** Request a browser background-sync so queued submissions flush when back online. */
export async function registerBackgroundSync(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };
    if (registration.sync) {
      await registration.sync.register("el-bannawy-sync");
    }
  } catch {
    // Background Sync unsupported — the online/visibility listeners cover it.
  }
}

let syncInited = false;

/** Attach connectivity listeners once. Safe to call multiple times. */
export function initSyncEngine(): void {
  if (syncInited || typeof window === "undefined") return;
  syncInited = true;

  const runWhenOnline = (): void => {
    void registerBackgroundSync();
    void runSync();
  };

  window.addEventListener("online", runWhenOnline);
  document.addEventListener("visibilitychange", (): void => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void runSync();
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === "el-bannawy-sync") {
        void runSync();
      }
    });
    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "el-bannawy-api-url",
        url: apiBaseUrl(),
      });
    }).catch((): void => undefined);
    void registerBackgroundSync();
  }
}

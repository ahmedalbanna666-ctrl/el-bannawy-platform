"use client";

import { getBackend, type QueueRecord } from "./db";
import { isQueuable, normalizeEndpoint } from "./cache-policy";
import { currentUserScope } from "./scope";

export interface QueuedSubmission {
  method: string;
  endpoint: string;
  body?: unknown;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`;
}

function fingerprint(body: unknown): string {
  let value: string;
  try {
    value = JSON.stringify(body ?? null);
  } catch {
    value = typeof body === "string" ? body : "";
  }
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Queue an offline submission. Mergeable endpoints (progress/save) collapse to
 * one latest entry per key; unique endpoints (submit/start) are deduped by a
 * body fingerprint so the same submission is never queued twice.
 *
 * Returns the queue record id, or null if nothing was queued.
 */
export async function enqueueSubmission(submission: QueuedSubmission): Promise<string | null> {
  try {
    const policy = isQueuable(submission.endpoint);
    if (!policy) return null;
    const backend = await getBackend();
    const userId = currentUserScope();
    const normalized = normalizeEndpoint(submission.endpoint);
    const now = Date.now();

    if (policy.kind === "mergeable") {
      const key = `${userId}:${normalized}`;
      const existing = (await backend.queueAll()).find(
        (record) => record.key === key && record.userId === userId,
      );
      if (existing) {
        const merged: QueueRecord = {
          ...existing,
          body: submission.body,
          method: submission.method,
          endpoint: submission.endpoint,
          createdAt: now,
          attempts: 0,
        };
        await backend.queueAdd(merged);
        return merged.id;
      }
      const record: QueueRecord = {
        id: randomId(),
        userId,
        key,
        method: submission.method,
        endpoint: submission.endpoint,
        body: submission.body,
        createdAt: now,
        attempts: 0,
      };
      await backend.queueAdd(record);
      return record.id;
    }

    const key = `${userId}:${normalized}:${fingerprint(submission.body)}`;
    const duplicate = (await backend.queueAll()).find(
      (record) => record.key === key && record.userId === userId,
    );
    if (duplicate) return duplicate.id;

    const record: QueueRecord = {
      id: randomId(),
      userId,
      key,
      method: submission.method,
      endpoint: submission.endpoint,
      body: submission.body,
      createdAt: now,
      attempts: 0,
    };
    await backend.queueAdd(record);
    return record.id;
  } catch {
    return null;
  }
}

/** List pending submissions, oldest first, optionally for a specific user. */
export async function pendingSubmissions(userId?: string): Promise<QueueRecord[]> {
  try {
    const backend = await getBackend();
    const records = await backend.queueAll();
    return records
      .filter((record) => !userId || record.userId === userId)
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function removeSubmission(id: string): Promise<void> {
  try {
    const backend = await getBackend();
    await backend.queueDelete(id);
  } catch {
    // no-op
  }
}

export async function markSubmissionAttempt(id: string, attempts: number): Promise<void> {
  try {
    const backend = await getBackend();
    const record = await backend.queueGet(id);
    if (record) {
      await backend.queueAdd({ ...record, attempts });
    }
  } catch {
    // no-op
  }
}

export async function clearQueueForUser(userId: string): Promise<void> {
  try {
    const backend = await getBackend();
    const records = await backend.queueAll();
    await Promise.all(
      records.filter((record) => record.userId === userId).map((record) => backend.queueDelete(record.id)),
    );
  } catch {
    // no-op
  }
}

/** Number of pending offline submissions for the current user. */
export async function pendingCount(): Promise<number> {
  return (await pendingSubmissions(currentUserScope())).length;
}

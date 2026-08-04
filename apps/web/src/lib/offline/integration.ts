"use client";

import {
  cachePut,
  cacheGet,
  cacheDeleteWhereKeyStartsWith,
  cachePinWhereKeyStartsWith,
} from "./cache-manager";
import {
  isCacheableGet,
  isQueuable,
  isFireAndForget,
  lessonIdFromEndpoint,
  isCurriculumScope,
} from "./cache-policy";
import { currentUserScope } from "./scope";
import { enqueueSubmission, clearQueueForUser } from "./queue";
import { initSyncEngine, registerBackgroundSync } from "./sync-engine";
import { onLessonOpened } from "./prefetch";
import { useAuthStore } from "@/lib/auth-store";

export interface OfflineEnqueueResult {
  queued: boolean;
  fireAndForget: boolean;
}

/** Return cached structured data for a cacheable GET, or null. */
export async function offlineGetFromCache(endpoint: string): Promise<unknown> {
  try {
    if (!isCacheableGet(endpoint)) return null;
    const scope = currentUserScope();
    return await cacheGet(`${scope}:${endpoint.replace(/\?.*$/, "")}`);
  } catch {
    return null;
  }
}

/** Store a successful cacheable GET response for offline use. */
export async function offlineCacheResponse(endpoint: string, data: unknown): Promise<void> {
  try {
    if (!isCacheableGet(endpoint)) return;
    const scope = currentUserScope();
    await cachePut(`${scope}:${endpoint.replace(/\?.*$/, "")}`, data);
  } catch {
    // best-effort
  }
}

/**
 * Queue a mutation made while offline. Returns whether it was queued and
 * whether the caller can treat it as successful (fire-and-forget autosave).
 */
export async function offlineEnqueueSubmission(
  submission: { method: string; endpoint: string; body?: unknown },
): Promise<OfflineEnqueueResult | null> {
  try {
    if (!isQueuable(submission.endpoint)) return null;
    const id = await enqueueSubmission(submission);
    if (!id) return null;
    void registerBackgroundSync();
    return { queued: true, fireAndForget: isFireAndForget(submission.endpoint) };
  } catch {
    return null;
  }
}

/**
 * Invalidate exactly the cached data affected by a mutation (teacher edits a
 * lesson → only that lesson is dropped, never the whole cache).
 */
export async function offlineInvalidateAfterMutation(endpoint: string): Promise<void> {
  try {
    const scope = currentUserScope();
    const lessonId = lessonIdFromEndpoint(endpoint);
    if (lessonId) {
      await Promise.all([
        cacheDeleteWhereKeyStartsWith(`${scope}:/lessons/${lessonId}`),
        cacheDeleteWhereKeyStartsWith(`${scope}:/quizzes/${lessonId}`),
        cacheDeleteWhereKeyStartsWith(`${scope}:/homework/${lessonId}`),
      ]);
      return;
    }
    if (isCurriculumScope(endpoint)) {
      await Promise.all([
        cacheDeleteWhereKeyStartsWith(`${scope}:/curriculum`),
        cacheDeleteWhereKeyStartsWith(`${scope}:/units`),
      ]);
    }
  } catch {
    // best-effort
  }
}

/**
 * After a lesson detail GET succeeds: pin it against eviction and prefetch
 * its resources plus the following lessons in the background.
 */
export async function offlineAfterLessonGet(endpoint: string): Promise<void> {
  try {
    const lessonId = lessonIdFromEndpoint(endpoint);
    if (!lessonId || !/^\/lessons\/[^/?#]+$/.test(endpoint.replace(/\?.*$/, ""))) return;
    const scope = currentUserScope();
    await cachePinWhereKeyStartsWith(`${scope}:/lessons/${lessonId}`);
    onLessonOpened(lessonId);
  } catch {
    // best-effort
  }
}

/** Remove every cached/queued entry belonging to a user (called on logout). */
export async function clearUserCache(userId: string): Promise<void> {
  await Promise.all([
    cacheDeleteWhereKeyStartsWith(`${userId}:`),
    clearQueueForUser(userId),
  ]);
}

let inited = false;

/** Attach connectivity + auth listeners once (idempotent, safe on SSR). */
export function initOfflineEngine(): void {
  if (inited || typeof window === "undefined") return;
  inited = true;
  initSyncEngine();
  useAuthStore.subscribe((state, prev) => {
    const prevId = prev.user?.id;
    const nextId = state.user?.id;
    if (prevId && nextId !== prevId) {
      void clearUserCache(prevId);
    }
  });
}

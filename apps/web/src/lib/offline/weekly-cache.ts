"use client";

import { cachePinWhereKeyStartsWith } from "./cache-manager";
import { currentUserScope, scopeKey } from "./scope";
import { prefetchLessonResources } from "./prefetch";

/**
 * Weekly Cache — architecture scaffold (Phase 1).
 *
 * Intentionally DISABLED. When enabled, the platform caches every lesson
 * scheduled for the current week ahead of time so a whole week of study is
 * available offline. Pinned week entries are exempt from LRU eviction.
 */
export const WEEKLY_CACHE_ENABLED = false;

/** Weekly schedule plan — the IDs of lessons scheduled for the current week. */
export function getCurrentWeekLessonIds(): string[] {
  // Placeholder for the future scheduler. When weekly schedules are
  // introduced, return the scheduled lesson ids for the current week.
  return [];
}

/** Pin cached entries for the current week so LRU eviction never removes them. */
export async function pinCurrentWeek(): Promise<void> {
  const scope = currentUserScope();
  await Promise.all(
    getCurrentWeekLessonIds().map((lessonId) =>
      cachePinWhereKeyStartsWith(`${scope}:/lessons/${lessonId}`),
    ),
  );
}

/** Runtime guard so the disabled flag can never be tree-shaken away. */
function isWeeklyCacheEnabled(): boolean {
  return WEEKLY_CACHE_ENABLED;
}

/**
 * Cache all lessons scheduled for the current week. No-op while disabled.
 * Callers must never invoke this directly — it is gated by WEEKLY_CACHE_ENABLED.
 */
export async function cacheCurrentWeek(): Promise<void> {
  if (!isWeeklyCacheEnabled()) return;
  const lessonIds = getCurrentWeekLessonIds();
  await Promise.allSettled(lessonIds.map((id) => prefetchLessonResources(id)));
  await pinCurrentWeek();
}

/** Query the lesson key prefix for pinning / reporting. */
export function weekLessonScopeKey(scope: string, lessonId: string): string {
  return scopeKey(scope, `/lessons/${lessonId}`);
}

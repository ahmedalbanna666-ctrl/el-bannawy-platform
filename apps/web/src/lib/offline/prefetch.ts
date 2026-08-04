"use client";

import { cachePut, cacheGet } from "./cache-manager";
import { currentScopeKey } from "./scope";
import { isCacheableGet } from "./cache-policy";

interface LessonSummaryNode {
  id: string;
  displayOrder?: number;
  lessons?: LessonSummaryNode[];
  units?: { id: string; lessons?: LessonSummaryNode[] }[];
  grades?: { units?: { id: string; lessons?: LessonSummaryNode[] }[] }[];
}

const PREFETCH_GUARD_KEY = "el-bannawy:prefetched-lessons";
const NEXT_LESSON_COUNT = 2;

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";
}

function alreadyPrefetched(lessonId: string): boolean {
  try {
    const raw = sessionStorage.getItem(PREFETCH_GUARD_KEY) ?? "";
    return raw.split(",").includes(lessonId);
  } catch {
    return false;
  }
}

function markPrefetched(lessonId: string): void {
  try {
    const raw = sessionStorage.getItem(PREFETCH_GUARD_KEY) ?? "";
    const next = raw ? `${raw},${lessonId}` : lessonId;
    sessionStorage.setItem(PREFETCH_GUARD_KEY, next);
  } catch {
    // no-op
  }
}

/** Background GET that writes its (cacheable) response into the lesson cache. */
async function backgroundGet(endpoint: string): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl()}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
    });
    if (!response.ok) return;
    const data: unknown = await response.json();
    if (isCacheableGet(endpoint)) {
      await cachePut(currentScopeKey(endpoint), data);
    }
  } catch {
    // Background prefetch is best-effort.
  }
}

/**
 * Cache everything needed to study lesson N offline: vocabulary, games,
 * quiz structure and homework structure. Runs in the background once per
 * lesson per session.
 */
export async function prefetchLessonResources(lessonId: string): Promise<void> {
  if (alreadyPrefetched(lessonId)) return;
  const endpoints = [
    `/lessons/${lessonId}/vocabulary`,
    `/lessons/${lessonId}/games`,
    `/quizzes/${lessonId}`,
    `/homework/${lessonId}`,
  ];
  await Promise.allSettled(endpoints.map((endpoint) => backgroundGet(endpoint)));
  markPrefetched(lessonId);
}

async function readCurriculum(): Promise<unknown> {
  const cached = await cacheGet(currentScopeKey("/curriculum"));
  if (cached) return cached;
  try {
    const response = await fetch(`${apiBaseUrl()}/curriculum`, {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    await cachePut(currentScopeKey("/curriculum"), data);
    return data;
  } catch {
    return null;
  }
}

function collectLessonIdsFromCurriculum(curriculum: unknown): string[] {
  const ids: string[] = [];
  const stages = Array.isArray(curriculum) ? (curriculum as LessonSummaryNode[]) : [];
  for (const stage of stages) {
    for (const grade of stage.grades ?? []) {
      for (const unit of grade.units ?? []) {
        for (const lesson of unit.lessons ?? []) {
          ids.push(lesson.id);
        }
      }
    }
  }
  return ids;
}

/**
 * Prefetch the next N lessons (metadata + resources) so the student can keep
 * studying offline after finishing the current lesson. Derives the order from
 * the cached curriculum.
 */
export async function prefetchNextLessons(lessonId: string): Promise<void> {
  try {
    const curriculum = await readCurriculum();
    if (!curriculum) return;
    const orderedIds = collectLessonIdsFromCurriculum(curriculum);
    const index = orderedIds.indexOf(lessonId);
    if (index < 0) return;
    const nextIds = orderedIds.slice(index + 1, index + 1 + NEXT_LESSON_COUNT);
    await Promise.allSettled(
      nextIds.flatMap((id) => [
        backgroundGet(`/lessons/${id}`),
        prefetchLessonResources(id),
      ]),
    );
  } catch {
    // best-effort
  }
}

/**
 * Called by the API layer after a lesson detail GET succeeds: cache the
 * lesson's own resources and prefetch the following lessons in the background.
 */
export function onLessonOpened(lessonId: string): void {
  void prefetchLessonResources(lessonId);
  void prefetchNextLessons(lessonId);
}

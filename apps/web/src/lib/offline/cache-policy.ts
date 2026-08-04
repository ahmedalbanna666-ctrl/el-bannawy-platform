"use client";

/**
 * Cache policy — classifies API endpoints so the offline engine knows:
 *  - which GET responses to store (Smart Lesson Cache)
 *  - which mutations to queue when offline (offline submission)
 *  - which endpoint to invalidate on a mutation (per-lesson invalidation)
 *
 * Never lists sensitive or stateful endpoints (auth, profile, wallet, coins,
 * leaderboard, notifications, payments, reports, AI, live classes).
 */

export type QueueKind = "mergeable" | "unique";

export interface QueuePolicy {
  kind: QueueKind;
}

/** Endpoints whose GET responses should be written to the lesson cache. */
const CACHEABLE_GET_PATTERNS: readonly RegExp[] = [
  /^\/lessons\/[^/?#]+$/,
  /^\/lessons\/[^/?#]+\/(vocabulary|games)$/,
  /^\/quizzes\/[^/?#]+$/,
  /^\/quizzes\/[^/?#]+\/questions$/,
  /^\/homework\/[^/?#]+$/,
  /^\/homework\/[^/?#]+\/questions$/,
  /^\/curriculum\/?$/,
  /^\/curriculum\/units\/?.*$/,
  /^\/units\/?$/,
  /^\/units\/[^/?#]+$/,
  /^\/mistakes\/?$/,
  /^\/mistakes\/filters$/,
  /^\/mistakes\/mini-exam\/[^/?#]+$/,
];

/**
 * Mutations that may be queued locally when offline. `mergeable` entries are
 * collapsed to a single latest entry (e.g. progress saves), `unique` entries
 * are queued once each.
 */
const QUEUABLE_PATTERNS: readonly { pattern: RegExp; kind: QueueKind }[] = [
  { pattern: /^\/homework\/[^/?#]+\/save$/, kind: "mergeable" },
  { pattern: /^\/homework\/[^/?#]+\/start$/, kind: "unique" },
  { pattern: /^\/homework\/[^/?#]+\/submit$/, kind: "unique" },
  { pattern: /^\/quizzes\/[^/?#]+\/save$/, kind: "mergeable" },
  { pattern: /^\/quizzes\/[^/?#]+\/start$/, kind: "unique" },
  { pattern: /^\/quizzes\/[^/?#]+\/submit$/, kind: "unique" },
  { pattern: /^\/videos\/[^/?#]+\/progress$/, kind: "mergeable" },
  { pattern: /^\/videos\/[^/?#]+\/complete$/, kind: "unique" },
];

/**
 * Fire-and-forget mutations: when queued offline, the caller receives a
 * synthetic success so the UI is unaffected (autosave / progress).
 */
const FIRE_AND_FORGET_PATTERNS: readonly RegExp[] = [
  /^\/homework\/[^/?#]+\/save$/,
  /^\/homework\/[^/?#]+\/start$/,
  /^\/quizzes\/[^/?#]+\/save$/,
  /^\/quizzes\/[^/?#]+\/start$/,
  /^\/videos\/[^/?#]+\/progress$/,
  /^\/videos\/[^/?#]+\/complete$/,
];

/** Normalise an endpoint for use as a cache key (query strings removed). */
export function normalizeEndpoint(endpoint: string): string {
  const index = endpoint.indexOf("?");
  return index >= 0 ? endpoint.slice(0, index) : endpoint;
}

export function isCacheableGet(endpoint: string): boolean {
  const normalized = normalizeEndpoint(endpoint);
  return CACHEABLE_GET_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isQueuable(endpoint: string): QueuePolicy | null {
  const normalized = normalizeEndpoint(endpoint);
  const match = QUEUABLE_PATTERNS.find((entry) => entry.pattern.test(normalized));
  return match ? { kind: match.kind } : null;
}

export function isFireAndForget(endpoint: string): boolean {
  const normalized = normalizeEndpoint(endpoint);
  return FIRE_AND_FORGET_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Extract the owning lesson id from an endpoint so per-lesson invalidation
 * can remove exactly the right cache entries.
 */
export function lessonIdFromEndpoint(endpoint: string): string | null {
  const normalized = normalizeEndpoint(endpoint);
  const lesson = /^\/lessons\/([^/?#]+)/.exec(normalized);
  if (lesson) return lesson[1];
  const quiz = /^\/quizzes\/([^/?#]+)/.exec(normalized);
  if (quiz) return quiz[1];
  const homework = /^\/homework\/([^/?#]+)/.exec(normalized);
  if (homework) return homework[1];
  const curriculumLesson = /^\/curriculum\/lessons\/([^/?#]+)/.exec(normalized);
  if (curriculumLesson) return curriculumLesson[1];
  return null;
}

/** True for curriculum/unit-level endpoints (invalidating those clears the tree). */
export function isCurriculumScope(endpoint: string): boolean {
  const normalized = normalizeEndpoint(endpoint);
  return normalized.startsWith("/curriculum") || normalized.startsWith("/units");
}

"use client";

/**
 * Public API for the Offline & Smart Cache Engine (Phase 1).
 */

export {
  initOfflineEngine,
  clearUserCache,
  offlineGetFromCache,
  offlineCacheResponse,
  offlineEnqueueSubmission,
  offlineInvalidateAfterMutation,
  offlineAfterLessonGet,
} from "./integration";

export {
  cachePut,
  cacheGet,
  cacheClear,
  cacheEntries,
  cacheTotalSize,
  CACHE_QUOTA_BYTES,
} from "./cache-manager";

export {
  enqueueSubmission,
  pendingSubmissions,
  removeSubmission,
  pendingCount,
} from "./queue";

export {
  runSync,
  registerBackgroundSync,
  type SyncResult,
} from "./sync-engine";

export {
  prefetchLessonResources,
  prefetchNextLessons,
} from "./prefetch";

export {
  WEEKLY_CACHE_ENABLED,
  cacheCurrentWeek,
  pinCurrentWeek,
} from "./weekly-cache";

export { __resetBackendForTests } from "./db";

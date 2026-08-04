"use client";

import { useAuthStore } from "@/lib/auth-store";
import { normalizeEndpoint } from "./cache-policy";

/** Per-user namespace so cached data never leaks between accounts. */
export function currentUserScope(): string {
  return useAuthStore.getState().user?.id ?? "anon";
}

/** Build a fully-qualified cache key for the given user scope + endpoint. */
export function scopeKey(scope: string, endpoint: string): string {
  return `${scope}:${normalizeEndpoint(endpoint)}`;
}

/** Fully-qualified cache key for the current user + endpoint. */
export function currentScopeKey(endpoint: string): string {
  return scopeKey(currentUserScope(), endpoint);
}

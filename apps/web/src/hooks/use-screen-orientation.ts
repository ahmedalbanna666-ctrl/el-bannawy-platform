"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "el-bannawy:auto-rotate";

interface OrientationLike {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

function getOrientation(): OrientationLike | null {
  if (typeof screen === "undefined") return null;
  return (screen as unknown as { orientation?: OrientationLike }).orientation ?? null;
}

// ── Global "auto-rotate" preference (module store) ────────────────────────
// Controls rotation for the WHOLE platform. The video player is untouched:
// its fullscreen still forces landscape and its exit calls lockPortrait(),
// which simply respects this preference (no-op when rotation is enabled).
let rotationEnabled = false;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    rotationEnabled = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    rotationEnabled = false;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Current auto-rotate preference (false = platform stays portrait). */
export function isRotationEnabled(): boolean {
  ensureInitialized();
  return rotationEnabled;
}

function subscribe(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  return (): void => { listeners.delete(listener); };
}

function serverSnapshot(): boolean {
  return false;
}

/** Reactive hook for the header toggle. */
export function useRotationEnabled(): boolean {
  return useSyncExternalStore(subscribe, isRotationEnabled, serverSnapshot);
}

function lockPortraitDirect(): void {
  const attempt = (): void => {
    try {
      const ori = getOrientation();
      const result = ori?.lock?.("portrait");
      if (result) {
        void result.catch((): void => {
          // Some browsers reject if the layout isn't settled — retry once.
          window.setTimeout(attempt, 250);
        });
      }
    } catch {
      // unsupported (iOS / older browsers) — the phone keeps its default
    }
  };
  attempt();
}

/** Force landscape (left or right) — used when the video goes fullscreen. */
export function lockLandscape(): void {
  try {
    const ori = getOrientation();
    void ori?.lock?.("landscape").catch((): void => undefined);
  } catch {
    // unsupported (iOS / older browsers) — the phone keeps its default
  }
}

/** Release any orientation lock so the phone can rotate freely. */
export function allowRotation(): void {
  try {
    getOrientation()?.unlock?.();
  } catch {
    // ignore
  }
}

/**
 * Lock the platform to portrait. No-op when the user enabled auto-rotate via
 * the header toggle — this is also what the video player calls on fullscreen
 * exit, so it adapts to the preference without any video code changes.
 */
export function lockPortrait(): void {
  if (isRotationEnabled()) return;
  lockPortraitDirect();
}

function applyRotationPreference(): void {
  if (isRotationEnabled()) {
    allowRotation();
  } else {
    lockPortraitDirect();
  }
}

/** Turn the platform auto-rotation on/off (header toggle). */
export function setRotationEnabled(enabled: boolean): void {
  ensureInitialized();
  if (rotationEnabled === enabled) return;
  rotationEnabled = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
  emit();
  applyRotationPreference();
}

/**
 * Mounted once in the root layout. Locks the platform to portrait by default
 * (or keeps the user's stored preference). Any rotation that happens outside
 * video fullscreen is corrected immediately.
 */
export function usePortraitLock(): void {
  useEffect(() => {
    ensureInitialized();
    applyRotationPreference();
    const lock = (): void => {
      // Never fight the video player's fullscreen rotation.
      if (typeof document !== "undefined" && document.fullscreenElement) return;
      lockPortrait();
    };
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") lock();
    };
    const onOrientationChange = (): void => {
      // Outside fullscreen the app must respect the preference immediately.
      window.setTimeout(lock, 0);
    };
    const onResize = (): void => {
      // A rotation attempt usually also fires resize — re-assert the lock.
      if (!document.fullscreenElement) lockPortrait();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", lock);
    window.addEventListener("orientationchange", onOrientationChange);
    window.addEventListener("resize", onResize);
    return (): void => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", lock);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}

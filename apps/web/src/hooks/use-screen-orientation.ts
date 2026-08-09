"use client";

import { useEffect } from "react";

interface OrientationLike {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

function getOrientation(): OrientationLike | null {
  if (typeof screen === "undefined") return null;
  return (screen as unknown as { orientation?: OrientationLike }).orientation ?? null;
}

/** Lock the screen to portrait (platform default). */
export function lockPortrait(): void {
  try {
    const ori = getOrientation();
    void ori?.lock?.("portrait").catch((): void => undefined);
  } catch {
    // unsupported (iOS / older browsers) — the phone keeps its default
  }
}

/** Release the portrait lock so the phone can rotate freely (video fullscreen). */
export function allowRotation(): void {
  try {
    getOrientation()?.unlock?.();
  } catch {
    // ignore
  }
}

/**
 * Lock the whole platform to portrait so the app never auto-rotates. The only
 * exception is the video player's fullscreen, which calls allowRotation() while
 * fullscreen is active — the lock is never reapplied behind an active
 * fullscreen (checked via document.fullscreenElement).
 */
export function usePortraitLock(): void {
  useEffect(() => {
    const lock = (): void => {
      // Never fight the video player's fullscreen rotation.
      if (typeof document !== "undefined" && document.fullscreenElement) return;
      lockPortrait();
    };
    lock();
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") lock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", lock);
    return (): void => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", lock);
    };
  }, []);
}

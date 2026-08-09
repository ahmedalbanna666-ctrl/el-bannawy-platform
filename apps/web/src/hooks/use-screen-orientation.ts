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

/** Force landscape (left or right) — used when the video goes fullscreen. */
export function lockLandscape(): void {
  try {
    const ori = getOrientation();
    void ori?.lock?.("landscape").catch((): void => undefined);
  } catch {
    // unsupported (iOS / older browsers) — the phone keeps its default
  }
}

/** Release the portrait lock so the phone can rotate freely. */
export function allowRotation(): void {
  try {
    getOrientation()?.unlock?.();
  } catch {
    // ignore
  }
}

/**
 * Lock the whole platform to portrait so the app never auto-rotates. The only
 * exception is the video player's fullscreen, which locks landscape while
 * fullscreen is active — the portrait lock is never reapplied behind an active
 * fullscreen (checked via document.fullscreenElement), and any rotation that
 * happens outside fullscreen is corrected immediately.
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
    const onOrientationChange = (): void => {
      // Outside fullscreen the app must always come back to portrait.
      window.setTimeout(lock, 0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", lock);
    window.addEventListener("orientationchange", onOrientationChange);
    return (): void => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", lock);
      window.removeEventListener("orientationchange", onOrientationChange);
    };
  }, []);
}

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
 * Lock the platform to portrait — ALWAYS. Also used by the video player on
 * fullscreen exit, so the video restores portrait regardless of anything else.
 */
export function lockPortrait(): void {
  lockPortraitDirect();
}

/**
 * Mounted once in the root layout. Keeps the whole platform locked to
 * portrait — no auto-rotation anywhere. The only exception is the video
 * player's fullscreen, which temporarily forces landscape while active;
 * the portrait lock is never reapplied behind an active fullscreen, and any
 * rotation that happens outside fullscreen is corrected immediately.
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
      // Outside fullscreen the app must always come back to portrait. Give the
      // fullscreen transition a moment so the video lock isn't fought.
      window.setTimeout(lock, 60);
    };
    const onResize = (): void => {
      // A rotation attempt usually also fires resize — re-assert the lock,
      // but only after fullscreen has had a chance to settle.
      window.setTimeout(() => {
        if (!document.fullscreenElement) lockPortrait();
      }, 60);
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

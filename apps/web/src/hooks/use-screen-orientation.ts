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

/**
 * Lock the whole platform to portrait so the app never auto-rotates — no
 * rotation anywhere, not even on content screens. Re-applies the lock when
 * the app returns to the foreground so a rotation can never slip in.
 */
export function usePortraitLock(): void {
  useEffect(() => {
    const lock = (): void => {
      try {
        const ori = getOrientation();
        void ori?.lock?.("portrait").catch((): void => undefined);
      } catch {
        // unsupported (iOS / older browsers) — the phone keeps its default
      }
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

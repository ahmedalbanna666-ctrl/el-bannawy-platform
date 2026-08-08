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

/** Keep the platform locked to portrait so the app never rotates on its own. */
function lockPortrait(): void {
  try {
    const ori = getOrientation();
    void ori?.lock?.("portrait").catch((): void => undefined);
  } catch {
    // unsupported (iOS / older browsers) — the phone keeps its default
  }
}

/** Release the portrait lock so the phone can rotate freely. */
function unlockOrientation(): void {
  try {
    getOrientation()?.unlock?.();
  } catch {
    // ignore
  }
}

/**
 * Lock the whole platform to portrait. Mount once in the root layout so the
 * app never auto-rotates; content screens opt back in via useAllowRotation().
 */
export function usePortraitLock(): void {
  useEffect(() => {
    lockPortrait();
  }, []);
}

/**
 * Allow the phone to rotate freely while the current screen is mounted
 * (video lesson, exam/quiz, homework, PDF). The portrait lock is restored as
 * soon as the screen is unmounted.
 */
export function useAllowRotation(): void {
  useEffect(() => {
    unlockOrientation();
    return (): void => {
      lockPortrait();
    };
  }, []);
}

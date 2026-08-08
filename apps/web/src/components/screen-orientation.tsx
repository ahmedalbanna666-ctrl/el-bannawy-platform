"use client";

import { usePortraitLock } from "@/hooks/use-screen-orientation";

/**
 * Mounted once in the root layout: locks the whole platform to portrait so
 * the app does not auto-rotate anywhere.
 */
export function PlatformOrientation(): null {
  usePortraitLock();
  return null;
}

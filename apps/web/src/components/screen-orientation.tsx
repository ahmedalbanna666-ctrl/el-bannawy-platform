"use client";

import { useAllowRotation, usePortraitLock } from "@/hooks/use-screen-orientation";

/**
 * Mounted once in the root layout: locks the whole platform to portrait so
 * the app does not auto-rotate.
 */
export function PlatformOrientation(): null {
  usePortraitLock();
  return null;
}

/**
 * Mounted on content screens (video / exam / homework / PDF): lets the phone
 * rotate freely while the screen is open, then restores the portrait lock.
 */
export function AllowRotation(): null {
  useAllowRotation();
  return null;
}

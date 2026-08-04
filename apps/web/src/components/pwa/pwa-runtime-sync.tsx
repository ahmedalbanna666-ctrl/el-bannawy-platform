"use client";

import { useEffect, type ReactNode } from "react";
import { usePwaMode } from "@/lib/use-pwa-mode";
import { useTheme } from "@/providers/theme-provider";

/**
 * Applies runtime optimizations only when the app runs as an installed PWA:
 * - Keeps body padding/scroll in sync with installed display modes.
 * - Locks the page from scrolling while a native fullscreen element is open.
 * - Ensures the body background bleeds into the status bar / nav bar safe areas.
 */
export function PwaRuntimeSync(): ReactNode {
  const { isInstalled } = usePwaMode();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isInstalled) return;

    const onFullscreen = (): void => {
      const active = Boolean(document.fullscreenElement);
      document.documentElement.classList.toggle("elb-overflow-hidden", active);
    };

    document.addEventListener("fullscreenchange", onFullscreen);
    return (): void => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.documentElement.classList.remove("elb-overflow-hidden");
    };
  }, [isInstalled]);

  // Keep the Android status bar / nav bar color in sync with the active theme.
  useEffect(() => {
    const color = theme === "dark" ? "#0a0e1a" : "#f8fafc";
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = color;
  }, [theme]);

  return null;
}

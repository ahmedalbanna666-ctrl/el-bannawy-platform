"use client";

import { useEffect, useState } from "react";

export interface PwaMode {
  /** True when running as an installed PWA (display-mode standalone/fullscreen/minimal-ui). */
  isInstalled: boolean;
  /** True when the app is displayed fullscreen (no browser/status bar artifacts). */
  isFullscreen: boolean;
  /** True when the app is embedded in a window-controls-overlay (desktop PWA). */
  hasWindowControlsOverlay: boolean;
}

const FALLBACK: PwaMode = {
  isInstalled: false,
  isFullscreen: false,
  hasWindowControlsOverlay: false,
};

function readDisplayMode(): string {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "";
  try {
    const query = window.matchMedia("(display-mode: standalone)");
    return query.matches ? "standalone" : "";
  } catch {
    return "";
  }
}

function isFullscreenMode(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(display-mode: fullscreen)").matches;
  } catch {
    return false;
  }
}

function hasWindowControlsOverlay(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { windowControlsOverlay?: { visible: boolean } };
  return Boolean(nav.windowControlsOverlay?.visible);
}

function compute(): PwaMode {
  const displayMode = readDisplayMode();
  return {
    isInstalled: Boolean(displayMode) || hasWindowControlsOverlay(),
    isFullscreen: isFullscreenMode(),
    hasWindowControlsOverlay: hasWindowControlsOverlay(),
  };
}

/**
 * Reactive detection of the installed PWA runtime.
 *
 * Returns `{ isInstalled, isFullscreen, hasWindowControlsOverlay }` and updates
 * whenever the browser enters/leaves installed display modes (e.g. after
 * installing the app, or switching from browser tab to standalone window).
 */
export function usePwaMode(): PwaMode {
  const [mode, setMode] = useState<PwaMode>(FALLBACK);

  useEffect(() => {
    setMode(compute());

    const mediaQueries = [
      "(display-mode: standalone)",
      "(display-mode: fullscreen)",
      "(display-mode: minimal-ui)",
      "(display-mode: window-controls-overlay)",
    ];

    const handlers: MediaQueryList[] = [];
    const onChange = (): void => { setMode(compute()); };

    for (const mq of mediaQueries) {
      const list = window.matchMedia(mq);
      list.addEventListener("change", onChange);
      handlers.push(list);
    }

    const onVisibility = (): void => { setMode(compute()); };
    window.addEventListener("visibilitychange", onVisibility);

    return (): void => {
      for (const list of handlers) {
        list.removeEventListener("change", onChange);
      }
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return mode;
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export function RouteTransitionLoader(): ReactNode {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const [committed, setCommitted] = useState(true);
  const firstRender = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Link / anchor click → show the indicator instantly, before the route commits.
  useEffect((): (() => void) => {
    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setCommitted(false);
      setNavigating(true);
    };

    document.addEventListener("click", onClick);
    return (): void => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  // Route committed (covers Link clicks AND programmatic router.push).
  useEffect((): (() => void) => {
    if (firstRender.current) {
      firstRender.current = false;
    } else {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setCommitted(true);
      setNavigating(true);
    }
    return (): void => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  // Hide as soon as the page appears (route committed), with a tiny grace delay.
  useEffect((): (() => void) => {
    if (navigating && committed) {
      const t = setTimeout((): void => {
        setNavigating(false);
      }, 200);
      timerRef.current = t;
      return (): void => {
        clearTimeout(t);
      };
    }
    return (): void => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [navigating, committed]);

  // Safety net: never let the indicator hang forever.
  useEffect((): (() => void) => {
    if (navigating) {
      const t = setTimeout((): void => {
        setNavigating(false);
      }, 8000);
      return (): void => {
        clearTimeout(t);
      };
    }
    return (): void => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [navigating]);

  if (!navigating) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] flex items-center justify-center">
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg dark:bg-neutral-900/90">
        <Spinner size="md" />
        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">جاري التحميل...</span>
      </div>
    </div>
  );
}

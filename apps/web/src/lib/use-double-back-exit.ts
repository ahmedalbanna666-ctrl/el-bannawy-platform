"use client";

import { useEffect, useRef } from "react";

const EXIT_WINDOW_MS = 2000;

interface UseDoubleBackExitOptions {
  active: boolean;
  message: string;
  onExit?: () => void;
}

export function useDoubleBackExit({ active, message, onExit }: UseDoubleBackExitOptions): void {
  const exitAllowedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const messageRef = useRef(message);
  const onExitRef = useRef(onExit);

  messageRef.current = message;
  onExitRef.current = onExit;

  useEffect(() => {
    if (!active) return;

    const handlePopState = (): void => {
      if (exitAllowedRef.current) {
        exitAllowedRef.current = false;
        return;
      }

      window.history.go(1);
      exitAllowedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        exitAllowedRef.current = false;
      }, EXIT_WINDOW_MS);

      void import("sonner").then(({ toast }) => {
        toast(messageRef.current);
      });
    };

    window.addEventListener("popstate", handlePopState);

    return (): void => {
      window.removeEventListener("popstate", handlePopState);
      if (timerRef.current) clearTimeout(timerRef.current);
      exitAllowedRef.current = false;
    };
  }, [active]);
}

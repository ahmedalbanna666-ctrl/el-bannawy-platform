"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { SplashScreen } from "./splash-screen";
import { WelcomeNotification } from "./welcome-notification";

const SPLASH_SEEN_KEY = "el-bannawy:splash-seen";

export function SplashProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [shouldShow, setShouldShow] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // ignore storage failures
    }
    setShouldShow(true);
  }, []);

  const registerSw = useCallback(async (): Promise<void> => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      if (registration.active) {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (installing) {
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                console.warn("PWA update available");
              }
            });
          }
        });
      }
    } catch {
      // SW registration failed silently
    }
  }, []);

  useEffect(() => {
    void registerSw();
  }, [registerSw]);

  return (
    <>
      {shouldShow && !splashDone && <SplashScreen onFinish={() => { setSplashDone(true); }} />}
      {children}
      {splashDone && <WelcomeNotification />}
    </>
  );
}

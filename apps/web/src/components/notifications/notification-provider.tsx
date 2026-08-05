"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

// Lazily imported only for authenticated sessions so public/auth pages never
// download the Firebase runtime.
const FIREBASE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);

export function NotificationProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    if (!FIREBASE_CONFIGURED) return;

    let unsub: (() => void) | null = null;

    async function initialize(): Promise<void> {
      try {
        const { isPushSupported, enableWebPush, onForegroundMessage } = await import("@/lib/firebase-messaging");
        if (!isPushSupported()) return;

        await navigator.serviceWorker.register("/sw.js");

        unsub = onForegroundMessage((payload: { title?: string; body?: string }): void => {
          if (payload.title) {
            (toast as (message: string, options?: Record<string, unknown>) => void)(payload.title, {
              description: payload.body,
              duration: 5000,
            });
          }
        });

        // If the user already granted permission (e.g. via the preferences
        // page), (re)register the current token so pushes keep flowing.
        if (Notification.permission === "granted") {
          const result = await enableWebPush();
          if (result.ok && result.token) {
            await api.post("/notifications/device-token", {
              token: result.token,
              platform: "WEB",
            });
          }
        }
      } catch {
        // FCM setup failed silently
      }
    }

    void initialize();

    return (): void => {
      if (unsub) unsub();
    };
  }, [user]);

  return <>{children}</>;
}

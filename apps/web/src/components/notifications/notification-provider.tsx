"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { isFirebaseConfigured } from "@/lib/firebase-config";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase-messaging";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export function NotificationProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    if (!isFirebaseConfigured()) return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    let unsub: (() => void) | null = null;

    async function initialize(): Promise<void> {
      try {
        await navigator.serviceWorker.register("/sw.js");

        unsub = onForegroundMessage((payload: { title?: string; body?: string }): void => {
          if (payload.title) {
            (toast as (message: string, options?: Record<string, unknown>) => void)(payload.title, {
              description: payload.body,
              duration: 5000,
            });
          }
        });

        if (Notification.permission === "granted") {
          const token = await requestFcmToken();
          if (token) {
            await api.post("/notifications/device-token", {
              token,
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

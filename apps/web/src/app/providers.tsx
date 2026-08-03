"use client";

import { Suspense, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { UiSettingsProvider } from "@/lib/use-ui-settings";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryProvider>
      <ThemeProvider>
        <UiSettingsProvider>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>}>
            <AuthProvider>
              <NotificationProvider>
                {children}
                <PwaInstallPrompt />
              </NotificationProvider>
            </AuthProvider>
          </Suspense>
          <Toaster position="top-center" richColors closeButton />
        </UiSettingsProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

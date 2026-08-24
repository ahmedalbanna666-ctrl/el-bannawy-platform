"use client";

import { Suspense, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PwaRuntimeSync } from "@/components/pwa/pwa-runtime-sync";
import { UiSettingsProvider } from "@/lib/use-ui-settings";
import { RouteTransitionLoader } from "@/components/ui/route-transition-loader";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryProvider>
      <ThemeProvider>
        <UiSettingsProvider>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>}>
            <AuthProvider>
              <NotificationProvider>
                {children}
                <PwaRuntimeSync />
                <PwaInstallPrompt />
              </NotificationProvider>
            </AuthProvider>
          </Suspense>
          <Toaster position="top-center" richColors closeButton />
          <RouteTransitionLoader />
        </UiSettingsProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

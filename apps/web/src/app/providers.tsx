"use client";

import { Suspense, type ReactNode } from "react";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryProvider>
      <ThemeProvider>
        <Suspense>
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </ThemeProvider>
    </QueryProvider>
  );
}

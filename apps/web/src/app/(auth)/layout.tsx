"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardBorderScope } from "@/components/ui/card-border-scope";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Authenticated OAuth users who still need to complete their profile are
    // allowed to stay on /register?oauth=... — only redirect the rest.
    const isOAuthCompletion =
      typeof window !== "undefined" &&
      window.location.pathname === "/register" &&
      new URLSearchParams(window.location.search).get("oauth") !== null;
    if (isAuthenticated && !isOAuthCompletion) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
        <Skeleton className="h-8 w-48" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-md">
        <ErrorBoundary>
          <CardBorderScope>
            {children}
          </CardBorderScope>
        </ErrorBoundary>
      </div>
    </main>
  );
}

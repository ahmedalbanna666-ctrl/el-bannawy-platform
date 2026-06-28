"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage(): React.ReactNode {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = document.cookie.includes("auth_token=");
    if (token || isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 py-16">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-6 w-64" />
    </main>
  );
}

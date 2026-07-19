"use client";

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Award,
  Trophy,
  Flame,
  Star,
  Target,
  Zap,
  BookOpen,
  Crown,
  Medal,
  type LucideIcon,
} from "lucide-react";

interface Achievement {
  readonly id: string;
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly earnedAt: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  award: Award,
  trophy: Trophy,
  flame: Flame,
  star: Star,
  target: Target,
  zap: Zap,
  book: BookOpen,
  crown: Crown,
  medal: Medal,
};

function getIcon(name: string | null): LucideIcon {
  const icon = name ? ICON_MAP[name.toLowerCase()] : undefined;
  return icon ?? Award;
}

export default function AchievementsPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const {
    data: achievements,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["achievements", userId],
    queryFn: async (): Promise<Achievement[]> => {
      const res = await api.get<Achievement[]>("/profile/achievements");
      return res.data ?? [];
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  if (isLoading) return <AchievementsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الإنجازات"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
        onRetry={() => { void refetch(); }}
        retryLabel="إعادة المحاولة"
      />
    );
  }

  const list = achievements ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/10">
          <Trophy className="h-6 w-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            الإنجازات
          </h1>
          <p className="text-sm text-neutral-500">
            تابع إنجازاتك التعليمية ومكافآتك
          </p>
        </div>
        <Badge variant="primary" className="ms-auto text-xs">
          {String(list.length)} إنجاز
        </Badge>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-16 w-16" />}
          title="لا توجد إنجازات بعد"
          description="أكمل الدروس والاختبارات لتفتح إنجازاتك التعليمية."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((achievement) => {
            const Icon = getIcon(achievement.icon);
            const earnedDate = new Date(achievement.earnedAt).toLocaleDateString(
              "ar-EG",
              { year: "numeric", month: "long", day: "numeric" },
            );
            return (
              <Card key={achievement.id} variant="elevated" padding="none">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {achievement.title}
                      </h3>
                      {achievement.description && (
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <Badge variant="secondary" className="text-[10px]">
                      {achievement.type}
                    </Badge>
                    <span className="text-[11px] text-neutral-400">
                      {earnedDate}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AchievementsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

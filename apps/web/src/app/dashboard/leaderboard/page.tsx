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
  Trophy,
  Medal,
  Crown,
  Star,
  Coins,
  Flame,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface LeaderboardEntry {
  readonly id: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
  readonly xp: number;
  readonly level: number;
  readonly coins: number;
  readonly rank: number;
}

interface LeaderboardResponse {
  readonly scope: {
    gradeId: string | null;
    academicYearId: string | null;
    termId: string | null;
    educationalSystem: string | null;
  };
  readonly top: readonly LeaderboardEntry[];
  readonly me: (LeaderboardEntry & { total: number }) | null;
}

const PODIUM_STYLES: Record<number, { ring: string; bg: string; icon: LucideIcon; label: string }> = {
  1: {
    ring: "ring-yellow-400/60 shadow-[0_0_30px_rgba(250,204,21,0.35)]",
    bg: "from-yellow-400 to-amber-500",
    icon: Crown,
    label: "البطل",
  },
  2: {
    ring: "ring-neutral-300/60 shadow-[0_0_24px_rgba(212,212,216,0.3)]",
    bg: "from-neutral-200 to-neutral-400",
    icon: Medal,
    label: "الوصيف",
  },
  3: {
    ring: "ring-amber-700/50 shadow-[0_0_24px_rgba(180,83,9,0.3)]",
    bg: "from-amber-600 to-amber-800",
    icon: Medal,
    label: "الثالث",
  },
};

function avatarFor(name: string, url: string | null): string {
  const first = name ? name.split(" ")[0] : "User";
  return (
    url ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(first)}&background=22D3EE&color=fff&bold=true&font-size=0.33&size=128`
  );
}

function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return String(xp);
}

export default function LeaderboardPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard", userId],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const res = await api.get<LeaderboardResponse>("/home/leaderboard");
      if (!res.data) throw new Error("Leaderboard not found");
      return res.data;
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  if (isLoading) return <LeaderboardSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل قائمة العباقرة"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
        onRetry={() => { void refetch(); }}
        retryLabel="إعادة المحاولة"
      />
    );
  }

  const top = data?.top ?? [];
  const me = data?.me ?? null;

  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as readonly LeaderboardEntry[];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              العباقرة
            </h1>
            <p className="text-sm text-neutral-500">
              منافسة العقول الذكية — تصدّر القائمة بجمع نقاط الخبرة
            </p>
          </div>
        </div>
        <Badge variant="info" className="self-start text-xs sm:self-auto">
          <Flame className="h-3.5 w-3.5" />
          ضمن صفك الدراسي
        </Badge>
      </div>

      {top.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-16 w-16" />}
          title="لا يوجد متسابقون بعد"
          description="ابدأ بحل الدروس والاختبارات لكي تظهر في قائمة العباقرة."
        />
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 items-end gap-3">
            {podiumOrder.map((entry) => {
              const style = PODIUM_STYLES[entry.rank] ?? PODIUM_STYLES[3];
              const Icon = style.icon;
              const isMe = entry.id === userId;
              return (
                <Card
                  key={entry.id}
                  variant="elevated"
                  padding="none"
                  className={`relative flex flex-col items-center gap-2 p-4 ring-2 ${style.ring} ${isMe ? "outline outline-2 outline-primary-500" : ""} ${entry.rank === 1 ? "order-2 pb-8" : entry.rank === 2 ? "order-1" : "order-3"}`}
                >
                  <span className="absolute -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-extrabold text-neutral-700 shadow dark:bg-neutral-800 dark:text-neutral-100">
                    {entry.rank}
                  </span>
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${style.bg} text-white`}>
                    <img
                      src={avatarFor(entry.fullName, entry.avatarUrl)}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  </div>
                  <p className="line-clamp-1 max-w-full text-center text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {entry.fullName}
                  </p>
                  <Badge variant="warning" className="text-[10px]">
                    <Star className="h-3 w-3" />
                    مستوى {entry.level}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                    <Zap className="h-3.5 w-3.5" />
                    {formatXp(entry.xp)} XP
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                    <Icon className="h-3 w-3" />
                    {style.label}
                  </span>
                </Card>
              );
            })}
          </div>

          {/* My rank */}
          {me && (
            <Card variant="gradient" padding="none" className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-extrabold">
                  #{me.rank}
                </div>
                <img
                  src={avatarFor(me.fullName, me.avatarUrl)}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{me.fullName}</p>
                  <p className="text-xs text-white/80">
                    ترتيبك بين {me.total} متسابق
                  </p>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Zap className="h-4 w-4" />
                    {formatXp(me.xp)}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Coins className="h-4 w-4" />
                    {me.coins}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Full ranking list */}
          {rest.length > 0 && (
            <Card variant="elevated" padding="none">
              <CardContent className="divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
                {rest.map((entry) => {
                  const isMe = entry.id === userId;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-primary-500/5" : ""}`}
                    >
                      <span className="w-8 shrink-0 text-center text-sm font-extrabold text-neutral-400">
                        {entry.rank}
                      </span>
                      <img
                        src={avatarFor(entry.fullName, entry.avatarUrl)}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {entry.fullName}
                          {isMe && (
                            <span className="ms-2 text-[10px] font-normal text-primary-500">(أنت)</span>
                          )}
                        </p>
                        <Badge variant="secondary" className="mt-0.5 text-[10px]">
                          مستوى {entry.level}
                        </Badge>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                        <Zap className="h-3.5 w-3.5" />
                        {formatXp(entry.xp)}
                      </span>
                      <span className="flex w-14 items-center justify-end gap-1 text-xs text-neutral-400">
                        <Coins className="h-3.5 w-3.5" />
                        {entry.coins}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function LeaderboardSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

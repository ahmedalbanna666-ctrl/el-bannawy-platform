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
import { Button } from "@/components/ui/button";
import {
  certificateDownloadUrl,
  certificateViewUrl,
  fetchCertificates,
  type UnitCertificate,
} from "@/lib/certificates";
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
  BookCheck,
  ClipboardList,
  Users,
  Coins,
  Download,
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

interface DashboardStats {
  xp: { total: number; level: number; nextLevelXp: number };
  coins: number;
  streak: number;
  achievements: number;
  stats: { completedLessons: number; totalLessons: number; homeworkPending: number; quizPassRate: number; attendanceRate: number };
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

  const { data: dashboard } = useQuery({
    queryKey: ["home", userId],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await api.get<DashboardStats>("/home");
      if (!res.data) throw new Error("فشل تحميل الإحصائيات");
      return res.data;
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

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

  const { data: certificates = [] } = useQuery({
    queryKey: ["certificates", userId],
    queryFn: fetchCertificates,
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
  const d = dashboard;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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

      {/* Progress Stats */}
      {d && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-500/10 p-2">
                    <BookCheck className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.stats.completedLessons}/{d.stats.totalLessons}
                    </p>
                    <p className="text-xs text-neutral-500">الدروس المكتملة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-warning-500/10 p-2">
                    <ClipboardList className="h-5 w-5 text-warning-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.stats.homeworkPending}
                    </p>
                    <p className="text-xs text-neutral-500">الواجبات المعلقة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-success-500/10 p-2">
                    <Target className="h-5 w-5 text-success-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.stats.quizPassRate}%
                    </p>
                    <p className="text-xs text-neutral-500">معدل النجاح</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-info-500/10 p-2">
                    <Users className="h-5 w-5 text-info-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.stats.attendanceRate}%
                    </p>
                    <p className="text-xs text-neutral-500">نسبة الحضور</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* XP & Coins & Streak */}
          <section className="grid gap-4 sm:grid-cols-3">
            <Card variant="elevated" padding="md">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-500/10 p-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">نقاط الخبرة</p>
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.xp.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-400">المستوى {d.xp.level}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-500/10 p-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">العملات</p>
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.coins.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-400">الرصيد الحالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-500/10 p-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">سلسلة المواظبة</p>
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {d.streak}
                    </p>
                    <p className="text-xs text-neutral-400">يوم متتالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* Achievements Grid */}
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

      {/* Certificates */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/10">
            <Medal className="h-5 w-5 text-success-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              شهادات التقدير
            </h2>
            <p className="text-xs text-neutral-500">
              شهاداتك عند إتمام الوحدات بنسبة الإنجاز المطلوبة
            </p>
          </div>
          <Badge variant="secondary" className="ms-auto text-xs">
            {String(certificates.length)}
          </Badge>
        </div>

        {certificates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center dark:border-neutral-700">
            <Medal className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            <p className="mt-2 text-sm text-neutral-500">
              أكمل الوحدات بنسبة الإنجاز المطلوبة لتحصل على شهادات التقدير.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CertificateCard({
  certificate,
}: {
  certificate: UnitCertificate;
}): ReactNode {
  const earnedDate = new Date(certificate.earnedAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card variant="elevated" padding="none">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-success-500 to-emerald-600 text-white shadow-lg">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              شهادة إتمام الوحدة {String(certificate.unit.displayOrder)}
            </h3>
            <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {certificate.unit.title}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="text-[11px] text-neutral-400">{earnedDate}</span>
          <div className="flex items-center gap-2">
            <a href={certificateViewUrl(certificate.id)} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">عرض</Button>
            </a>
            <a href={certificateDownloadUrl(certificate.id)} download>
              <Button variant="primary" size="sm">
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-6 w-96" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Sparkles,
  GraduationCap,
  Play,
  BookOpen,
  ScrollText,
  RefreshCw,
  Gamepad2,
  Trophy,
  BookMarked,
  ClipboardList,
  ChevronRight,
  Users,
  Target,
  BookCheck,
} from "lucide-react";

interface DashboardData {
  user: { id: string; fullName: string; role: string };
  xp: { total: number; level: number; nextLevelXp: number };
  coins: number;
  achievements: number;
  streak: number;
  continueLearning: { unitName: string; lessonName: string; progress: number; lessonId: string } | null;
  recentActivity: { id: string; type: string; description: string; createdAt: string }[];
  upcomingLiveClasses: { id: string; title: string; date: string; teacherName: string }[];
  stats: { completedLessons: number; totalLessons: number; homeworkPending: number; quizPassRate: number; attendanceRate: number };
}

export default function DashboardPage(): ReactNode {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard(): Promise<void> {
      try {
        const response = await api.get<DashboardData>("/home");
        if (response.data) {
          setData(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحميل لوحة التحكم");
      } finally {
        setLoading(false);
      }
    }
    void fetchDashboard();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState title="فشل تحميل لوحة التحكم" description={error} />;
  }

  if (!data) {
    return <EmptyState title="لا توجد بيانات" description="لا توجد بيانات متاحة للوحة التحكم" icon={<BookOpen className="h-16 w-16" />} />;
  }

  const xpProgress = data.xp.total > 0 ? (data.xp.total % 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-6">

      {/* SECTION 1 — Continue Learning */}
      {data.continueLearning ? (
        <section>
          <Card variant="gradient" padding="none" className="border-primary-500/20 px-4 py-3">
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
                    {data.continueLearning.unitName}
                  </h2>
                  <Button
                    size="xs"
                    className="shrink-0 text-xs font-medium"
                    onClick={() => { const lessonId = data.continueLearning?.lessonId; if (lessonId) router.push(`/dashboard/lessons/detail/${lessonId}`); }}
                  >
                    <Play className="h-3 w-3" />
                    استكمل
                  </Button>
                </div>

                <div className="border-t border-primary-500/[0.06]" />

                <div className="flex items-center gap-2">
                  <Trophy className="h-3 w-3 shrink-0 text-yellow-500/70" />
                  <div className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                      style={{ width: `${String(xpProgress)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] text-neutral-400">
                    {data.xp.total % 1000}/{data.xp.nextLevelXp}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <EmptyState
          title="ابدأ رحلتك التعليمية"
          description="ابدأ بتصفح الوحدات التعليمية أدناه"
          icon={<GraduationCap className="h-16 w-16" />}
        />
      )}

      {/* SECTION 2 — Statistics */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card variant="elevated" padding="sm">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-500/10 p-2">
                <BookCheck className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {data.stats.completedLessons}/{data.stats.totalLessons}
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
                  {data.stats.homeworkPending}
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
                  {data.stats.quizPassRate}%
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
                  {data.stats.attendanceRate}%
                </p>
                <p className="text-xs text-neutral-500">نسبة الحضور</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SECTION 3 — Quick Learning Tools (2×2 Grid) */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div onClick={(): void => { router.push("/dashboard/ai"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/ai"); } }}>
          <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">اسأل البنا AI</h3>
                  <p className="text-sm text-neutral-500">احصل على إجابات فورية وشروحات ومساعدة في تعلمك</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">احجز حصة مباشرة</h3>
                <p className="text-sm text-neutral-500">احجز مقعدك في حصة مباشرة قادمة</p>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                <RefreshCw className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">تعلم من أخطائك</h3>
                <p className="text-sm text-neutral-500">راجع الإجابات الخاطئة وحسن مستواك</p>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                <Gamepad2 className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">الألعاب التعليمية</h3>
                <p className="text-sm text-neutral-500">العب ألعاباً لتحسين المفردات والقواعد والقراءة</p>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-400" />
            </div>
          </CardContent>
        </Card>

      </section>

      {/* SECTION 4 — Curriculum Units */}
      <div onClick={(): void => { router.push("/dashboard/units"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/units"); } }}>
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">الوحدات التعليمية</h3>
              <p className="text-sm text-neutral-500">تصفح جميع الوحدات وتابع تقدمك</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>
      </div>

      {/* SECTION 5 — Story */}
      <div onClick={(): void => { router.push("/dashboard/story"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/story"); } }}>
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
              <ScrollText className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">قصة المنهج</h3>
              <p className="text-sm text-neutral-500">تابع قصة المنهج التعليمي</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>
      </div>

      {/* SECTION 6 — Final Review */}
      <div onClick={(): void => { router.push("/dashboard/final-review"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/final-review"); } }}>
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <BookMarked className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">المراجعة النهائية</h3>
              <p className="text-sm text-neutral-500">راجع المنهج بالكامل واستعد للاختبارات</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>
      </div>

    </div>
  );
}

function DashboardSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

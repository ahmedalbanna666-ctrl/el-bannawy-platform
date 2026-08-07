"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { type UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Sparkles,
  Play,
  BookOpen,
  ScrollText,
  LibraryBig,
  RefreshCw,
  Gamepad2,
  ChevronLeft,
  Users,
  BarChart3,
  Target,
} from "lucide-react";
import { useMyBookings } from "@/lib/live-api";
import { useAuthStore } from "@/lib/auth-store";
import { useHomeData, type HomeData } from "@/lib/home-api";

export function StudentDashboard(): ReactNode {
  const router = useRouter();
  const { data: liveBookings } = useMyBookings();
  const authUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error }: UseQueryResult<HomeData> = useHomeData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return <ErrorState title="فشل تحميل لوحة التحكم" description={error instanceof Error ? error.message : "حدث خطأ"} />;
  }

  if (!data) {
    return <EmptyState title="لا توجد بيانات" description="لا توجد بيانات متاحة للوحة التحكم" icon={<BookOpen className="h-16 w-16" />} />;
  }

  const unitProgress = data.unitProgress.percent;

  // Current lesson: first unfinished lesson in the current unit,
  // otherwise the most recently completed one.
  const lessons = [...data.unitProgress.lessons].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const currentLessonTitle =
    lessons.find((l) => !l.completed)?.title ??
    lessons.at(-1)?.title ??
    null;

  return (
    <div className="flex flex-col gap-4">

      {/* 1 — Progress Card */}
      <Card variant="outline" padding="none">
        <CardContent>
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">التقدم الدراسي</p>
                {data.unitProgress.unitName ? (
                  <p className="mt-0.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {currentLessonTitle
                      ? `${data.unitProgress.unitName} — ${currentLessonTitle}`
                      : data.unitProgress.unitName}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    {String(data.stats.completedLessons)} من {String(data.stats.totalLessons)} دروس مكتملة
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 rounded-full bg-purple-500 text-xs font-medium text-white hover:bg-purple-600"
              onClick={() => {
                // Fully dynamic: label + destination come from the backend
                // nextAction, computed from the student's saved progress.
                router.push(data.nextAction?.href ?? "/dashboard/units");
              }}
            >
              <Play className="h-3.5 w-3.5 ml-1" />
              {data.nextAction?.label ?? "ابدأ الآن"}
            </Button>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${String(unitProgress)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-purple-500">
                {unitProgress}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade not set warning */}
      {!authUser?.gradeId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">الصف الدراسي غير محدد</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">يرجى اختيار الصف الدراسي من صفحة البروفايل ليتمكن النظام من عرض المحتوى المناسب لك</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300" onClick={() => { router.push("/dashboard/profile"); }}>
              تعديل البروفايل
            </Button>
          </div>
        </div>
      )}

      {/* 2 — Units Card */}
      <div onClick={(): void => { router.push("/dashboard/units"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/units"); } }}>
        <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">وحدات المنهج</h3>
                <p className="text-xs text-neutral-500">تصفح جميع الوحدات</p>
              </div>
              <ChevronLeft className="h-5 w-5 text-neutral-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3 — Stories Card */}
      <div onClick={(): void => { router.push("/dashboard/stories"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/stories"); } }}>
        <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10">
                <ScrollText className="h-6 w-6 text-teal-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">قصه المنهج</h3>
                <p className="text-[11px] text-neutral-500">القصه بطريقه تفاعليه</p>
              </div>
              <ChevronLeft className="h-5 w-5 text-neutral-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4 — Final Review Card */}
      <div onClick={(): void => { router.push("/dashboard/final-reviews"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/final-reviews"); } }}>
        <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
                <LibraryBig className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">المراجعة النهائية</h3>
                <p className="text-xs text-neutral-500">فقط أثناء الامتحانات</p>
              </div>
              <ChevronLeft className="h-5 w-5 text-neutral-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4 — Quick Tools Grid (4 cards) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <div onClick={(): void => { router.push("/dashboard/ai"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/ai"); } }}>
          <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
            <CardContent>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100 sm:text-base">اسأل البنا AI</h3>
                  <p className="mt-0.5 hidden text-sm text-neutral-500 sm:block">احصل على إجابات وشروحات فورية</p>
                </div>
                <ChevronLeft className="hidden h-5 w-5 shrink-0 text-neutral-400 sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div onClick={(): void => { router.push("/dashboard/live"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/live"); } }}>
          <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
            <CardContent>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100 sm:text-base">حصه مباشر</h3>
                  <p className="mt-0.5 hidden text-sm text-neutral-500 sm:block">احجز مقعدك في حصة مباشرة</p>
                </div>
                <ChevronLeft className="hidden h-5 w-5 shrink-0 text-neutral-400 sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div onClick={(): void => { router.push("/dashboard/mistakes"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/mistakes"); } }}>
          <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
            <CardContent>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <RefreshCw className="h-6 w-6 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100 sm:text-base">تعلم من أخطائك</h3>
                  <p className="mt-0.5 hidden text-sm text-neutral-500 sm:block">راجع الأجوبة الخاطئة وحسن مستواك</p>
                </div>
                <ChevronLeft className="hidden h-5 w-5 shrink-0 text-neutral-400 sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div onClick={(): void => { router.push("/dashboard/games"); }} role="button" tabIndex={0} onKeyDown={(e): void => { if (e.key === "Enter") { router.push("/dashboard/games"); } }}>
          <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 h-full">
            <CardContent>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                  <Gamepad2 className="h-6 w-6 text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100 sm:text-base">الألعاب التعليمية</h3>
                  <p className="mt-0.5 hidden text-sm text-neutral-500 sm:block">العب لتحسين المفردات والقواعد</p>
                </div>
                <ChevronLeft className="hidden h-5 w-5 shrink-0 text-neutral-400 sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Live Classes Section */}
      {liveBookings && liveBookings.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              الحصص المباشرة القادمة
            </h2>
            <button
              onClick={(): void => { router.push("/dashboard/live"); }}
              className="text-xs font-medium text-primary-500 hover:text-primary-600"
            >
              عرض الكل
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {liveBookings.slice(0, 2).map((booking) => {
              const startDate = new Date(booking.session.startTime);
              const isToday = startDate.toDateString() === new Date().toDateString();
              return (
                <div
                  key={booking.id}
                  onClick={(): void => { router.push(`/dashboard/live/sessions/${booking.session.id}`); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/dashboard/live/sessions/${booking.session.id}`); }}
                >
                  <Card variant={isToday ? "elevated" : "outline"} padding="md" className={`cursor-pointer transition-all ${isToday ? "border-success-500/30 shadow-success-500/5" : ""}`}>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {booking.session.title}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {booking.session.teacher.fullName} · {startDate.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })} · {startDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {isToday && <span className="shrink-0 text-xs font-bold text-success-500">اليوم</span>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function DashboardSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

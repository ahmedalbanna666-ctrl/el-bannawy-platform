"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { useLiveAnalyticsOverview } from "@/lib/live-api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BackButton } from "@/components/ui/back-button";
import {
  Users,
  GraduationCap,
  UserCog,
  BookOpen,
  ClipboardList,
  Target,
  Flame,
  Coins,
  Zap,
  Trophy,
  CalendarCheck,
  TrendingUp,
  BarChart3,
  Video,
  Activity,
  Star,
} from "lucide-react";

interface AdminReport {
  admin: { id: string; fullName: string };
  platform: {
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
    totalLessons: number;
    totalHomework: number;
    totalQuizzes: number;
    activeToday: number;
    activeLogins30d: number;
    newStudents30d: number;
    completedLessons: number;
    totalLessonProgress: number;
    overallCompletionRate: number;
  };
  engagement: {
    totalXpAwarded: number;
    totalCoinsCirculating: number;
    homeworkAttempts: number;
    avgHomeworkScore: number;
    quizAttempts: number;
    avgQuizScore: number;
    attendanceRate: number;
  };
  perGrade: { gradeId: string; gradeName: string; students: number }[];
}

export function AdminReportsView(): ReactNode {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport(): Promise<void> {
      try {
        const res = await api.get<AdminReport>("/reports/admin");
        if (res.data) setReport(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحميل تقارير المنصة");
      } finally {
        setLoading(false);
      }
    }
    void fetchReport();
  }, []);

  if (loading) return <AdminReportsSkeleton />;
  if (error) return <ErrorState title="فشل تحميل تقارير المنصة" description={error} />;
  if (!report) return <EmptyState title="لا توجد بيانات" description="لا توجد بيانات متاحة للتقارير" icon={<BarChart3 className="h-16 w-16" />} />;

  const p = report.platform;
  const e = report.engagement;

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallbackHref="/dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">تقارير المنصة</h1>
        <p className="mt-0.5 text-sm text-neutral-500">نظرة عامة على أداء المنصة وطلابها ومدى تفاعلهم</p>
      </div>

      <LiveReportsSection />

      {/* Platform Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="الطلاب" value={p.totalStudents} variant="primary" />
        <StatCard icon={GraduationCap} label="المعلمون" value={p.totalTeachers} variant="info" />
        <StatCard icon={UserCog} label="المديرون" value={p.totalAdmins} variant="warning" />
        <StatCard icon={Flame} label="نشط اليوم" value={p.activeToday} variant="success" />
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="الدروس المنشورة" value={p.totalLessons} variant="primary" />
        <StatCard icon={ClipboardList} label="الواجبات" value={p.totalHomework} variant="warning" />
        <StatCard icon={Target} label="الاختبارات" value={p.totalQuizzes} variant="info" />
      </div>

      {/* Growth & Completion */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={TrendingUp} label="طلاب جدد (30 يوم)" value={p.newStudents30d} variant="success" />
        <StatCard icon={Flame} label="دخول نشط (30 يوم)" value={p.activeLogins30d} variant="primary" />
        <StatCard icon={Trophy} label="نسبة إنجاز الدروس" value={`${String(p.overallCompletionRate)}%`} variant="warning" />
      </div>

      {/* Engagement */}
      <Card variant="elevated" padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">مؤشرات التفاعل</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="XP ممنوح" value={e.totalXpAwarded.toLocaleString()} icon={Zap} color="text-yellow-500" />
            <Metric label="عملات متداولة" value={e.totalCoinsCirculating.toLocaleString()} icon={Coins} color="text-amber-500" />
            <Metric label="محاولات واجبات" value={e.homeworkAttempts.toLocaleString()} icon={ClipboardList} color="text-primary-500" />
            <Metric label="متوسط الواجبات" value={`${String(e.avgHomeworkScore)}%`} icon={ClipboardList} color="text-success-500" />
            <Metric label="محاولات اختبارات" value={e.quizAttempts.toLocaleString()} icon={Target} color="text-info-500" />
            <Metric label="متوسط الاختبارات" value={`${String(e.avgQuizScore)}%`} icon={Target} color="text-success-500" />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-500/10 px-4 py-3">
            <CalendarCheck className="h-5 w-5 text-success-500" />
            <span className="text-sm font-medium text-success-600 dark:text-success-400">
              نسبة الحضور الإجمالية: {e.attendanceRate}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Students per Grade */}
      <Card variant="outline" padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">توزيع الطلاب على الصفوف</h3>
          </div>
        </CardHeader>
        <CardContent>
          {report.perGrade.length === 0 ? (
            <p className="text-sm text-neutral-500">لا توجد صفوف مسجلة بعد</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {report.perGrade.map((g) => (
                <div key={g.gradeId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{g.gradeName}</span>
                  <span className="rounded-full bg-primary-500/10 px-3 py-1 text-sm font-bold text-primary-600 dark:text-primary-400">
                    {g.students} طالب
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  variant: "primary" | "warning" | "info" | "success";
}): ReactNode {
  const colors: Record<string, string> = {
    primary: "bg-primary-500/10 text-primary-500",
    warning: "bg-warning-500/10 text-warning-500",
    info: "bg-info-500/10 text-info-500",
    success: "bg-success-500/10 text-success-500",
  };

  return (
    <Card variant="elevated" padding="sm">
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${colors[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
            <p className="text-xs text-neutral-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  color: string;
}): ReactNode {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 p-3 text-center dark:border-neutral-700">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{value}</span>
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  );
}

function AdminReportsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

function LiveReportsSection(): ReactNode {
  const now = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  }, [now]);
  const to = now.toISOString().split("T")[0];

  const { data, isLoading, isError } = useLiveAnalyticsOverview(from, to);

  return (
    <Card variant="elevated" padding="md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-danger-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            مؤشرات الحصص المباشرة
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-sm text-danger-500">تعذر تحميل مؤشرات الحصص المباشرة.</p>
        )}
        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <LiveMetric icon={Video} label="حصص مباشرة الآن" value={data.liveNowSessions} tone="text-danger-500" />
            <LiveMetric icon={Video} label="حصص مكتملة" value={data.completedSessions} tone="text-success-500" />
            <LiveMetric icon={Users} label="إجمالي الحجوزات" value={data.totalBookings} tone="text-primary-500" />
            <LiveMetric icon={Users} label="طلاب" value={data.totalStudents} tone="text-info-500" />
            <LiveMetric icon={Star} label="اشتراكات نشطة" value={data.activeSubscriptions} tone="text-amber-500" />
            <LiveMetric icon={Activity} label="نسبة الحضور" value={`${String(data.attendanceRate)}%`} tone="text-success-500" />
            <LiveMetric icon={Activity} label="استغلال السعة" value={`${String(data.capacityUtilization)}%`} tone="text-primary-500" />
            <LiveMetric icon={Users} label="قائمة الانتظار" value={data.waitlistEntries} tone="text-warning-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Video;
  label: string;
  value: string | number;
  tone: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
      <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
        <p className="truncate text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

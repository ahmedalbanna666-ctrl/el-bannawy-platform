"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BackButton } from "@/components/ui/back-button";
import { Users, ClipboardList, Target, CalendarCheck, BarChart3 } from "lucide-react";

interface TeacherReport {
  teacher: { id: string; fullName: string };
  classOverview: { totalStudents: number };
  homework: { totalAttempts: number; avgScore: number; passRate: number };
  quizzes: { totalAttempts: number; avgScore: number; passRate: number };
  attendance: { rate: number };
}

export function TeacherReportsView(): ReactNode {
  const [report, setReport] = useState<TeacherReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport(): Promise<void> {
      try {
        const res = await api.get<TeacherReport>("/reports/teacher");
        if (res.data) setReport(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحميل تقارير الفصل");
      } finally {
        setLoading(false);
      }
    }
    void fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState title="فشل تحميل تقارير الفصل" description={error} />;
  if (!report) return <EmptyState title="لا توجد بيانات" description="لا توجد بيانات متاحة" icon={<BarChart3 className="h-16 w-16" />} />;

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallbackHref="/dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">تقارير الفصل</h1>
        <p className="mt-0.5 text-sm text-neutral-500">أداء طلابك في الواجبات والاختبارات والحضور</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TeacherStat icon={Users} label="الطلاب" value={report.classOverview.totalStudents} variant="primary" />
        <TeacherStat icon={ClipboardList} label="محاولات الواجبات" value={report.homework.totalAttempts} variant="warning" />
        <TeacherStat icon={Target} label="محاولات الاختبارات" value={report.quizzes.totalAttempts} variant="info" />
        <TeacherStat icon={CalendarCheck} label="نسبة الحضور" value={`${String(report.attendance.rate)}%`} variant="success" />
      </div>

      <Card variant="outline" padding="md">
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-warning-500" />
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">الواجبات</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{report.homework.avgScore}%</p>
                  <p className="text-xs text-neutral-500">متوسط الدرجة</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{report.homework.passRate}%</p>
                  <p className="text-xs text-neutral-500">نسبة النجاح</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-info-500" />
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">الاختبارات</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{report.quizzes.avgScore}%</p>
                  <p className="text-xs text-neutral-500">متوسط الدرجة</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{report.quizzes.passRate}%</p>
                  <p className="text-xs text-neutral-500">نسبة النجاح</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeacherStat({
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

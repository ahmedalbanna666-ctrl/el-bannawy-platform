"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Target,
  BookOpen,
  Zap,
  Coins,
  Award,
  Users,
  GraduationCap,
  ClipboardList,
} from "lucide-react";

interface StudentReport {
  student: { id: string; fullName: string; role: string };
  overview: { totalLessons: number; completedLessons: number; completionRate: number; avgLessonProgress: number };
  homework: { totalAttempts: number; avgScore: number; passRate: number; recent: { title: string; lessonTitle: string; score: number | null; passed: boolean | null; submittedAt: string | null }[] };
  quizzes: { totalAttempts: number; avgScore: number; passRate: number; recent: { title: string; lessonTitle: string; score: number | null; passed: boolean | null; submittedAt: string | null }[] };
  xp: { total: number; level: number; transactionCount: number };
  coins: { balance: number };
  achievements: { total: number; recent: { title: string; description: string | null; earnedAt: string }[] };
  attendance: { total: number; present: number; rate: number; streak: number };
}

export default function ReportsPage(): ReactNode {
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport(): Promise<void> {
      try {
        const res = await api.get<StudentReport>("/reports/my");
        if (res.data) setReport(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }
    void fetchReport();
  }, []);

  if (loading) return <ReportsSkeleton />;
  if (error) return <ErrorState title="Failed to load reports" description={error} />;
  if (!report) return <EmptyState title="No Reports" description="No data available" icon={<BarChart3 className="h-16 w-16" />} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">My Reports</h1>
        <p className="mt-1 text-sm text-neutral-500">Your learning progress and performance insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Lessons Completed" value={`${String(report.overview.completedLessons)}/${String(report.overview.totalLessons)}`} sub={`${String(report.overview.completionRate)}% rate`} variant="primary" />
        <StatCard icon={Target} label="Homework Score" value={`${String(report.homework.avgScore)}%`} sub={`${String(report.homework.passRate)}% pass rate`} variant="warning" />
        <StatCard icon={GraduationCap} label="Quiz Score" value={`${String(report.quizzes.avgScore)}%`} sub={`${String(report.quizzes.passRate)}% pass rate`} variant="info" />
        <StatCard icon={Users} label="Attendance" value={`${String(report.attendance.rate)}%`} sub={`${String(report.attendance.streak)} day streak`} variant="success" />
      </div>

      {/* XP & Coins */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="elevated" padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">XP Progress</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{report.xp.total.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Level {report.xp.level} • {report.xp.transactionCount} transactions</p>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Coins</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{report.coins.balance.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Current balance</p>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Achievements</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{report.achievements.total}</p>
            <p className="text-sm text-neutral-500">Earned badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Homework */}
      <Card variant="outline" padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Recent Homework</h3>
          </div>
        </CardHeader>
        <CardContent>
          {report.homework.recent.length === 0 ? (
            <p className="text-sm text-neutral-500">No homework attempts yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {report.homework.recent.map((hw, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{hw.title}</p>
                    <p className="text-xs text-neutral-500">{hw.lessonTitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{hw.score}%</span>
                    <Badge variant={hw.passed ? "success" : "warning"}>{hw.passed ? "Pass" : "Fail"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Quizzes */}
      <Card variant="outline" padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Recent Quizzes</h3>
          </div>
        </CardHeader>
        <CardContent>
          {report.quizzes.recent.length === 0 ? (
            <p className="text-sm text-neutral-500">No quiz attempts yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {report.quizzes.recent.map((qz, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{qz.title}</p>
                    <p className="text-xs text-neutral-500">{qz.lessonTitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{qz.score}%</span>
                    <Badge variant={qz.passed ? "success" : "warning"}>{qz.passed ? "Pass" : "Fail"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {report.achievements.recent.length > 0 && (
        <Card variant="outline" padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Recent Achievements</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.achievements.recent.map((a, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                    <Award className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{a.title}</p>
                    {a.description && <p className="text-xs text-neutral-500">{a.description}</p>}
                  </div>
                  <span className="ml-auto text-xs text-neutral-400">{new Date(a.earnedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  variant,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub: string;
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
            <p className="text-xs text-neutral-400">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

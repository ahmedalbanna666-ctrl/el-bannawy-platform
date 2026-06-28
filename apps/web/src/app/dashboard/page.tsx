"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Zap,
  Coins,
  Flame,
  Clock,
  BookMarked,
  ClipboardList,
  ChevronRight,
  Calendar,
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
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
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
    return <ErrorState title="Failed to load dashboard" description={error} />;
  }

  if (!data) {
    return <EmptyState title="No data" description="No dashboard data available" icon={<BookOpen className="h-16 w-16" />} />;
  }

  const xpProgress = data.xp.total > 0 ? (data.xp.total % 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {data.user.fullName.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-primary-100">Ready to continue your learning journey?</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2">
            <Zap className="h-5 w-5 text-yellow-300" />
            <div>
              <p className="text-xs text-primary-100">Level {data.xp.level}</p>
              <p className="text-sm font-semibold">{data.xp.total} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2">
            <Coins className="h-5 w-5 text-yellow-300" />
            <div>
              <p className="text-xs text-primary-100">Coins</p>
              <p className="text-sm font-semibold">{data.coins}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2">
            <Flame className="h-5 w-5 text-orange-300" />
            <div>
              <p className="text-xs text-primary-100">Streak</p>
              <p className="text-sm font-semibold">{data.streak} days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Button
          variant="primary"
          size="sm"
          className="flex-col gap-1 py-3"
          fullWidth
          onClick={() => {
            if (data?.continueLearning?.lessonId) {
              router.push(`/dashboard/lessons/${data.continueLearning.lessonId}`);
            }
          }}
        >
          <Play className="h-5 w-5" />
          <span className="text-xs">Continue</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-col gap-1 py-3"
          fullWidth
          onClick={() => router.push("/dashboard/units")}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs">Homework</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-col gap-1 py-3" fullWidth>
          <RefreshCw className="h-5 w-5" />
          <span className="text-xs">Mistakes</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-col gap-1 py-3"
          fullWidth
          onClick={() => router.push("/dashboard/ai")}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-xs">Ask AI</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-col gap-1 py-3" fullWidth>
          <Calendar className="h-5 w-5" />
          <span className="text-xs">Book Live</span>
        </Button>
      </section>

      {/* Stats */}
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
                <p className="text-xs text-neutral-500">Lessons Done</p>
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
                <p className="text-xs text-neutral-500">Pending Homework</p>
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
                <p className="text-xs text-neutral-500">Quiz Pass Rate</p>
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
                <p className="text-xs text-neutral-500">Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Continue Learning */}
      {data.continueLearning ? (
        <section>
          <Card variant="gradient" padding="md" className="border-primary-500/20">
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/20">
                    <Play className="h-7 w-7 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {data.continueLearning.unitName}
                    </p>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {data.continueLearning.lessonName}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div
                          className="h-full rounded-full bg-primary-500 transition-all"
                          style={{ width: `${String(data.continueLearning.progress)}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">
                        {Math.round(data.continueLearning.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="md" className="shrink-0" onClick={() => { const lessonId = data.continueLearning?.lessonId; if (lessonId) router.push(`/dashboard/lessons/${lessonId}`); }}>
                  <Play className="h-5 w-5" />
                  Continue Lesson
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <EmptyState
          title="Start Your Learning Journey"
          description="Begin by exploring the curriculum units below."
          icon={<GraduationCap className="h-16 w-16" />}
        />
      )}

      {/* Section 1: Ask AI */}
      <div onClick={() => router.push("/dashboard/ai")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") router.push("/dashboard/ai"); }}>
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Ask El-bannawy AI</h3>
              <p className="text-sm text-neutral-500">Get instant answers, explanations, and help with your learning</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Section 2: Book Live Class */}
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Book Live Class</h3>
              <p className="text-sm text-neutral-500">Reserve your spot in an upcoming live session</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Curriculum Units */}
      <div onClick={() => router.push("/dashboard/units")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") router.push("/dashboard/units"); }}>
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Curriculum Units</h3>
              <p className="text-sm text-neutral-500">Browse all units and track your progress</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Section 5: Story */}
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
              <ScrollText className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Story</h3>
              <p className="text-sm text-neutral-500">Follow along with the curriculum story</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Final Review (locked) */}
      <Card variant="outline" padding="md" className="cursor-not-allowed opacity-60">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-700">
              <BookMarked className="h-6 w-6 text-neutral-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Final Review</h3>
              <p className="text-sm text-neutral-400">Final Review will become available during the official revision period</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Learn From Mistakes */}
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <RefreshCw className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Learn From Mistakes</h3>
              <p className="text-sm text-neutral-500">Review incorrect answers and improve</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Educational Games */}
      <Card variant="outline" padding="md" className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
              <Gamepad2 className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Educational Games</h3>
              <p className="text-sm text-neutral-500">Play games to improve vocabulary, grammar, and reading</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        </CardContent>
      </Card>

      {/* XP Progress */}
      <Card variant="elevated" padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Level {data.xp.level} Progress</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                  style={{ width: `${String(xpProgress)}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm text-neutral-500">
              {data.xp.total % 1000} / {data.xp.nextLevelXp} XP
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <Card variant="outline" padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-neutral-400" />
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Recent Activity</h3>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.recentActivity.map((activity) => (
                <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{activity.description}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-[120px] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

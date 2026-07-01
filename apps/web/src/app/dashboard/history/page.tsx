"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  History,
  Play,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Users,
  Gamepad2,
  ScrollText,
  BookOpen,
  RefreshCw,
  Activity,
  Zap,
  Trophy,
  Award,
  CreditCard,
  LogIn,
  LogOut,
} from "lucide-react";

interface ActivityRecord {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

interface ActivityGroup {
  label: string;
  records: ActivityRecord[];
}

interface DashboardActivityData {
  recentActivity: ActivityRecord[];
}

const ACTIVITY_ICON: Record<string, typeof Activity> = {
  video_watched: Play,
  video_completed: Play,
  lesson_started: BookOpen,
  lesson_completed: CheckCircle,
  activity_completed: CheckCircle,
  homework_submitted: ClipboardList,
  homework_completed: ClipboardList,
  quiz_started: GraduationCap,
  quiz_completed: GraduationCap,
  ai_conversation: Sparkles,
  ai_chat: Sparkles,
  live_class_joined: Users,
  live_class_booked: Users,
  story_started: ScrollText,
  story_completed: ScrollText,
  game_played: Gamepad2,
  review_started: RefreshCw,
  achievement_earned: Award,
  xp_earned: Trophy,
  level_up: Zap,
  payment_completed: CreditCard,
  login: LogIn,
  logout: LogOut,
};

const ACTIVITY_BG: Record<string, string> = {
  video_watched: "bg-blue-500/10",
  video_completed: "bg-blue-500/10",
  lesson_started: "bg-primary-500/10",
  lesson_completed: "bg-success-500/10",
  activity_completed: "bg-success-500/10",
  homework_submitted: "bg-warning-500/10",
  homework_completed: "bg-warning-500/10",
  quiz_started: "bg-info-500/10",
  quiz_completed: "bg-info-500/10",
  ai_conversation: "bg-purple-500/10",
  ai_chat: "bg-purple-500/10",
  live_class_joined: "bg-green-500/10",
  live_class_booked: "bg-green-500/10",
  story_started: "bg-orange-500/10",
  story_completed: "bg-orange-500/10",
  game_played: "bg-purple-500/10",
  review_started: "bg-red-500/10",
  achievement_earned: "bg-purple-500/10",
  xp_earned: "bg-yellow-500/10",
  level_up: "bg-amber-500/10",
  payment_completed: "bg-success-500/10",
  login: "bg-neutral-500/10",
  logout: "bg-neutral-500/10",
};

const ACTIVITY_ICON_COLOR: Record<string, string> = {
  video_watched: "text-blue-500",
  video_completed: "text-blue-500",
  lesson_started: "text-primary-500",
  lesson_completed: "text-success-500",
  activity_completed: "text-success-500",
  homework_submitted: "text-warning-500",
  homework_completed: "text-warning-500",
  quiz_started: "text-info-500",
  quiz_completed: "text-info-500",
  ai_conversation: "text-purple-500",
  ai_chat: "text-purple-500",
  live_class_joined: "text-green-500",
  live_class_booked: "text-green-500",
  story_started: "text-orange-500",
  story_completed: "text-orange-500",
  game_played: "text-purple-500",
  review_started: "text-red-500",
  achievement_earned: "text-purple-500",
  xp_earned: "text-yellow-500",
  level_up: "text-amber-500",
  payment_completed: "text-success-500",
  login: "text-neutral-500",
  logout: "text-neutral-500",
};

function getActivityIcon(type: string): typeof Activity {
  return ACTIVITY_ICON[type] ?? Activity;
}

function getActivityBg(type: string): string {
  return ACTIVITY_BG[type] ?? "bg-neutral-500/10";
}

function getActivityIconColor(type: string): string {
  return ACTIVITY_ICON_COLOR[type] ?? "text-neutral-500";
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (recordDate.getTime() === startOfToday.getTime()) return "اليوم";
  if (recordDate.getTime() === startOfYesterday.getTime()) return "أمس";

  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[date.getDay()] ?? date.toLocaleDateString("ar-EG");
}

function groupByDay(records: ActivityRecord[]): ActivityGroup[] {
  const groups: Record<string, ActivityRecord[]> = {};

  for (const record of records) {
    const key = getDayLabel(record.createdAt);
    (groups[key] ??= []).push(record);
  }

  return Object.entries(groups).map(([label, recs]) => ({ label, records: recs }));
}

export default function HistoryPage(): ReactNode {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory(): Promise<void> {
      try {
        const response = await api.get<DashboardActivityData>("/home");
        if (response.data?.recentActivity) {
          setActivities(response.data.recentActivity);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحميل سجل التعلم");
      } finally {
        setLoading(false);
      }
    }
    void fetchHistory();
  }, []);

  if (loading) return <HistorySkeleton />;
  if (error) return <ErrorState title="فشل تحميل سجل التعلم" description={error} />;
  if (activities.length === 0) {
    return (
      <EmptyState
        title="لا يوجد سجل تعلم"
        description="سجل التعلم الخاص بك سيظهر هنا بمجرد بدء التعلم"
        icon={<History className="h-16 w-16" />}
      />
    );
  }

  const groups = groupByDay(activities);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">سجل التعلم</h1>
        <p className="mt-1 text-sm text-neutral-500">سجل كامل لأنشطتك التعليمية</p>
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {group.label}
            </h2>

            <Card variant="outline" padding="md">
              <CardContent>
                <div className="relative">
                  {group.records.map((activity, idx) => {
                    const Icon = getActivityIcon(activity.type);
                    const isLast = idx === group.records.length - 1;

                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getActivityBg(activity.type)}`}
                          >
                            <Icon className={`h-5 w-5 ${getActivityIconColor(activity.type)}`} />
                          </div>
                          {!isLast && (
                            <div className="mt-2 h-full min-h-[20px] w-px bg-neutral-200 dark:bg-neutral-700" />
                          )}
                        </div>

                        <div className={`flex-1 ${!isLast ? "pb-5" : ""}`}>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {activity.description}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-400">
                            {formatTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistorySkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex gap-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

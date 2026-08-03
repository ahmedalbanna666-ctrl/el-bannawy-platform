"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import {
  useSecretaryLiveDashboard,
  useLiveSessions,
  deriveSessionState,
  type LiveSessionItem,
} from "@/lib/live-api";
import { LiveSessionCard, LiveSessionCardSkeleton } from "@/components/live/live-session-card";
import {
  Video,
  CalendarDays,
  Users,
  Star,
  Clock,
  Bell,
  ChevronLeft,
} from "lucide-react";

function formatTodayArabic(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface StatTileProps {
  icon: typeof Video;
  label: string;
  value: number;
  tone: "primary" | "success" | "info" | "warning";
}

function StatTile({ icon: Icon, label, value, tone }: StatTileProps): ReactNode {
  const tones: Record<string, string> = {
    primary: "bg-primary-500/10 text-primary-500",
    success: "bg-success-500/10 text-success-500",
    info: "bg-info-500/10 text-info-500",
    warning: "bg-warning-500/10 text-warning-500",
  };
  return (
    <Card variant="elevated" padding="sm">
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SecretaryDashboard(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: dashboard, isLoading, isError } = useSecretaryLiveDashboard();
  const { data: sessions, isLoading: sessionsLoading } = useLiveSessions();

  const upcomingSessions = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 8),
    [sessions],
  );

  const handleJoin = (session: LiveSessionItem): void => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            مرحباً، {user?.fullName ?? "السكرتير"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            نظرة عامة على الحصص المباشرة والاشتراكات
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{formatTodayArabic()}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(): void => { router.push("/dashboard/live"); }}
        >
          <Video className="h-4 w-4" />
          عرض الحصص المباشرة
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Card variant="outline" padding="md">
          <CardContent>
            <p className="text-sm text-danger-500">
              تعذر تحميل لوحة التحكم. حاول مرة أخرى لاحقاً.
            </p>
          </CardContent>
        </Card>
      )}

      {dashboard && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Video} label="حصص مباشرة اليوم" value={dashboard.todayLiveClasses} tone="success" />
          <StatTile icon={CalendarDays} label="حصص قادمة" value={dashboard.upcomingLiveClasses} tone="primary" />
          <StatTile icon={Star} label="اشتراكات نشطة" value={dashboard.activeSubscriptions} tone="warning" />
          <StatTile icon={Users} label="الطلاب" value={dashboard.totalStudents} tone="info" />
        </div>
      )}

      {dashboard && (dashboard.waitlistEntries > 0 || dashboard.recentSessions.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {dashboard.waitlistEntries > 0 && (
            <Card variant="outline" padding="md">
              <CardContent>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-warning-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    قائمة الانتظار
                  </h3>
                </div>
                <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {dashboard.waitlistEntries}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  طالب بانتظار مقعد متاح
                </p>
              </CardContent>
            </Card>
          )}

          {dashboard.recentSessions.length > 0 && (
            <Card variant="outline" padding="md">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary-500" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      أحدث الحصص
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-500 hover:text-primary-600"
                    onClick={(): void => { router.push("/dashboard/live"); }}
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {dashboard.recentSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5 dark:bg-neutral-800/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {s.title}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {s.teacher.fullName} · {s._count.bookings} حجز
                        </p>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900 dark:text-neutral-100">
          الحصص القادمة
        </h2>
        {sessionsLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <LiveSessionCardSkeleton key={i} />
            ))}
          </div>
        )}
        {!sessionsLoading && upcomingSessions.length === 0 && (
          <Card variant="outline" padding="md">
            <CardContent>
              <p className="text-sm text-neutral-500">لا توجد حصص قادمة.</p>
            </CardContent>
          </Card>
        )}
        {!sessionsLoading && upcomingSessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {upcomingSessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                state={deriveSessionState(session, false)}
                onJoin={handleJoin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

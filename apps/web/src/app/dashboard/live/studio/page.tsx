"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Settings2,
  CalendarDays,
  Users,
  User,
  Clock,
  ArrowLeft,
  Plus,
  Play,
  Square,
  Radio,
  GraduationCap,
  Bell,
  CalendarClock,
  Sparkles,
  RefreshCw,
  CalendarOff,
  BarChart3,
  ServerCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import {
  GlassSection,
  SectionHeader,
  MetricCard,
  MiniBarChart,
  StudioSkeleton,
} from "@/components/live/studio/studio-shell";
import { LiveCountdown } from "@/components/live/live-countdown";
import { CreateSessionDialog } from "@/components/live/create-session-dialog";
import { SessionDetailDialog } from "@/components/live/studio/session-detail-dialog";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import {
  useLiveSessions,
  useTeacherLiveKpis,
  useAvailabilities,
  useDateBlocks,
  useStartSession,
  useEndSession,
  usePublishSession,
  useUnpublishSession,
  type LiveSessionItem,
  type TeacherAvailabilityItem,
} from "@/lib/live-api";
import { cn } from "@/lib/utils";

const DAY_NAMES = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];
const DAY_VALUES = [6, 0, 1, 2, 3, 4, 5];

const STUDIO_TABS: { id: "today" | "schedule" | "sessions"; label: string; icon: ReactNode }[] = [
  { id: "today", label: "اليوم", icon: <CalendarClock className="h-4 w-4" /> },
  { id: "schedule", label: "الجدول الأسبوعي", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "sessions", label: "الحصص والطلاب", icon: <Users className="h-4 w-4" /> },
];

function statusMeta(session: LiveSessionItem): { label: string; variant: "success" | "warning" | "danger" | "info" | "primary" | "secondary" } {
  switch (session.status) {
    case "LIVE": return { label: "مباشر", variant: "danger" };
    case "DRAFT": return { label: "مسودة", variant: "secondary" };
    case "FULL": return { label: "ممتلئ", variant: "warning" };
    case "COMPLETED": return { label: "مكتمل", variant: "success" };
    case "CANCELLED": return { label: "ملغي", variant: "secondary" };
    default: return { label: "مجدول", variant: "info" };
  }
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function TeacherLiveStudioPage(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isTeacher, isAdmin } = usePermissions();

  const canControl = isTeacher || isAdmin;

  const {
    data: kpis,
    isLoading: kpisLoading,
  } = useTeacherLiveKpis(user?.id);
  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: retrySessions,
  } = useLiveSessions();
  const {
    data: availabilities,
    isLoading: availabilityLoading,
  } = useAvailabilities(user?.id);
  const { data: dateBlocks } = useDateBlocks(user?.id);

  const startSession = useStartSession();
  const endSession = useEndSession();
  const publishSession = usePublishSession();
  const unpublishSession = useUnpublishSession();

  const [activeTab, setActiveTab] = useState<"today" | "schedule" | "sessions">("today");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSession, setEditSession] = useState<LiveSessionItem | null>(null);
  const [detailSession, setDetailSession] = useState<LiveSessionItem | null>(null);

  const mySessions = useMemo(
    () => (sessions ?? []).filter((s) => s.teacherId === user?.id),
    [sessions, user?.id],
  );

  const todaySessions = useMemo(
    () =>
      mySessions
        .filter((s) => isSameDay(new Date(s.startTime), new Date()))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [mySessions],
  );

  const liveSession = useMemo(
    () => mySessions.find((s) => s.status === "LIVE") ?? null,
    [mySessions],
  );

  const nextUpcoming = useMemo(() => {
    const list = mySessions
      .filter((s) => ["PUBLISHED", "SCHEDULED", "OPEN", "DRAFT"].includes(s.status))
      .filter((s) => new Date(s.endTime) > new Date())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return list.length > 0 ? list[0] : null;
  }, [mySessions]);

  const showDraftCta =
    nextUpcoming !== null && todaySessions.length === 0 && nextUpcoming.status === "DRAFT";

  const groupSessions = useMemo(
    () =>
      mySessions
        .filter((s) => s.type === "GROUP" && s.status !== "CANCELLED")
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 6),
    [mySessions],
  );

  const privateSessions = useMemo(
    () =>
      mySessions
        .filter((s) => s.type === "PRIVATE" && s.status !== "CANCELLED")
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 6),
    [mySessions],
  );

  const recurringSlots = useMemo(
    () => (availabilities ?? []).filter((a) => a.isRecurring && a.teacherId === user?.id),
    [availabilities, user?.id],
  );

  const weekChartData = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const count = mySessions.filter((s) => isSameDay(new Date(s.startTime), d)).length;
      const labelIndex = DAY_VALUES.indexOf(d.getDay());
      days.push({ label: DAY_NAMES[labelIndex] ?? "—", value: count });
    }
    return days;
  }, [mySessions]);

  const daySlotsMap = useMemo(() => {
    const map = new Map<number, TeacherAvailabilityItem[]>();
    DAY_VALUES.forEach((d) => map.set(d, []));
    (availabilities ?? [])
      .filter((a) => a.teacherId === user?.id)
      .forEach((a) => {
        const list = map.get(a.dayOfWeek) ?? [];
        list.push(a);
        map.set(a.dayOfWeek, list);
      });
    return map;
  }, [availabilities, user?.id]);

  const handleOpenSession = useCallback((session: LiveSessionItem): void => {
    setDetailSession(session);
  }, []);

  const rescheduleReviewTarget = nextUpcoming ?? todaySessions.at(0) ?? mySessions.at(0) ?? null;

  const handleStart = useCallback(async (session: LiveSessionItem): Promise<void> => {
    try {
      await startSession.mutateAsync(session.id);
    } catch {
      // handled by mutation
    }
  }, [startSession]);

  const handleEnd = useCallback(async (session: LiveSessionItem): Promise<void> => {
    try {
      await endSession.mutateAsync(session.id);
    } catch {
      // handled by mutation
    }
  }, [endSession]);

  if (!canControl) {
    return (
      <div className="flex flex-col gap-6 pb-4">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <GraduationCap className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            صلاحية محدودة
          </h1>
          <p className="max-w-sm text-sm text-neutral-500">
            استوديو المعلم متاح للمعلمين ومديري المنصة فقط.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => { router.push("/dashboard/live"); }}
          >
            العودة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(): void => { router.push("/dashboard"); }}
            aria-label="العودة للوحة التحكم"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              استوديو المعلم
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              حصصك اليومية وجدولك وطلابك في مكان واحد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={(): void => { router.push("/dashboard/live/admin"); }}
              leftIcon={<ServerCog className="h-4 w-4" />}
            >
              البنية التحتية
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => { router.push("/dashboard/live/schedules"); }}
            leftIcon={<Settings2 className="h-4 w-4" />}
          >
            جداول الدراسة
          </Button>
          <Button
            size="sm"
            onClick={() => { setCreateOpen(true); }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            إنشاء محاضرة
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-200 pb-px dark:border-white/10">
        {STUDIO_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={(): void => { setActiveTab(tab.id); }}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "border-primary-500 text-primary-600 dark:text-primary-300"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "today" && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="حصص اليوم" value={kpisLoading ? "…" : String(kpis?.todaySessions ?? todaySessions.length)} icon={<CalendarDays className="h-4 w-4" />} tone="cyan" />
            <MetricCard label="القادمة" value={kpisLoading ? "…" : String(kpis?.upcomingSessions ?? 0)} icon={<CalendarClock className="h-4 w-4" />} tone="violet" />
            <MetricCard label="مباشر الآن" value={kpisLoading ? "…" : String(kpis?.liveNow ?? 0)} icon={<Radio className="h-4 w-4" />} tone="rose" />
            <MetricCard label="طلاب فريدون" value={kpisLoading ? "…" : String(kpis?.uniqueStudents ?? 0)} icon={<Users className="h-4 w-4" />} tone="emerald" />
            <MetricCard label="الحجوزات" value={kpisLoading ? "…" : String(kpis?.totalBookings ?? 0)} icon={<User className="h-4 w-4" />} tone="amber" />
            <MetricCard label="قائمة الانتظار" value={kpisLoading ? "…" : String(kpis?.waitlistEntries ?? 0)} icon={<Bell className="h-4 w-4" />} tone="primary" />
          </div>

          {/* Next upcoming highlight */}
          {showDraftCta && (
            <div className="flex items-center gap-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4">
              <Sparkles className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  «{nextUpcoming.title}» ما زالت مسودة
                </p>
                <p className="text-xs text-neutral-500">
                  انشرها ليتمكن الطلاب من حجزها.
                </p>
              </div>
              <Button
                variant="warning"
                size="sm"
                onClick={() => {
                  publishSession.mutate(nextUpcoming.id);
                }}
              >
                نشر
              </Button>
            </div>
          )}

          {/* Today's timeline */}
          <GlassSection tone="rose">
            <SectionHeader
              icon={<CalendarClock className="h-5 w-5" />}
              title="حصص اليوم"
              description="جدول حصص اليوم — ابدأها من هنا بضغطة واحدة"
            />
            {sessionsLoading ? (
              <StudioSkeleton rows={2} />
            ) : todaySessions.length === 0 ? (
              <p className="rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-500 dark:bg-white/[0.04]">
                لا توجد حصص مجدولة اليوم. استمتع بيومك أو أنشئ محاضرة جديدة.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todaySessions.map((session, index) => {
                  const meta = statusMeta(session);
                  const isPast = new Date(session.endTime) < new Date();
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "relative flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]",
                        session.status === "LIVE" && "ring-2 ring-rose-500/30 dark:ring-rose-400/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl",
                              session.status === "LIVE"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                                : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
                            )}
                          >
                            <span className="text-sm font-bold tabular-nums">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Clock className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">
                              {session.title}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              {" · "}
                              {session.type === "GROUP" ? "مجموعة" : "فردي"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={meta.variant} className="shrink-0">
                          {meta.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {!isPast && session.status !== "COMPLETED" && (
                            <LiveCountdown targetDate={session.startTime} compact />
                          )}
                          <span className="text-[10px] text-neutral-400">
                            {String(session._count.bookings)} / {String(session.maxStudents)} مقعد
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(): void => { setEditSession(session); }}
                            disabled={session.status === "LIVE" || session.status === "COMPLETED"}
                          >
                            <Settings2 className="h-4 w-4" />
                            تعديل
                          </Button>
                          {session.status === "DRAFT" && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => { publishSession.mutate(session.id); }}
                            >
                              نشر
                            </Button>
                          )}
                          {session.status === "PUBLISHED" && (
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => { unpublishSession.mutate(session.id); }}
                            >
                              إلغاء النشر
                            </Button>
                          )}
                          {session.status === "LIVE" ? (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={endSession.isPending}
                              onClick={() => { void handleEnd(session); }}
                              leftIcon={<Square className="h-4 w-4" />}
                            >
                              إنهاء
                            </Button>
                          ) : (
                            !isPast && (
                              <Button
                                size="sm"
                                loading={startSession.isPending}
                                onClick={() => { void handleStart(session); }}
                                leftIcon={<Play className="h-4 w-4" />}
                              >
                                بدء
                              </Button>
                            )
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { handleOpenSession(session); }}
                          >
                            تفاصيل
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassSection>

          {/* Notifications */}
          <GlassSection tone="violet">
            <SectionHeader
              icon={<Bell className="h-5 w-5" />}
              title="التنبيهات"
              description="طلبات تنتظر قرارك وقوائم انتظار نشطة"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                      طلبات إعادة جدولة
                    </p>
                    <p className="text-xs text-neutral-500">
                      {String(kpis?.pendingRescheduleRequests ?? 0)} طلب بانتظار القرار
                    </p>
                  </div>
                </div>
                <Button
                  variant="warning"
                  size="sm"
                  disabled={!rescheduleReviewTarget}
                  onClick={(): void => {
                    if (rescheduleReviewTarget) {
                      router.push(`/dashboard/live/sessions/${rescheduleReviewTarget.id}`);
                    }
                  }}
                >
                  مراجعة
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                      قائمة الانتظار
                    </p>
                    <p className="text-xs text-neutral-500">
                      {String(kpis?.waitlistEntries ?? 0)} طالب في الانتظار
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => { router.push("/dashboard/notifications"); }}
                >
                  الإشعارات
                </Button>
              </div>
            </div>
          </GlassSection>
        </>
      )}

      {activeTab === "schedule" && (
        <>
          {/* Weekly availability */}
          <GlassSection tone="cyan">
            <SectionHeader
              icon={<CalendarDays className="h-5 w-5" />}
              title="الجدول الأسبوعي"
              description="أوقاتك المتكررة المتاحة للحجز"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(): void => { router.push("/dashboard/live/schedules"); }}
                >
                  <Settings2 className="h-4 w-4" />
                  إدارة كاملة
                </Button>
              }
            />
            {availabilityLoading ? (
              <StudioSkeleton rows={1} />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {DAY_VALUES.map((dayValue, index) => {
                  const slots = daySlotsMap.get(dayValue) ?? [];
                  return (
                    <div
                      key={dayValue}
                      className={cn(
                        "flex min-h-28 flex-col gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]",
                        slots.length === 0 && "opacity-50",
                      )}
                    >
                      <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                        {DAY_NAMES[index] ?? "—"}
                      </p>
                      {slots.length === 0 ? (
                        <p className="text-[10px] text-neutral-400">لا أوقات</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {slots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between rounded-lg bg-cyan-500/10 px-2 py-1"
                            >
                              <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                                {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                              </span>
                              <Badge variant="primary" className="text-[8px]">
                                {slot.type === "GROUP" ? "مجموعة" : "فردي"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(dateBlocks ?? []).length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <CalendarOff className="h-4 w-4 text-rose-500" />
                  تواريخ محظورة
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(dateBlocks ?? []).map((block) => (
                    <Badge key={block.id} variant="secondary" className="text-[10px]">
                      {block.date}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </GlassSection>

          {/* Recurring schedule */}
          <GlassSection tone="amber">
            <SectionHeader
              icon={<RefreshCw className="h-5 w-5" />}
              title="المواعيد المتكررة"
              description="مواعيد أسبوعية ثابتة تُفتح تلقائياً"
            />
            {availabilityLoading ? (
              <StudioSkeleton rows={2} />
            ) : recurringSlots.length === 0 ? (
              <p className="rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-500 dark:bg-white/[0.04]">
                لا توجد مواعيد متكررة — أضفها من إدارة الأوقات
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {recurringSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {DAY_NAMES[DAY_VALUES.indexOf(slot.dayOfWeek)] ?? "—"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant={slot.type === "GROUP" ? "warning" : "primary"} className="text-[10px]">
                      {slot.type === "GROUP" ? "مجموعة" : "فردي"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </GlassSection>
        </>
      )}

      {activeTab === "sessions" && (
        <>
          {/* Groups + Private students */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GlassSection tone="violet">
              <SectionHeader
                icon={<Users className="h-5 w-5" />}
                title="حصص المجموعات"
                description="مجموعاتك الثابتة ومعدلات الحجز"
              />
              {sessionsLoading ? (
                <StudioSkeleton rows={2} />
              ) : groupSessions.length === 0 ? (
                <p className="rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-500 dark:bg-white/[0.04]">
                  لا توجد حصص مجموعات بعد
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {groupSessions.map((session) => (
                    <GroupCard
                      key={session.id}
                      session={session}
                      onClick={() => { handleOpenSession(session); }}
                    />
                  ))}
                </div>
              )}
            </GlassSection>

            <GlassSection tone="emerald">
              <SectionHeader
                icon={<User className="h-5 w-5" />}
                title="الطلاب الخاصون"
                description="حصصك الفردية وعدد الطلاب"
              />
              {sessionsLoading ? (
                <StudioSkeleton rows={2} />
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
                        {String(kpis?.uniqueStudents ?? 0)}
                      </p>
                      <p className="text-xs text-neutral-500">طالب فريد عبر حصصك</p>
                    </div>
                  </div>
                  {privateSessions.length === 0 ? (
                    <p className="rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-500 dark:bg-white/[0.04]">
                      لا توجد حصص فردية بعد
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {privateSessions.map((session) => (
                        <GroupCard
                          key={session.id}
                          session={session}
                          onClick={() => { handleOpenSession(session); }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </GlassSection>
          </div>

          {/* Statistics */}
          <GlassSection tone="primary">
            <SectionHeader
              icon={<BarChart3 className="h-5 w-5" />}
              title="إحصاءات الأسبوع"
              description="عدد الحصص خلال آخر 7 أيام"
            />
            {sessionsLoading ? (
              <StudioSkeleton rows={1} />
            ) : (
              <MiniBarChart data={weekChartData} className="px-1" />
            )}
          </GlassSection>
        </>
      )}

      {/* Floating live control */}
      {liveSession && (
        <div className="fixed bottom-24 end-4 z-40 w-[calc(100%-2rem)] max-w-sm lg:bottom-6 lg:end-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-400/60 to-transparent p-px shadow-2xl [animation:sidebar-slide-in_0.25s_ease]">
            <div className="flex items-center gap-3 bg-[var(--ui-card-bg)] p-4 backdrop-blur-xl dark:bg-[var(--ui-card-bg-dark)]">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
                  <Radio className="h-5 w-5" />
                </div>
                <span className="absolute -end-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-rose-500 opacity-60" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">
                  {liveSession.title}
                </p>
                <p className="text-xs text-rose-500">تبث مباشرة الآن</p>
              </div>
              <Button
                size="sm"
                onClick={(): void => { void handleEnd(liveSession); }}
                loading={endSession.isPending}
                variant="danger"
                leftIcon={<Square className="h-4 w-4" />}
              >
                إنهاء
              </Button>
              <Button
                size="sm"
                onClick={() => { handleOpenSession(liveSession); }}
                variant="outline"
              >
                تحكم
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateSessionDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); }}
        onCreated={() => { void retrySessions(); }}
      />
      <CreateSessionDialog
        open={Boolean(editSession)}
        session={editSession}
        onClose={() => { setEditSession(null); }}
        onCreated={() => { void retrySessions(); }}
      />
      <SessionDetailDialog
        session={detailSession}
        onClose={() => { setDetailSession(null); }}
      />

      {sessionsError && (
        <ErrorState
          title="فشل تحميل الحصص"
          onRetry={(): void => { void retrySessions(); }}
        />
      )}
    </div>
  );
}

function GroupCard({
  session,
  onClick,
}: {
  session: LiveSessionItem;
  onClick: () => void;
}): ReactNode {
  const meta = statusMeta(session);
  const start = new Date(session.startTime);

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-start transition-colors hover:bg-neutral-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {session.title}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {start.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}
          {" · "}
          {formatTime(session.startTime)} - {formatTime(session.endTime)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs tabular-nums text-neutral-500">
          {String(session._count.bookings)}/{String(session.maxStudents)}
        </span>
        <Badge variant={meta.variant} className="text-[10px]">
          {meta.label}
        </Badge>
      </div>
    </button>
  );
}

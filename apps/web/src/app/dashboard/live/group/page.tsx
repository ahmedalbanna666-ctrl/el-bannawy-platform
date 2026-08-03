"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Play,
  Star,
  Users,
} from "lucide-react";
import {
  useLiveSessions,
  useBookSession,
  useCreateSubscription,
  useMyBookings,
  type LiveSessionItem,
} from "@/lib/live-api";
import { formatDate, formatTime } from "@/lib/live-format";
import { SummaryCard } from "@/components/live/summary-card";
import { LiveEmpty } from "@/components/live/live-empty";
import { LiveError } from "@/components/live/live-error";
import { SuccessOverlay } from "@/components/live/success-overlay";
import { cn } from "@/lib/utils";

interface GroupDef {
  key: string;
  teacherId: string;
  teacherName: string;
  startHour: number;
  startMinute: number;
  sessions: LiveSessionItem[];
  seatsLeft: number;
}

function buildGroups(sessions: LiveSessionItem[]): GroupDef[] {
  const groups = new Map<string, GroupDef>();
  for (const s of sessions) {
    const start = new Date(s.startTime);
    const key = `${s.teacherId}-${String(start.getHours())}-${String(start.getMinutes())}`;
    const existing = groups.get(key);
    const seatsLeft = s.maxStudents > 0 ? s.maxStudents - s._count.bookings : 0;
    if (existing) {
      existing.sessions.push(s);
      existing.seatsLeft = Math.min(existing.seatsLeft, seatsLeft);
    } else {
      groups.set(key, {
        key,
        teacherId: s.teacherId,
        teacherName: s.teacher.fullName,
        startHour: start.getHours(),
        startMinute: start.getMinutes(),
        sessions: [s],
        seatsLeft,
      });
    }
  }
  return Array.from(groups.values()).map((g) => ({
    ...g,
    sessions: g.sessions.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    ),
  }));
}

export default function GroupPage(): ReactNode {
  const router = useRouter();
  const { data: sessions, isLoading, isError, refetch } = useLiveSessions();
  const { data: myBookings } = useMyBookings();
  const { mutateAsync: createSubscription } = useCreateSubscription();
  const { mutateAsync: bookSession } = useBookSession();

  const [selectedGroup, setSelectedGroup] = useState<GroupDef | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupSessions = useMemo(
    () => (sessions ?? []).filter((s) => s.type === "GROUP" && s.status !== "DRAFT" && s.status !== "CANCELLED"),
    [sessions],
  );

  const groups = useMemo(() => buildGroups(groupSessions), [groupSessions]);

  const bookedSessionIds = useMemo(
    () => new Set((myBookings ?? []).map((b) => b.sessionId)),
    [myBookings],
  );

  const nextUpcoming = useCallback(
    (g: GroupDef): LiveSessionItem | undefined =>
      g.sessions.find(
        (s) => new Date(s.startTime) > new Date() && !bookedSessionIds.has(s.id),
      ),
    [bookedSessionIds],
  );

  const firstSession = selectedGroup?.sessions[0];

  const handleJoinGroup = useCallback(
    async (group: GroupDef): Promise<void> => {
      const target = nextUpcoming(group);
      if (!target) return;
      setError(null);
      try {
        await createSubscription({ teacherId: group.teacherId, type: "GROUP_MONTHLY" });
        await bookSession({ sessionId: target.id });
        setShowSuccess(true);
      } catch {
        setError("فشل الانضمام للمجموعة");
      }
    },
    [createSubscription, bookSession, nextUpcoming],
  );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={(): void => { router.push("/dashboard/live"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للحصص المباشرة
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-500/30">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              حصص المجموعة
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              ادرس ضمن مجموعة ثابتة من زملائك وابدأ قريباً.
            </p>
          </div>
        </div>
      </div>

      {isError && (
        <LiveError
          kind="failed"
          onAction={(): void => { void refetch(); }}
          secondaryLabel="العودة"
          onSecondary={(): void => { router.push("/dashboard/live"); }}
        />
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-3xl border border-neutral-200 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && !selectedGroup && (
        <>
          {groups.length === 0 ? (
            <LiveEmpty
              tone="violet"
              icon={<Users className="h-10 w-10" />}
              title="لا توجد مجموعات متاحة حالياً"
              description="سيتم فتح مجموعات جديدة قريباً."
            />
          ) : (
            <>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                اختر مجموعتك
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => {
                  const next = nextUpcoming(group);
                  const tone =
                    group.seatsLeft <= 2
                      ? "text-danger-500"
                      : group.seatsLeft <= 5
                        ? "text-warning-500"
                        : "text-emerald-500";
                  return (
                    <button
                      key={group.key}
                      onClick={() => { setSelectedGroup(group); }}
                      className="group relative flex flex-col gap-4 rounded-3xl border border-neutral-200/70 bg-white/80 p-6 text-start backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 dark:text-purple-300">
                            <Users className="h-7 w-7" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                              مجموعة مع {group.teacherName}
                            </h3>
                            <p className="text-xs text-neutral-500">
                              {group.sessions.length} حصة مجدولة
                            </p>
                          </div>
                        </div>
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary-500" />
                          {String(group.startHour).padStart(2, "0")}:{String(group.startMinute).padStart(2, "0")}
                        </span>
                        {next && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-primary-500" />
                            تبدأ {formatDate(next.startTime)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-white/5">
                        <span className={cn("text-sm font-bold", tone)}>
                          {group.seatsLeft > 0 ? `${String(group.seatsLeft)} مقعد متبقي` : "ممتلئة"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-600 transition-transform duration-300 group-hover:gap-2 dark:text-purple-300">
                          انضم للمجموعة
                          <ArrowLeft className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {!isLoading && !isError && selectedGroup && (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => { setSelectedGroup(null); }}
            className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" />
            جميع المجموعات
          </button>

          <SummaryCard title={`جدول مجموعة ${firstSession?.teacher.fullName ?? ""}`}>
            {selectedGroup.sessions.map((session) => {
              const start = new Date(session.startTime);
              const seatsLeft = session.maxStudents > 0 ? session.maxStudents - session._count.bookings : 0;
              const booked = bookedSessionIds.has(session.id);
              const past = start < new Date();
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/[0.04]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 dark:text-primary-300">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {formatDate(start)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatTime(start)} · {session.title}
                    </p>
                  </div>
                  {booked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success-500">
                      <Check className="h-3.5 w-3.5" />
                      محجوز
                    </span>
                  ) : past ? (
                    <span className="text-xs text-neutral-400">انتهت</span>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-bold",
                        seatsLeft <= 0
                          ? "text-danger-500"
                          : seatsLeft <= 2
                            ? "text-warning-500"
                            : "text-emerald-500",
                      )}
                    >
                      {seatsLeft > 0 ? `${String(seatsLeft)} مقعد` : "ممتلئة"}
                    </span>
                  )}
                </div>
              );
            })}
          </SummaryCard>

          {error && (
            <LiveError
              kind="payment"
              onAction={(): void => { void handleJoinGroup(selectedGroup); }}
            />
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => { void handleJoinGroup(selectedGroup); }}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-primary-600 px-6 text-base font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:brightness-110 active:scale-[0.99]"
            >
              <Play className="h-5 w-5" />
              الانضمام للمجموعة
            </button>
            <button
              onClick={() => { setSelectedGroup(null); }}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              اختيار مجموعة أخرى
            </button>
          </div>
        </div>
      )}

      <SuccessOverlay
        open={showSuccess}
        onDone={(): void => { router.push("/dashboard/live"); }}
        title="انضممت للمجموعة!"
        subtitle="تم حجز أول حصة وسيتم تذكيرك بها."
      />
    </div>
  );
}

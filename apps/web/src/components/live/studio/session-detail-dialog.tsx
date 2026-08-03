"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Video,
  Users,
  Play,
  Square,
  Settings2,
  Link2,
  MonitorUp,
  Check,
  X,
  CalendarClock,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useControlPanel,
  useStartSession,
  useEndSession,
  useDecideReschedule,
  type LiveSessionItem,
} from "@/lib/live-api";

const STATUS_BADGES: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "primary" | "secondary" }> = {
  DRAFT: { label: "مسودة", variant: "secondary" },
  PUBLISHED: { label: "منشور", variant: "info" },
  SCHEDULED: { label: "مجدول", variant: "info" },
  OPEN: { label: "مفتوح", variant: "success" },
  FULL: { label: "ممتلئ", variant: "warning" },
  LIVE: { label: "مباشر", variant: "danger" },
  COMPLETED: { label: "مكتمل", variant: "success" },
  CANCELLED: { label: "ملغي", variant: "secondary" },
  ARCHIVED: { label: "مؤرشف", variant: "secondary" },
};

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

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface SessionDetailDialogProps {
  session: LiveSessionItem | null;
  onClose: () => void;
}

export function SessionDetailDialog({
  session,
  onClose,
}: SessionDetailDialogProps): ReactNode {
  const router = useRouter();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const decideReschedule = useDecideReschedule();
  const { data: panel, isLoading: panelLoading } = useControlPanel(
    session?.id,
  );

  const handleStart = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      await startSession.mutateAsync(session.id);
    } catch {
      // handled by mutation
    }
  }, [session, startSession]);

  const handleEnd = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      await endSession.mutateAsync(session.id);
    } catch {
      // handled by mutation
    }
  }, [session, endSession]);

  const handleDecideReschedule = useCallback(
    async (bookingId: string, decision: "APPROVED" | "REJECTED"): Promise<void> => {
      try {
        await decideReschedule.mutateAsync({ bookingId, decision });
      } catch {
        // handled by mutation
      }
    },
    [decideReschedule],
  );

  const handleOpenPanel = useCallback((): void => {
    if (!session) return;
    onClose();
    router.push(`/dashboard/live/sessions/${session.id}`);
  }, [session, onClose, router]);

  if (!session) return null;

  const statusInfo = STATUS_BADGES[session.status] ?? { label: session.status, variant: "secondary" as const };
  const isLive = session.status === "LIVE";
  const canStart = ["SCHEDULED", "PUBLISHED", "OPEN"].includes(session.status);
  const isPast = new Date(session.endTime) < new Date();

  return (
    <Dialog open={Boolean(session)} onClose={onClose} title={session.title}>
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            <span className="text-xs text-neutral-500">
              {formatDate(session.startTime)} · {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <InfoChip icon={<Video className="h-4 w-4" />} label="المنصة" value={session.meetingProvider ?? "—"} />
            <InfoChip
              icon={<Users className="h-4 w-4" />}
              label="المقاعد"
              value={`${String(session._count.bookings)} / ${String(session.maxStudents)}`}
            />
            <InfoChip
              icon={<MonitorUp className="h-4 w-4" />}
              label="تسجيل تلقائي"
              value={session.autoRecord ? "مفعّل" : "معطّل"}
            />
            <InfoChip
              icon={<Clock className="h-4 w-4" />}
              label="المدة"
              value={`${String(session.durationMinutes)} دقيقة`}
            />
          </div>

          {session.description && (
            <p className="rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-300">
              {session.description}
            </p>
          )}

          {(session.meetingUrl ?? session.zoomJoinUrl) && (
            <div className="flex flex-col gap-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-white/[0.04]">
              <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <Link2 className="h-3.5 w-3.5" />
                رابط الاجتماع
              </span>
              <a
                href={session.meetingUrl ?? session.zoomJoinUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="break-all text-xs font-medium text-cyan-600 underline-offset-2 hover:underline dark:text-cyan-300"
              >
                {session.meetingUrl ?? session.zoomJoinUrl}
              </a>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <Users className="h-3.5 w-3.5" />
              المشاركون ({panel?.participants.length ?? 0})
            </span>
            {panelLoading && (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            )}
            {!panelLoading && (!panel?.participants || panel.participants.length === 0) && (
              <p className="rounded-xl bg-neutral-50 p-3 text-center text-xs text-neutral-500 dark:bg-white/[0.04]">
                لم يحجز أي طالب هذه الحصة بعد
              </p>
            )}
            {!panelLoading && panel && panel.participants.length > 0 && (
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                {panel.participants.map((p) => {
                  const student = (p as unknown as { student: { id: string; fullName: string; email: string; avatarUrl: string | null } }).student;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/[0.04]"
                    >
                      <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        {student.fullName}
                      </span>
                      <span className="shrink-0 text-[10px] text-neutral-400" dir="ltr">
                        {student.email}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {((): ReactNode => {
            const requests = (panel?.participants ?? []).filter((p) => p.rescheduleStatus === "REQUESTED");
            if (requests.length === 0) return null;
            return (
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <CalendarClock className="h-3.5 w-3.5" />
                  طلبات إعادة الجدولة
                </span>
                {requests.map((p) => {
                  const student = (p as unknown as { student: { id: string; fullName: string; email: string; avatarUrl: string | null } }).student;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-900/10">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">{student.fullName}</p>
                        <p className="truncate text-xs text-neutral-500">{p.rescheduleReason ?? "بدون سبب"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button size="sm" variant="success" disabled={decideReschedule.isPending} onClick={() => { void handleDecideReschedule(p.id, "APPROVED"); }} title="قبول الطلب">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={decideReschedule.isPending} onClick={() => { void handleDecideReschedule(p.id, "REJECTED"); }} title="رفض الطلب">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenPanel}
          leftIcon={<Settings2 className="h-4 w-4" />}
        >
          لوحة التحكم
        </Button>
        {canStart && !isPast && (
          <Button
            size="sm"
            loading={startSession.isPending}
            onClick={() => { void handleStart(); }}
            leftIcon={<Play className="h-4 w-4" />}
          >
            بدء الحصة
          </Button>
        )}
        {isLive && (
          <Button
            size="sm"
            variant="danger"
            loading={endSession.isPending}
            onClick={() => { void handleEnd(); }}
            leftIcon={<Square className="h-4 w-4" />}
          >
            إنهاء الحصة
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-neutral-500">{label}</p>
        <p className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100">
          {value}
        </p>
      </div>
    </div>
  );
}

export { formatDate, formatTime };

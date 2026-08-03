"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Calendar, Clock, Video, Loader2, Play, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { LiveCountdown } from "@/components/live/live-countdown";
import { ZoomMeetingRoom } from "@/components/live/zoom-meeting-room";
import {
  useJoinSession,
  useLeaveSession,
  type LessonLiveSessionView,
  type ZoomJoinConfig,
} from "@/lib/live-api";

function formatLiveDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatLiveTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

type CardPhase = "upcoming" | "live" | "ended" | "cancelled" | "completed";

function derivePhase(view: LessonLiveSessionView): CardPhase {
  const { session } = view;
  if (session.status === "CANCELLED") return "cancelled";
  if (session.status === "COMPLETED" || session.status === "ARCHIVED") return "completed";
  const now = Date.now();
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  if (now > end) return "ended";
  if (now >= start) return "live";
  return "upcoming";
}

function JoinModal({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}): ReactNode {
  const joinSession = useJoinSession();
  const leaveSession = useLeaveSession();
  const [config, setConfig] = useState<ZoomJoinConfig | null>(null);
  const [joinError, setJoinError] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);

  const device = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 255) : "";

  const handleJoin = useCallback(async (): Promise<void> => {
    setJoinError("");
    setConfig(null);
    try {
      const result = await joinSession.mutateAsync({ sessionId, device });
      if (result.provider === "ZOOM_SDK" || result.meetingNumber) {
        setConfig(result);
      } else if (result.meetingUrl) {
        // External meeting link fallback.
        window.open(result.meetingUrl, "_blank", "noopener,noreferrer");
        onClose();
      } else {
        setJoinError("لا يوجد اجتماع مرتبط بهذه الحصة");
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "تعذر الانضمام إلى الاجتماع");
    }
  }, [joinSession, sessionId, device, onClose]);

  useEffect(() => {
    void handleJoin();
  }, [handleJoin, retryKey]);

  const handleLeave = useCallback((): void => {
    leaveSession.mutate(sessionId, { onSettled: () => { onClose(); } });
  }, [leaveSession, sessionId, onClose]);

  return (
    <Dialog open onClose={onClose} title="محاضرة مباشرة" className="max-w-4xl">
      <DialogContent>
        {joinError && !config && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-danger-500">{joinError}</p>
            <Button variant="primary" size="sm" onClick={() => { setRetryKey((k) => k + 1); }}>
              <Loader2 className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        )}
        {!joinError && !config && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
            جارٍ التحقق من الاشتراك وتجهيز الاجتماع...
          </div>
        )}
        {config && (
          <ZoomMeetingRoom
            key={`${sessionId}-${String(retryKey)}`}
            config={config}
            onLeave={handleLeave}
            onExit={onClose}
            onRetry={() => { setRetryKey((k) => k + 1); }}
          />
        )}
      </DialogContent>
      {!config && (
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  );
}

interface LessonLiveSessionCardProps {
  view: LessonLiveSessionView;
}

export function LessonLiveSessionCard({ view }: LessonLiveSessionCardProps): ReactNode {
  const { session, canJoin, hasActiveSubscription, isBooked } = view;
  const phase = derivePhase(view);
  const [joinOpen, setJoinOpen] = useState(false);

  const badge = ((): ReactNode => {
    switch (phase) {
      case "upcoming":
        return <Badge variant="primary">قادمة</Badge>;
      case "live":
        return canJoin ? <Badge variant="danger">مباشر الآن</Badge> : <Badge variant="warning">مباشر</Badge>;
      case "ended":
        return <Badge variant="secondary">انتهت</Badge>;
      case "cancelled":
        return <Badge variant="danger">ملغاة</Badge>;
      case "completed":
        return <Badge variant="success">مكتملة</Badge>;
    }
  })();

  const blockedReason = ((): string | null => {
    if (canJoin) return null;
    if (phase !== "live") return null;
    if (!hasActiveSubscription && !isBooked) return "الانضمام يتطلب اشتراكاً نشطاً";
    return "غير مسجل في هذه المادة";
  })();

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden border-primary-500/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-danger-500/10 text-danger-500">
              <Video className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-base font-bold text-neutral-900 dark:text-neutral-100">
                {session.title}
              </h3>
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                {session.teacher.fullName}
              </p>
            </div>
          </div>
          {badge}
        </div>

        {session.description && (
          <p className="mt-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {session.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatLiveDate(session.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatLiveTime(session.startTime)} - {formatLiveTime(session.endTime)}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
          {phase === "upcoming" && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              يبدأ خلال:
              <LiveCountdown targetDate={session.startTime} />
            </div>
          )}
          {phase === "ended" && (
            <span className="flex items-center gap-1.5 text-sm text-neutral-400">
              <CheckCircle2 className="h-4 w-4" />
              انتهت المحاضرة
            </span>
          )}
          {phase === "cancelled" && (
            <span className="text-sm text-danger-500">تم إلغاء هذه المحاضرة</span>
          )}
          {phase === "completed" && (
            <span className="flex items-center gap-1.5 text-sm text-success-500">
              <CheckCircle2 className="h-4 w-4" />
              اكتملت المحاضرة
            </span>
          )}
          {(phase === "live" || phase === "upcoming") && (
            <div className="flex items-center gap-3">
              {blockedReason && (
                <span className="flex items-center gap-1.5 text-xs text-warning-600 dark:text-warning-400">
                  <Lock className="h-3.5 w-3.5" />
                  {blockedReason}
                </span>
              )}
              {canJoin && (
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setJoinOpen(true); }}
                >
                  <Play className="h-4 w-4" />
                  انضم الآن
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {joinOpen && (
        <JoinModal
          sessionId={session.id}
          onClose={() => { setJoinOpen(false); }}
        />
      )}
    </Card>
  );
}

export function LessonLiveSessionCardSkeleton(): ReactNode {
  return (
    <Card variant="default" padding="none">
      <CardContent className="flex flex-col gap-4 p-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-neutral-200 dark:bg-neutral-700" />
            <div className="space-y-2">
              <div className="h-4 w-44 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
          <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="h-3 w-64 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-10 w-28 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </CardContent>
    </Card>
  );
}

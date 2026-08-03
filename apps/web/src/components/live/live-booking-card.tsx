"use client";

import {
  Calendar,
  Clock,
  RefreshCw,
  User,
  Video,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveCountdown } from "@/components/live/live-countdown";
import { BookingTimeline } from "@/components/live/booking-timeline";
import {
  type LiveBookingItem,
  deriveSessionState,
} from "@/lib/live-api";
import { formatDateFull, formatTime } from "@/lib/live-format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface LiveBookingCardProps {
  booking: LiveBookingItem;
  onJoin?: (booking: LiveBookingItem) => void;
  onReschedule?: (booking: LiveBookingItem) => void;
  onCancel?: (booking: LiveBookingItem) => void;
  cancelling?: boolean;
  showActions?: boolean;
}

const statusBadge: Record<string, { label: string; variant: "success" | "danger" | "info" | "warning" | "primary" }> = {
  CONFIRMED: { label: "مؤكد", variant: "success" },
  CANCELLED: { label: "ملغي", variant: "danger" },
  RESCHEDULED: { label: "أعيدت جدولته", variant: "info" },
};

export function LiveBookingCard({
  booking,
  onJoin,
  onReschedule,
  onCancel,
  cancelling,
  showActions = true,
}: LiveBookingCardProps): ReactNode {
  const session = booking.session;
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const state = deriveSessionState(session, true);
  const isLive = state === "join_now" || state === "live";
  const isUpcoming = start > new Date();
  const isPast = end < new Date();
  const badge = statusBadge[booking.status] ?? statusBadge.CONFIRMED;
  const hasPendingReschedule = booking.rescheduleStatus === "REQUESTED";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)]",
        isLive && "ring-2 ring-danger-400/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]",
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-lg font-bold text-neutral-900 dark:text-neutral-50">
              {session.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
              <User className="h-3.5 w-3.5" />
              {session.teacher.fullName}
            </p>
          </div>
          <Badge variant={badge.variant} className="shrink-0">
            {badge.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary-500" />
            {formatDateFull(start)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary-500" />
            {formatTime(start)} - {formatTime(end)}
          </span>
        </div>

        <BookingTimeline booking={booking} />

        {hasPendingReschedule && (
          <p className="rounded-xl bg-warning-500/10 px-3 py-2 text-xs font-medium text-warning-600 dark:text-warning-300">
            طلب إعادة الجدولة قيد المراجعة من قبل المعلم.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3 dark:border-white/5">
          {!isPast && state !== "cancelled" && state !== "completed" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">يبدأ خلال</span>
              <LiveCountdown targetDate={session.startTime} />
            </div>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-danger-500">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
              </span>
              مباشر الآن
            </span>
          ) : null}

          {isLive && session.meetingUrl && (
            <Button
              variant="danger"
              size="sm"
              className="rounded-xl"
              onClick={() => { onJoin?.(booking); }}
            >
              <Video className="h-4 w-4" />
              انضم الآن
            </Button>
          )}

          {showActions && isUpcoming && state !== "cancelled" && !hasPendingReschedule && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => { onReschedule?.(booking); }}
              >
                <RefreshCw className="h-4 w-4" />
                إعادة جدولة
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-danger-500 hover:bg-danger-500/10"
                onClick={() => { onCancel?.(booking); }}
                loading={cancelling}
              >
                <XCircle className="h-4 w-4" />
                إلغاء
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function LiveBookingCardSkeleton(): ReactNode {
  return (
    <div className="rounded-3xl border border-neutral-200/70 bg-white/80 p-5 dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)]">
      <div className="animate-pulse space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-lg bg-neutral-200 dark:bg-white/10" />
            <div className="h-4 w-28 rounded-lg bg-neutral-200 dark:bg-white/10" />
          </div>
          <div className="h-6 w-16 rounded-full bg-neutral-200 dark:bg-white/10" />
        </div>
        <div className="h-4 w-64 rounded-lg bg-neutral-200 dark:bg-white/10" />
        <div className="h-10 w-full rounded-xl bg-neutral-200 dark:bg-white/10" />
        <div className="flex justify-end gap-2">
          <div className="h-10 w-28 rounded-xl bg-neutral-200 dark:bg-white/10" />
          <div className="h-10 w-20 rounded-xl bg-neutral-200 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

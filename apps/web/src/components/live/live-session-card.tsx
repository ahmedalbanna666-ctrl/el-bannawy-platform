"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
  Settings2,
  Play,
  Square,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveCountdown } from "@/components/live/live-countdown";
import { cn } from "@/lib/utils";
import type {
  LiveSessionItem,
  SessionCardState,
} from "@/lib/live-api";

const stateConfig: Record<
  SessionCardState,
  {
    badgeLabel: string;
    badgeVariant: "primary" | "success" | "warning" | "danger" | "info" | "secondary";
    actionLabel: string;
    actionVariant: "primary" | "success" | "outline" | "secondary" | "ghost";
    icon: ReactNode;
  }
> = {
  draft: {
    badgeLabel: "مسودة",
    badgeVariant: "secondary",
    actionLabel: "",
    actionVariant: "ghost",
    icon: <></>,
  },
  available: {
    badgeLabel: "متاح للحجز",
    badgeVariant: "primary",
    actionLabel: "احجز الآن",
    actionVariant: "primary",
    icon: <Calendar className="h-5 w-5" />,
  },
  booked: {
    badgeLabel: "تم الحجز",
    badgeVariant: "success",
    actionLabel: "عرض التفاصيل",
    actionVariant: "outline",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  join_now: {
    badgeLabel: "مباشر الآن",
    badgeVariant: "success",
    actionLabel: "انضم الآن",
    actionVariant: "primary",
    icon: <Video className="h-5 w-5" />,
  },
  live: {
    badgeLabel: "مباشر",
    badgeVariant: "danger",
    actionLabel: "انضم",
    actionVariant: "primary",
    icon: <Video className="h-5 w-5" />,
  },
  completed: {
    badgeLabel: "منتهية",
    badgeVariant: "secondary",
    actionLabel: "عرض التسجيل",
    actionVariant: "ghost",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  cancelled: {
    badgeLabel: "ملغية",
    badgeVariant: "danger",
    actionLabel: "",
    actionVariant: "ghost",
    icon: <XCircle className="h-5 w-5" />,
  },
  full: {
    badgeLabel: "ممتلئ",
    badgeVariant: "warning",
    actionLabel: "تنبيه عند التوفر",
    actionVariant: "secondary",
    icon: <Ban className="h-5 w-5" />,
  },
  loading: {
    badgeLabel: "...",
    badgeVariant: "secondary",
    actionLabel: "",
    actionVariant: "ghost",
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
  },
};

interface LiveSessionCardProps {
  session: LiveSessionItem;
  state: SessionCardState;
  onBook?: (sessionId: string) => void;
  onJoin?: (session: LiveSessionItem) => void;
  canControl?: boolean;
  onControl?: (session: LiveSessionItem, action: "start" | "end" | "publish" | "unpublish" | "panel") => void;
  className?: string;
}

export function LiveSessionCard({
  session,
  state,
  onBook,
  onJoin,
  canControl = false,
  onControl,
  className,
}: LiveSessionCardProps): ReactNode {
  const router = useRouter();
  const config = stateConfig[state];

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);
  const isPast = endDate < new Date();
  const availableSeats = session.maxStudents - session._count.bookings;

  const formatTime = useCallback((d: Date) => {
    return d.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatDate = useCallback((d: Date) => {
    return d.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const handleAction = useCallback(() => {
    if (state === "available" && onBook) {
      onBook(session.id);
    } else if (
      (state === "join_now" || state === "live") &&
      onJoin
    ) {
      onJoin(session);
    } else if (state === "booked") {
      router.push(`/dashboard/live/sessions/${session.id}`);
    }
  }, [state, onBook, onJoin, router, session]);

  return (
    <Card
      variant="default"
      padding="none"
      className={cn(
        "overflow-hidden transition-all duration-200",
        state === "live" || state === "join_now"
          ? "ring-2 ring-danger-500/30 dark:ring-danger-400/20"
          : "",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="line-clamp-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {session.title}
            </h3>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              {session.teacher.name}
            </p>
          </div>
          <Badge variant={config.badgeVariant} className="shrink-0">
            {config.badgeLabel}
          </Badge>
        </div>

        <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {session.description ?? "لا يوجد وصف"}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(startDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatTime(startDate)} - {formatTime(endDate)}
          </span>
          {!isPast && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {availableSeats > 0 ? `${String(availableSeats)} مقاعد متاحة` : "ممتلئ"}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {!isPast && state !== "completed" && state !== "cancelled" && state !== "full" && (
            <LiveCountdown targetDate={session.startTime} compact />
          )}

          {(state === "join_now" || state === "live") && session.meetingUrl && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-danger-500 hover:text-danger-600 dark:text-danger-400 dark:hover:text-danger-300"
              dir="ltr"
            >
              <Video className="h-4 w-4" />
              رابط الاجتماع
            </a>
          )}

          {canControl && onControl ? (
            <div className="mr-auto flex items-center gap-2">
              {(state === "live" || state === "join_now") && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { onControl(session, "end"); }}
                >
                  <Square className="h-4 w-4" />
                  إنهاء
                </Button>
              )}
              {(state === "available" || state === "booked" || state === "full") && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { onControl(session, "start"); }}
                >
                  <Play className="h-4 w-4" />
                  بدء
                </Button>
              )}
              {session.status === "DRAFT" && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => { onControl(session, "publish"); }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  نشر
                </Button>
              )}
              {session.status === "PUBLISHED" && (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => { onControl(session, "unpublish"); }}
                >
                  <Ban className="h-4 w-4" />
                  إلغاء النشر
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onControl(session, "panel"); }}
              >
                <Settings2 className="h-4 w-4" />
                تحكم
              </Button>
            </div>
          ) : (
            state !== "cancelled" && state !== "loading" && state !== "completed" && (
              <Button
                variant={config.actionVariant}
                size="sm"
                onClick={handleAction}
                className="mr-auto"
              >
                {config.icon}
                {config.actionLabel}
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

export function LiveSessionCardSkeleton(): ReactNode {
  return (
    <Card variant="default" padding="none">
      <div className="flex flex-col gap-4 p-5 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-32 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="h-4 w-full rounded-lg bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex gap-3">
          <div className="h-4 w-36 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="flex justify-between pt-2">
          <div className="h-4 w-32 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-10 w-28 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    </Card>
  );
}

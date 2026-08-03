"use client";

import { Bell, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveSessionItem, LiveWaitingListEntry } from "@/lib/live-api";
import { formatDateFull, formatTime, waitlistChance } from "@/lib/live-format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface WaitlistCardProps {
  entry?: LiveWaitingListEntry;
  session?: LiveSessionItem;
  /** Estimated position when the session is full and the student is not on the list. */
  estimatedPosition?: number;
  onJoin?: () => void;
  onLeave?: () => void;
  joining?: boolean;
  leaving?: boolean;
  compact?: boolean;
}

/**
 * Waitlist states: a full session offers "Join Waiting List" instead of a
 * disabled button; an active entry shows position, estimated chance and leave.
 */
export function WaitlistCard({
  entry,
  session,
  estimatedPosition,
  onJoin,
  onLeave,
  joining,
  leaving,
  compact,
}: WaitlistCardProps): ReactNode {
  const title = entry?.session.title ?? session?.title ?? "";
  const pos = entry?.position ?? estimatedPosition ?? 1;
  const chance = waitlistChance(pos);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-primary-500/5 p-5 dark:from-amber-400/10 dark:to-primary-400/5",
        !compact && "dark:border-amber-400/20",
      )}
    >
      <span className="pointer-events-none absolute inset-0 -z-0 opacity-40 [mask-image:radial-gradient(circle_at_80%_0%,black,transparent_60%)]">
        <Bell className="h-24 w-24 text-amber-400/40" />
      </span>

      {entry ? (
        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 dark:text-amber-300">
              <Bell className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {title}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatDateFull(entry.session.startTime)} · {formatTime(entry.session.startTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 dark:bg-white/[0.04]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-center text-white shadow-md">
              <span className="text-lg font-bold">{pos}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                ترتيبك في قائمة الانتظار
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700"
                  style={{ width: `${String(chance)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                فرصة الحجز التقريبية {chance}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-danger-600 hover:bg-danger-500/10 dark:text-danger-300"
              onClick={onLeave}
              loading={leaving}
            >
              <X className="h-4 w-4" />
              مغادرة القائمة
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 dark:text-amber-300">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                الحصة ممتلئة حالياً
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {title}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            انضم لقائمة الانتظار وسنخطرك فور توفر مقعد.
          </p>
          <Button
            variant="warning"
            size="md"
            fullWidth
            onClick={onJoin}
            loading={joining}
            className="rounded-2xl"
          >
            <UserPlus className="h-4 w-4" />
            انضم لقائمة الانتظار
          </Button>
        </div>
      )}
    </div>
  );
}

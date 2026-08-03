"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarClock, CalendarDays, ListX, Timer, CheckCircle2 } from "lucide-react";
import {
  useMyBookings,
  useMyWaitlist,
  type LiveBookingItem,
} from "@/lib/live-api";
import { LiveBookingCard, LiveBookingCardSkeleton } from "@/components/live/live-booking-card";
import { WaitlistCard } from "@/components/live/waitlist-card";
import { LiveEmpty } from "@/components/live/live-empty";
import { cn } from "@/lib/utils";

type TabKey = "upcoming" | "today" | "completed" | "cancelled" | "rescheduled" | "waitlist";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "القادمة" },
  { key: "today", label: "اليوم" },
  { key: "completed", label: "المكتملة" },
  { key: "cancelled", label: "الملغية" },
  { key: "rescheduled", label: "أعيدت جدولتها" },
  { key: "waitlist", label: "قائمة الانتظار" },
];

interface MyBookingsTabsProps {
  onJoin?: (booking: LiveBookingItem) => void;
  onReschedule?: (booking: LiveBookingItem) => void;
  onCancel?: (booking: LiveBookingItem) => void;
  cancelling?: boolean;
}

export function MyBookingsTabs({
  onJoin,
  onReschedule,
  onCancel,
  cancelling,
}: MyBookingsTabsProps): ReactNode {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const { data: bookings, isLoading } = useMyBookings();
  const { data: waitlist, isLoading: waitlistLoading } = useMyWaitlist();

  const now = Date.now();

  const buckets = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return {
      upcoming:
        bookings?.filter((b) => b.status === "CONFIRMED" && new Date(b.session.startTime) > new Date()) ?? [],
      today:
        bookings?.filter((b) => {
          const start = new Date(b.session.startTime);
          return start >= todayStart && start < todayEnd;
        }) ?? [],
      completed:
        bookings?.filter((b) => {
          const end = new Date(b.session.endTime);
          return b.session.status === "COMPLETED" || end.getTime() < now;
        }) ?? [],
      cancelled: bookings?.filter((b) => b.status === "CANCELLED") ?? [],
      rescheduled: bookings?.filter((b) => b.status === "RESCHEDULED") ?? [],
    };
  }, [bookings, now]);

  const counts: Record<TabKey, number> = {
    upcoming: buckets.upcoming.length,
    today: buckets.today.length,
    completed: buckets.completed.length,
    cancelled: buckets.cancelled.length,
    rescheduled: buckets.rescheduled.length,
    waitlist: waitlist?.length ?? 0,
  };

  const emptyCopy: Record<TabKey, { title: string; description: string; icon: ReactNode }> = {
    upcoming: {
      title: "لا توجد حجوزات قادمة",
      description: "احجز حصتك المباشرة من الخدمات أعلاه.",
      icon: <CalendarClock className="h-10 w-10" />,
    },
    today: {
      title: "لا توجد حصص اليوم",
      description: "حصصك المباشرة لهذا اليوم ستظهر هنا.",
      icon: <CalendarDays className="h-10 w-10" />,
    },
    completed: {
      title: "لا توجد حصص مكتملة",
      description: "الحصص التي حضرتها ستظهر هنا.",
      icon: <CheckCircle2 className="h-10 w-10" />,
    },
    cancelled: {
      title: "لا توجد حجوزات ملغية",
      description: "ستظهر هنا الحجوزات التي ألغيتها.",
      icon: <ListX className="h-10 w-10" />,
    },
    rescheduled: {
      title: "لا توجد حجوزات معاد جدولتها",
      description: "ستظهر هنا الحجوزات التي أعيدت جدولتها.",
      icon: <Timer className="h-10 w-10" />,
    },
    waitlist: {
      title: "قائمة الانتظار فارغة",
      description: "انضم لقائمة انتظار أي حصة ممتلئة وسنخطرك عند التوفر.",
      icon: <CalendarClock className="h-10 w-10" />,
    },
  };

  const loading = (tab === "waitlist" ? waitlistLoading : isLoading) || isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => { setTab(t.key); }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
              tab === t.key
                ? "border-primary-400/50 bg-primary-500/15 text-primary-700 shadow-[0_0_14px_rgba(6,182,212,0.25)] dark:text-primary-200"
                : "border-neutral-200 bg-white/60 text-neutral-500 hover:border-primary-300 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400",
            )}
          >
            {t.label}
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                tab === t.key
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-200 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
              )}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <LiveBookingCardSkeleton key={i} />
          ))}
        </div>
      ) : tab === "waitlist" ? (
        (waitlist ?? []).length === 0 ? (
          <LiveEmpty tone="amber" {...emptyCopy.waitlist} />
        ) : (
          <div className="flex flex-col gap-3">
            {(waitlist ?? []).map((entry) => (
              <WaitlistCard key={entry.id} entry={entry} />
            ))}
          </div>
        )
      ) : buckets[tab].length === 0 ? (
        <LiveEmpty {...emptyCopy[tab]} />
      ) : (
        <div className="flex flex-col gap-3">
          {buckets[tab].map((booking) => (
            <LiveBookingCard
              key={booking.id}
              booking={booking}
              onJoin={onJoin}
              onReschedule={onReschedule}
              onCancel={onCancel}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}

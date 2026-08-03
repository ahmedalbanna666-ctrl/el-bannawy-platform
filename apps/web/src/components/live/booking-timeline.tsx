"use client";

import { Check, CircleDashed, Loader2 } from "lucide-react";
import type { LiveBookingItem } from "@/lib/live-api";
import { bookingTimeline } from "@/lib/live-format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Visual booking lifecycle timeline (Selected → Confirmed → Reminder → Live → Completed). */
export function BookingTimeline({ booking }: { booking: LiveBookingItem }): ReactNode {
  const steps = bookingTimeline(booking);
  const cancelled = booking.status === "CANCELLED";

  if (cancelled) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-danger-500/10 px-4 py-3 text-sm font-semibold text-danger-600 dark:text-danger-300">
        <span className="h-2 w-2 rounded-full bg-danger-500" />
        تم إلغاء هذا الحجز
      </div>
    );
  }

  return (
    <ol className="flex items-center gap-0" dir="rtl">
      {steps.map((step, i) => (
        <li key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  steps[i].state !== "pending" ? "bg-primary-400/70" : "bg-neutral-200 dark:bg-white/10",
                )}
              />
            )}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                step.state === "done"
                  ? "border-primary-500 bg-primary-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : step.state === "active"
                    ? "border-primary-400/70 bg-primary-500/15 text-primary-500 dark:text-primary-300"
                    : "border-neutral-200 bg-white text-neutral-300 dark:border-white/10 dark:bg-white/5 dark:text-neutral-600",
              )}
            >
              {step.state === "done" ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : step.state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CircleDashed className="h-4 w-4" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  steps[i + 1].state !== "pending" ? "bg-primary-400/70" : "bg-neutral-200 dark:bg-white/10",
                )}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium whitespace-nowrap",
              step.state === "pending"
                ? "text-neutral-400 dark:text-neutral-600"
                : "text-neutral-700 dark:text-neutral-300",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

"use client";

import { Check } from "lucide-react";
import type { AvailableSlotItem } from "@/lib/live-api";
import { formatTime, slotTone } from "@/lib/live-format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const toneClasses = {
  available:
    "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
  few: "border-amber-400/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
  full: "border-neutral-200 bg-neutral-100 text-neutral-400 line-through dark:border-white/5 dark:bg-white/5 dark:text-neutral-600",
  unavailable:
    "border-dashed border-neutral-200 bg-transparent text-neutral-300 dark:border-white/10 dark:text-neutral-700",
} as const;

interface WeeklyScheduleProps {
  slots: AvailableSlotItem[];
  selectedDates: string[];
  onToggle: (date: string) => void;
  /** Group slots by date (the exact date string toggled). */
  getSlotForDate?: (date: string) => AvailableSlotItem | undefined;
}

/**
 * A rounded, color-coded schedule grid. Green = available, yellow = few seats,
 * red = full, gray = unavailable. Dates with no slot render as disabled chips.
 */
export function WeeklySchedule({
  slots,
  selectedDates,
  onToggle,
  getSlotForDate,
}: WeeklyScheduleProps): ReactNode {
  const slotByDate = new Map<string, AvailableSlotItem>();
  for (const slot of slots) {
    if (!slotByDate.has(slot.date)) slotByDate.set(slot.date, slot);
  }

  const sorted = Array.from(slotByDate.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map(([date, slot]) => {
        const tone = slotTone(slot);
        const disabled = tone === "full";
        const selected = selectedDates.includes(date);
        const shownSlot = getSlotForDate ? getSlotForDate(date) ?? slot : slot;
        const dayName = new Date(date + "T12:00:00").toLocaleDateString("ar-EG-u-nu-latn", {
          weekday: "long",
          day: "numeric",
        });

        return (
          <button
            key={date}
            type="button"
            disabled={disabled}
            onClick={() => { onToggle(date); }}
            className={cn(
              "relative flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-start transition-all duration-200",
              toneClasses[tone],
              !disabled && "hover:scale-[1.03] active:scale-[0.98]",
              selected && !disabled && "ring-2 ring-primary-400 shadow-[0_0_18px_rgba(6,182,212,0.35)]",
            )}
          >
            {selected && !disabled && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            )}
            <span className="text-sm font-bold">{dayName}</span>
            <span className="text-xs opacity-80">{formatTime(shownSlot.startTime)}</span>
            {!disabled && (
              <span className="text-[10px] opacity-70">
                {shownSlot.availableSeats} مقعد
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

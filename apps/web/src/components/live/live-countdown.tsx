"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

interface LiveCountdownProps {
  targetDate: string;
  className?: string;
  onEnd?: () => void;
  compact?: boolean;
}

export function LiveCountdown({
  targetDate,
  className,
  onEnd,
  compact,
}: LiveCountdownProps): ReactNode {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calculateTimeLeft(new Date(targetDate)),
  );

  const update: () => void = useCallback((): void => {
    const next = calculateTimeLeft(new Date(targetDate));
    setTimeLeft(next);
    if (!next) {
      onEnd?.();
    }
  }, [targetDate, onEnd]);

  useEffect(() => {
    const timer = setInterval(update, 1000);
    return (): void => { clearInterval(timer); };
  }, [update]);

  if (!timeLeft) return null;

  const parts = compact
    ? [
        { value: timeLeft.hours, label: "س" },
        { value: timeLeft.minutes, label: "د" },
        { value: timeLeft.seconds, label: "ث" },
      ]
    : [
        { value: timeLeft.days, label: "يوم" },
        { value: timeLeft.hours, label: "ساعة" },
        { value: timeLeft.minutes, label: "دقيقة" },
        { value: timeLeft.seconds, label: "ثانية" },
      ];

  return (
    <div
      className={cn(
        "flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-neutral-700 dark:text-neutral-300",
        className,
      )}
    >
      {parts.map((part, i) => (
        <span key={part.label} className="flex items-center gap-0.5">
          <span>{String(part.value).padStart(2, "0")}</span>
          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
            {part.label}
          </span>
          {i < parts.length - 1 && (
            <span className="mx-0.5 text-neutral-400">:</span>
          )}
        </span>
      ))}
    </div>
  );
}

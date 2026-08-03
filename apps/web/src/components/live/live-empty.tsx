"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LiveEmptyProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "cyan" | "amber" | "violet" | "rose";
  className?: string;
}

const toneRing: Record<NonNullable<LiveEmptyProps["tone"]>, string> = {
  cyan: "bg-primary-500/10 text-primary-500 dark:bg-primary-400/10 dark:text-primary-300",
  amber: "bg-warning-500/10 text-warning-500 dark:bg-warning-400/10 dark:text-warning-300",
  violet: "bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-300",
  rose: "bg-rose-500/10 text-rose-500 dark:bg-rose-400/10 dark:text-rose-300",
};

/** Custom illustrated empty state for each live-classes surface. */
export function LiveEmpty({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "cyan",
  className,
}: LiveEmptyProps): ReactNode {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-neutral-200 bg-white/60 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]",
        className,
      )}
    >
      <div className="relative">
        <span className="absolute inset-0 -z-10 rounded-full bg-current opacity-10 blur-2xl" />
        <div className={cn("flex h-24 w-24 items-center justify-center rounded-[2rem]", toneRing[tone])}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button size="lg" onClick={onAction} className="rounded-2xl">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

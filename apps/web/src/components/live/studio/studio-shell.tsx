"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Tone =
  | "cyan"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "primary";

const TONE_GRADIENT: Record<Tone, string> = {
  cyan: "from-cyan-400/70 via-cyan-500/20",
  violet: "from-violet-400/70 via-violet-500/20",
  emerald: "from-emerald-400/70 via-emerald-500/20",
  amber: "from-amber-400/70 via-amber-500/20",
  rose: "from-rose-400/70 via-rose-500/20",
  primary: "from-primary-400/70 via-primary-500/20",
};

interface GlassSectionProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  children: ReactNode;
}

/**
 * GlassSection — premium frosted-glass container with a soft gradient border.
 * Used as the building block for the live management centers.
 */
export function GlassSection({
  tone = "cyan",
  className,
  children,
  ...props
}: GlassSectionProps): ReactNode {
  return (
    <section
      className={cn(
        "rounded-3xl bg-gradient-to-br to-transparent p-px",
        TONE_GRADIENT[tone],
        className,
      )}
      {...props}
    >
      <div className="rounded-[calc(1.5rem-1px)] bg-[var(--ui-card-bg)] backdrop-blur-xl dark:bg-[var(--ui-card-bg-dark)]">
        <div className="flex flex-col gap-4 p-5">{children}</div>
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: Tone;
}

export function SectionHeader({
  icon,
  title,
  description,
  action,
  tone = "cyan",
}: SectionHeaderProps): ReactNode {
  const toneText: Record<Tone, string> = {
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    primary: "bg-primary-500/10 text-primary-600 dark:text-primary-300",
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              toneText[tone],
            )}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "cyan",
}: MetricCardProps): ReactNode {
  const toneText: Record<Tone, string> = {
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    primary: "bg-primary-500/10 text-primary-600 dark:text-primary-300",
  };

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white/50 p-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        {icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", toneText[tone])}>
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}

interface StatusDotProps {
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
  label: string;
  pulse?: boolean;
}

export function StatusDot({
  tone = "neutral",
  label,
  pulse,
}: StatusDotProps): ReactNode {
  const dot: Record<NonNullable<StatusDotProps["tone"]>, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-cyan-500",
    neutral: "bg-neutral-400",
  };

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200/80 dark:bg-white/[0.04] dark:text-neutral-300 dark:ring-white/10">
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              dot[tone],
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dot[tone])} />
      </span>
      {label}
    </span>
  );
}

interface MiniBarDatum {
  label: string;
  value: number;
}

/**
 * MiniBarChart — lightweight CSS-only vertical bar chart (no chart library).
 */
export function MiniBarChart({
  data,
  className,
}: {
  data: MiniBarDatum[];
  className?: string;
}): ReactNode {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("flex items-end gap-2", className)}>
      {data.map((d) => {
        const pct = Math.max(4, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
              {String(d.value)}
            </span>
            <div className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-primary-500/30 to-cyan-400 transition-all duration-700 dark:from-primary-600/40 dark:to-cyan-300"
                style={{ height: `${String(pct)}%` }}
              />
            </div>
            <span className="truncate text-[10px] text-neutral-500 dark:text-neutral-500">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  tone?: "cyan" | "violet" | "emerald" | "amber" | "rose";
}

export function ProgressBar({
  label,
  value,
  max = 100,
  tone = "cyan",
}: ProgressBarProps): ReactNode {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
    cyan: "from-cyan-500/70 to-cyan-300",
    violet: "from-violet-500/70 to-violet-300",
    emerald: "from-emerald-500/70 to-emerald-300",
    amber: "from-amber-500/70 to-amber-300",
    rose: "from-rose-500/70 to-rose-300",
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-neutral-600 dark:text-neutral-300">
          {label}
        </span>
        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
          {String(Math.round(value))}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full bg-gradient-to-l transition-all duration-700", bar[tone])}
          style={{ width: `${String(pct)}%` }}
        />
      </div>
    </div>
  );
}

export function StudioSkeleton({ rows = 3 }: { rows?: number }): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

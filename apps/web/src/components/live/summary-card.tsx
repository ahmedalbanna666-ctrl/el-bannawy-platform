"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SummaryRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-white/[0.04]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 dark:text-primary-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
        {sub && <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{sub}</p>}
      </div>
    </div>
  );
}

export function SummaryCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)]",
        className,
      )}
    >
      {title && (
        <h3 className="mb-3 text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

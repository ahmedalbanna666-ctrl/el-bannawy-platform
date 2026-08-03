"use client";

import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface ContentBlockProps {
  icon: LucideIcon;
  title: string;
  description: string;
  statusBadge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  expanded?: boolean;
  onToggle?: () => void;
}

export function ContentBlock({
  icon: Icon,
  title,
  description,
  statusBadge,
  actions,
  children,
  className,
  expanded = true,
  onToggle,
}: ContentBlockProps): ReactNode {
  return (
    <Card variant="elevated" padding="none" className={cn("overflow-hidden", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e): void => { if ((e.key === "Enter" || e.key === " ") && onToggle) { e.preventDefault(); onToggle(); } }}
        className="flex w-full items-center gap-3 border-b border-neutral-200 px-5 py-3 text-start dark:border-neutral-700 cursor-pointer"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150",
            expanded
              ? "bg-primary-500/10"
              : "bg-neutral-100 dark:bg-neutral-800",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 transition-colors duration-150",
              expanded ? "text-primary-500" : "text-neutral-400",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
        {statusBadge && <div className="shrink-0">{statusBadge}</div>}
        {actions && <div className="shrink-0">{actions}</div>}
        {onToggle && (
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        )}
      </div>
      {children && (
        <div
          className={cn(
            "grid transition-all duration-200 ease-out",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="p-5">{children}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

export type { ContentBlockProps };

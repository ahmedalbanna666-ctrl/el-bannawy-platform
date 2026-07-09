"use client";

import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ContentBlockProps {
  icon: LucideIcon;
  title: string;
  description: string;
  statusBadge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ContentBlock({
  icon: Icon,
  title,
  description,
  statusBadge,
  actions,
  children,
  className,
}: ContentBlockProps): ReactNode {
  return (
    <Card variant="elevated" padding="none" className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
          <Icon className="h-5 w-5 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
        {statusBadge}
        {actions}
      </div>
      {children && <div className="p-5">{children}</div>}
    </Card>
  );
}

export type { ContentBlockProps };

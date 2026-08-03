"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ProviderState = "active" | "available" | "needs-config" | "coming-soon";

interface ProviderCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  state: ProviderState;
  badges?: { label: string; variant?: "primary" | "success" | "warning" | "danger" | "info" | "secondary" }[];
  footer?: ReactNode;
}

const STATE_STYLES: Record<ProviderState, string> = {
  active:
    "bg-gradient-to-br from-emerald-400/60 to-transparent",
  available:
    "bg-gradient-to-br from-cyan-400/60 via-cyan-500/15 to-transparent",
  "needs-config":
    "bg-gradient-to-br from-amber-400/60 to-transparent",
  "coming-soon":
    "bg-gradient-to-br from-neutral-400/40 to-transparent",
};

const STATE_BADGE: Record<ProviderState, { label: string; variant: "success" | "primary" | "warning" | "secondary" }> = {
  active: { label: "نشط", variant: "success" },
  available: { label: "متاح", variant: "primary" },
  "needs-config": { label: "يحتاج إعداداً", variant: "warning" },
  "coming-soon": { label: "قريباً", variant: "secondary" },
};

export function ProviderCard({
  name,
  description,
  icon,
  state,
  badges = [],
  footer,
}: ProviderCardProps): ReactNode {
  const stateBadge = STATE_BADGE[state];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-3xl bg-gradient-to-br to-transparent p-px",
        STATE_STYLES[state],
      )}
    >
      <div className="flex flex-1 flex-col gap-4 rounded-[calc(1.5rem-1px)] bg-[var(--ui-card-bg)] p-5 backdrop-blur-xl dark:bg-[var(--ui-card-bg-dark)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-neutral-700 shadow-sm ring-1 ring-inset ring-neutral-200/70 dark:bg-white/[0.06] dark:text-neutral-200 dark:ring-white/10">
            {icon}
          </div>
          <Badge variant={stateBadge.variant}>{stateBadge.label}</Badge>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
            {name}
          </h3>
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <Badge key={b.label} variant={b.variant ?? "primary"} className="text-[10px]">
                {b.label}
              </Badge>
            ))}
          </div>
        )}

        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </div>
  );
}

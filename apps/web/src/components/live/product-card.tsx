"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "cyan" | "violet" | "amber" | "emerald" | "rose";

interface ProductCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
  price?: string;
  seats?: string;
  badge?: string;
  tone?: Tone;
  featured?: boolean;
}

const toneStyles: Record<Tone, { glow: string; iconWrap: string; ring: string; chip: string }> = {
  cyan: {
    glow: "from-primary-500/25 to-transparent",
    iconWrap: "bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white",
    ring: "group-hover:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.35)]",
    chip: "bg-primary-500/10 text-primary-600 dark:text-primary-300",
  },
  violet: {
    glow: "from-purple-500/25 to-transparent",
    iconWrap: "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white",
    ring: "group-hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.35)]",
    chip: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  },
  amber: {
    glow: "from-amber-500/25 to-transparent",
    iconWrap: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white",
    ring: "group-hover:shadow-[0_20px_60px_-15px_rgba(245,158,11,0.35)]",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  emerald: {
    glow: "from-emerald-500/25 to-transparent",
    iconWrap: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white",
    ring: "group-hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.35)]",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  rose: {
    glow: "from-rose-500/25 to-transparent",
    iconWrap: "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white",
    ring: "group-hover:shadow-[0_20px_60px_-15px_rgba(244,63,94,0.35)]",
    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
};

/** Large glassmorphism product card — the entry point for each booking flow. */
export function ProductCard({
  icon,
  title,
  description,
  href,
  cta,
  price,
  seats,
  badge,
  tone = "cyan",
  featured,
}: ProductCardProps): ReactNode {
  const t = toneStyles[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-[var(--ui-card-bg-dark)]",
        t.ring,
        featured && "ring-2 ring-primary-400/40",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent", t.glow)} />

      {badge && (
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-1 text-[10px] font-bold text-white shadow-lg shadow-primary-500/25">
          <Sparkles className="h-3 w-3" />
          {badge}
        </span>
      )}

      <div className="relative flex flex-1 flex-col items-start gap-4">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-[1.4rem] transition-all duration-300 group-hover:scale-105",
            t.iconWrap,
          )}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {price && (
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", t.chip)}>{price}</span>
          )}
          {seats && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
              {seats}
            </span>
          )}
        </div>

        <div className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-bold text-primary-600 transition-transform duration-300 group-hover:gap-3 dark:text-primary-300">
          {cta}
          <ArrowLeft className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

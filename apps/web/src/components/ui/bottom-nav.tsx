"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNav({ items, className }: BottomNavProps): ReactNode {
  return (
    <nav
      className={cn(
        "sticky bottom-0 start-0 end-0 z-30 flex h-[calc(64px+env(safe-area-inset-bottom,0px)+4px)] items-stretch justify-around border-t border-white/15 bg-white/40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-950/30 dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] sm:h-[72px]",
        "pb-[calc(env(safe-area-inset-bottom,0px)+4px)]",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.active && item.activeIcon ? item.activeIcon : item.icon;
        const inner = (
          <>
            <div
              className={cn(
                "relative flex items-center justify-center rounded-2xl transition-all duration-200",
                item.active
                  ? "-translate-y-1 bg-purple-500/10 px-4 py-1.5 dark:bg-purple-400/10 sm:-translate-y-1.5 sm:px-4 sm:py-2"
                  : "px-3 py-1.5",
              )}
            >
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -end-1 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-all duration-200 sm:h-6 sm:w-6",
                  item.active
                    ? "text-purple-500"
                    : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300",
                )}
              />
            </div>
            <span
              className={cn(
                "max-w-[64px] truncate text-[10px] leading-none transition-all duration-200 sm:text-xs",
                item.active
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-neutral-400 dark:text-neutral-500",
              )}
            >
              {item.label}
            </span>
          </>
        );

        const className =
          "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1 text-xs font-medium transition-all duration-200 sm:gap-1";

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={item.onClick}
              className={className}
              aria-label={item.label}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button key={item.id} onClick={item.onClick} className={className}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}

export type { BottomNavProps, BottomNavItem };

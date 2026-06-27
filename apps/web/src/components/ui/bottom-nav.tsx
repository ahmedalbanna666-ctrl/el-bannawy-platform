"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  activeIcon?: LucideIcon;
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
        "fixed bottom-0 left-0 right-0 z-30 flex h-[72px] items-center justify-around border-t border-neutral-200 bg-neutral-50/90 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/90 lg:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.active && item.activeIcon ? item.activeIcon : item.icon;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              "relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
              item.active
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-400 dark:text-neutral-500",
            )}
          >
            <Icon className="h-6 w-6" />
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -end-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export type { BottomNavProps, BottomNavItem };

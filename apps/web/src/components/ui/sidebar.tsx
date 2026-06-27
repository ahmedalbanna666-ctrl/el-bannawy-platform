"use client";

import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { ChevronLeft, type LucideIcon } from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  logo?: ReactNode;
  className?: string;
}

export function Sidebar({ items, logo, className }: SidebarProps): ReactNode {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-l border-neutral-200 bg-neutral-50 transition-all duration-200 dark:border-neutral-700 dark:bg-neutral-900 lg:flex",
        collapsed ? "w-[72px]" : "w-[280px]",
        className,
      )}
    >
      <div className="flex h-[72px] items-center justify-between px-5">
        {!collapsed && logo}
        <button
          onClick={() => { setCollapsed(!collapsed); }}
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-start">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export type { SidebarProps, SidebarItem };

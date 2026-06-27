"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { Moon, Sun, Bell, Menu } from "lucide-react";
import { Button } from "./button";
import type { ReactNode } from "react";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  notificationCount?: number;
  className?: string;
}

export function Header({
  title,
  onMenuClick,
  notificationCount,
  className,
}: HeaderProps): ReactNode {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-neutral-200 bg-neutral-50/80 px-4 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/80 lg:px-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && (
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount && notificationCount > 0 ? (
            <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : null}
        </Button>
      </div>
    </header>
  );
}

export type { HeaderProps };

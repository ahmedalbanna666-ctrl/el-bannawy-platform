"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Moon, Sun, Bell, Menu, Flame, Coins, Zap, Trophy, History } from "lucide-react";
import { Button } from "./button";
import { useEffect, useState, type ReactNode } from "react";

interface HeaderStats {
  streak: number;
  coins: number;
  level: number;
  xp: number;
}

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
  className?: string;
}

export function Header({
  onMenuClick,
  onNotificationClick,
  notificationCount,
  className,
}: HeaderProps): ReactNode {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<HeaderStats | null>(null);

  useEffect(() => {
    async function fetchStats(): Promise<void> {
      try {
        const response = await api.get<{
          xp: { total: number; level: number };
          coins: number;
          streak: number;
        }>("/home");
        if (response.data) {
          setStats({
            streak: response.data.streak,
            coins: response.data.coins,
            level: response.data.xp.level,
            xp: response.data.xp.total,
          });
        }
      } catch {
        // Stats unavailable — header works without them
      }
    }
    void fetchStats();
  }, []);

  const fullName = user?.fullName ?? "";
  const firstName = fullName ? fullName.split(" ")[0] : "";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex flex-col border-b border-neutral-200 bg-neutral-50/80 px-4 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/80 lg:px-6",
        className,
      )}
    >
      <div className="flex h-12 items-center justify-between">
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
          {firstName && (
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              مرحباً، {firstName} 👋
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

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="سجل التعلم"
            onClick={(): void => { router.push("/dashboard/history"); }}
          >
            <History className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative" onClick={onNotificationClick}>
            <Bell className="h-5 w-5" />
            {notificationCount && notificationCount > 0 ? (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {stats && (
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Flame className="h-3.5 w-3.5" />
            {stats.streak} Days
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
            <Coins className="h-3.5 w-3.5" />
            {stats.coins}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
            <Zap className="h-3.5 w-3.5" />
            Level {stats.level}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <Trophy className="h-3.5 w-3.5" />
            {stats.xp} XP
          </span>
        </div>
      )}
    </header>
  );
}

export type { HeaderProps };

"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useAuthStore } from "@/lib/auth-store";
import { usePermissions } from "@/lib/use-permissions";
import { useRouter } from "next/navigation";
import { Moon, Sun, Menu, Coins, Zap, Trophy, History, ShoppingCart } from "lucide-react";
import { Button } from "./button";
import { AcademicContextBar } from "./academic-context-bar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { useHomeData } from "@/lib/home-api";
import { type ReactNode } from "react";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  className?: string;
}

export function Header({
  onMenuClick,
  className,
}: HeaderProps): ReactNode {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuthStore();
  const { isStudent } = usePermissions();
  const router = useRouter();
  const { data } = useHomeData(isStudent);

  const fullName = user?.fullName ?? "";
  const firstName = fullName ? fullName.split(" ")[0] : "";
  const stats = data
    ? {
        coins: data.coins,
        level: data.xp.level,
        xp: data.xp.total,
      }
    : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex flex-col border-b border-white/15 bg-white/30 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-950/25 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] lg:px-6",
        "pt-[env(safe-area-inset-top,0px)]",
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
              مرحباً، {firstName}
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

          <NotificationsDropdown />
        </div>
      </div>

      {!isStudent && <AcademicContextBar />}

      {stats && isStudent && (
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
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
          <button
            type="button"
            onClick={(): void => { router.push("/dashboard/shop"); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            aria-label="المتجر"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            المتجر
          </button>
        </div>
      )}
    </header>
  );
}

export type { HeaderProps };

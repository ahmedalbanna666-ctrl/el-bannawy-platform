"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, CheckCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${String(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${String(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${String(days)} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

export function NotificationsDropdown(): ReactNode {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async (): Promise<void> => {
    setError(false);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get<NotificationItem[]>("/notifications?limit=5"),
        api.get<{ count: number }>("/notifications/unread-count"),
      ]);
      if (listRes.data) setItems(listRes.data);
      if (countRes.data) setUnreadCount(countRes.data.count);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }

    function handlePointerDown(e: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, refresh]);

  const handleRead = useCallback(
    async (item: NotificationItem): Promise<void> => {
      if (item.isRead) return;
      const previous = items;
      setItems((current) =>
        current?.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)) ?? null,
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await api.patch(`/notifications/${item.id}/read`);
      } catch {
        setItems(previous);
        setUnreadCount((count) => Math.max(0, count + 1));
      }
    },
    [items],
  );

  const handleMarkAllRead = useCallback(async (): Promise<void> => {
    const previous = items;
    setItems((current) => current?.map((n) => ({ ...n, isRead: true })) ?? null);
    setUnreadCount(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      setItems(previous);
      void refresh();
    }
  }, [items, refresh]);

  const handleViewAll = useCallback((): void => {
    setOpen(false);
    router.push("/dashboard/notifications");
  }, [router]);

  const unreadItems = items?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="الإشعارات"
        aria-haspopup="true"
        aria-expanded={open}
        className="relative"
        onClick={(): void => { setOpen((current) => !current); }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open && (
        <div className="absolute end-0 top-full z-[var(--z-dropdown)] mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-surface-elevated shadow-xl dark:border-neutral-700">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              الإشعارات
              {unreadCount > 0 ? (
                <span className="ms-2 rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-bold text-primary-600 dark:text-primary-400">
                  {unreadCount}
                </span>
              ) : null}
            </h2>
            {unreadItems > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-xs"
                onClick={(): void => { void handleMarkAllRead(); }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                تعليم الكل كمقروء
              </Button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {error ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <BellOff className="h-8 w-8 text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  تعذر تحميل الإشعارات
                </p>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={(): void => { void refresh(); }}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : items === null ? (
              <div className="space-y-3 px-4 py-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <BellOff className="h-8 w-8 text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  لا توجد إشعارات
                </p>
              </div>
            ) : (
              <ul role="list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={(): void => { void handleRead(item); }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60",
                        item.isRead ? "opacity-60" : "bg-primary-500/[0.06]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 flex h-2 w-2 shrink-0 rounded-full",
                          item.priority === "HIGH"
                            ? "bg-danger-500"
                            : "bg-primary-500",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-neutral-400">
                            {timeAgo(item.createdAt)}
                          </span>
                        </span>
                        {item.message ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {item.message}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-neutral-200 p-2 dark:border-neutral-700">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm"
              onClick={handleViewAll}
            >
              <ArrowLeft className="h-4 w-4" />
              عرض كل الإشعارات
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

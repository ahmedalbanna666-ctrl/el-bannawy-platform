"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Trash2, BellOff, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function NotificationsPage(): ReactNode {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async (f: string, p: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f !== "all") params.set("filter", f);
      if (p > 1) params.set("page", String(p));
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get<Notification[]>(`/notifications${q}`);
      if (res.data) {
        setNotifications(res.data);
      }
      if (res.meta) {
        setMeta(res.meta as PaginationMeta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications(filter, page);
  }, [filter, page, fetchNotifications]);

  const markAllRead = async (): Promise<void> => {
    try {
      await api.patch("/notifications/read-all");
      void fetchNotifications(filter, page);
    } catch {
      setError("فشل تحديد الكل كمقروء");
    }
  };

  const markRead = async (id: string): Promise<void> => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      setError("فشل تحديث الإشعار");
    }
  };

  const deleteNotification = async (id: string): Promise<void> => {
    const prev = notifications;
    setNotifications((prevState) => prevState.filter((n) => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(prev);
      setError("فشل حذف الإشعار");
    }
  };

  const handleFilterChange = (f: string): void => {
    setFilter(f);
    setPage(1);
  };

  if (loading) return <NotificationsSkeleton />;
  if (error) return <ErrorState title="فشل تحميل الإشعارات" description={error} />;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">الإشعارات</h1>
            {meta.total > 0 && (
              <p className="mt-1 text-sm text-neutral-500">{meta.total} إشعارات</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications/preferences"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <Settings className="h-4 w-4" />
              التفضيلات
            </Link>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={(): void => { void markAllRead(); }}>
                <CheckCheck className="ml-2 h-4 w-4" />
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {(["all", "unread", "read"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "primary" : "outline"}
              size="xs"
              onClick={(): void => { handleFilterChange(f); }}
            >
              {f === "all" ? "الكل" : f === "unread" ? "غير مقروءة" : "مقروءة"}
            </Button>
          ))}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="لا توجد إشعارات"
          description="أنت على اطلاع بكل شيء!"
          icon={<BellOff className="h-16 w-16" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                variant="outline"
                padding="sm"
                className={n.isRead ? "opacity-60" : "border-primary-500/30"}
              >
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.priority === "HIGH" ? "bg-danger-500/10" : "bg-primary-500/10"}`}>
                      <Bell className={`h-4 w-4 ${n.priority === "HIGH" ? "text-danger-500" : "text-primary-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${n.isRead ? "text-neutral-500" : "text-neutral-900 dark:text-neutral-100"}`}>
                          {n.title}
                        </p>
                        <Badge variant={n.isRead ? "secondary" : "primary"}>{n.isRead ? "مقروءة" : "جديد"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {!n.isRead && (
                        <button
                          onClick={(): void => { void markRead(n.id); }}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          aria-label="تحديد كمقروء"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(): void => { void deleteNotification(n.id); }}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={(): void => { setPage((p) => Math.max(1, p - 1)); }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-neutral-500">
                الصفحة {meta.page} من {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={(): void => { setPage((p) => p + 1); }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-64" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

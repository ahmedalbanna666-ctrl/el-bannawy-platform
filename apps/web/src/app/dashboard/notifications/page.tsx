"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Trash2, BellOff } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage(): ReactNode {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchNotifications = async (f?: string): Promise<void> => {
    try {
      const filterParam = f !== "all" ? f : "";
      const q = filterParam ? `?filter=${filterParam}` : "";
      const res = await api.get<Notification[]>(`/notifications${q}`);
      if (res.data) setNotifications(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications(filter);
  }, [filter]);

  const markAllRead = async (): Promise<void> => {
    await api.patch("/notifications/read-all");
    void fetchNotifications(filter);
  };

  const markRead = async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
    void fetchNotifications(filter);
  };

  const deleteNotification = async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) return <NotificationsSkeleton />;
  if (error) return <ErrorState title="Failed to load notifications" description={error} />;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Notifications</h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-neutral-500">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={(): void => { void markAllRead(); }}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {["all", "unread", "read"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "primary" : "outline"}
              size="xs"
              onClick={(): void => { setFilter(f); setLoading(true); }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You're all caught up!"
          icon={<BellOff className="h-16 w-16" />}
        />
      ) : (
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
                      <Badge variant={n.isRead ? "secondary" : "primary"}>{n.isRead ? "Read" : "New"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!n.isRead && (
                      <button
                        onClick={(): void => { void markRead(n.id); }}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        aria-label="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(): void => { void deleteNotification(n.id); }}
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

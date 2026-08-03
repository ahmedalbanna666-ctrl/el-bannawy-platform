"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { getDashboardModules } from "@/lib/nav-registry";
import { useLiveAnalyticsOverview } from "@/lib/live-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Video, Users, Activity, Star, Bell } from "lucide-react";

function useLiveWindow(): { from: string; to: string } {
  return useMemo(() => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().split("T")[0], to };
  }, []);
}

function formatTodayArabic(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function LiveAnalyticsWidget(): ReactNode {
  const router = useRouter();
  const { from, to } = useLiveWindow();
  const { data, isLoading, isError } = useLiveAnalyticsOverview(from, to);

  return (
    <Card variant="gradient" padding="none" className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-white" />
            <h2 className="text-sm font-bold text-white">الحصص المباشرة</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={(): void => { router.push("/dashboard/live"); }}
          >
            إدارة الحصص
          </Button>
        </div>

        {isLoading && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-white/15" />
            ))}
          </div>
        )}

        {isError && (
          <p className="mt-4 text-sm text-white/60">
            تعذر تحميل مؤشرات الحصص المباشرة.
          </p>
        )}

        {data && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LiveMetric icon={<Video className="h-4 w-4" />} label="حصص مباشرة الآن" value={data.liveNowSessions} />
            <LiveMetric icon={<Users className="h-4 w-4" />} label="إجمالي الحجوزات" value={data.totalBookings} />
            <LiveMetric icon={<Star className="h-4 w-4" />} label="اشتراكات نشطة" value={data.activeSubscriptions} />
            <LiveMetric icon={<Activity className="h-4 w-4" />} label="نسبة الحضور" value={`${String(data.attendanceRate)}%`} />
            <LiveMetric icon={<Bell className="h-4 w-4" />} label="قائمة الانتظار" value={data.waitlistEntries} />
            <LiveMetric icon={<Video className="h-4 w-4" />} label="حصص مكتملة" value={data.completedSessions} />
            <LiveMetric icon={<Users className="h-4 w-4" />} label="طلاب" value={data.totalStudents} />
            <LiveMetric icon={<Activity className="h-4 w-4" />} label="استغلال السعة" value={`${String(data.capacityUtilization)}%`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/10 p-3">
      <div className="flex items-center gap-1.5 text-white/60">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold text-white">{value}</span>
    </div>
  );
}

export function AdminDashboard(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const fullName = useAuthStore((s) => s.user?.fullName ?? "");
  const role = useAuthStore((s) => s.user?.role);
  const firstName = fullName.split(" ")[0];

  const modules = getDashboardModules(can, role);
  const primaryModules = modules.filter((m) => m.category === "content");
  const moreModules = modules.filter((m) => m.category !== "content");

  const today = useMemo(() => formatTodayArabic(), []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          مرحباً، {firstName || "مدير"}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          لوحة تحكم النظام الأساسي — إدارة المحتوى التعليمي
        </p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          {today}
        </p>
      </div>

      <LiveAnalyticsWidget />

      {primaryModules.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">
            وحدات الإدارة الأساسية
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {primaryModules.map((m) => (
              <Card
                key={m.id}
                variant="elevated"
                padding="none"
                className="relative cursor-pointer transition-shadow duration-300 hover:scale-[1.005] hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.12)] dark:hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.18)]"
                onClick={(): void => { router.push(m.route); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e): void => { if (e.key === "Enter") router.push(m.route); }}
              >
                <div className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 ring-1 ring-primary-500/10">
                    <m.icon className="h-5 w-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {m.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {m.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <ChevronLeft className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {moreModules.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-neutral-500 dark:text-neutral-400">
            المزيد من وحدات الإدارة
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {moreModules.map((m) => (
              <Card
                key={m.id}
                variant="elevated"
                padding="none"
                className="relative cursor-pointer transition-shadow duration-300 hover:scale-[1.005] hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.12)] dark:hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.18)]"
                onClick={(): void => { router.push(m.route); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e): void => { if (e.key === "Enter") router.push(m.route); }}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50">
                    <m.icon className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {m.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {m.description}
                    </p>
                  </div>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

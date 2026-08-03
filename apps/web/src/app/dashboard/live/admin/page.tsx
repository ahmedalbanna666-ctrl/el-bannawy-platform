"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ServerCog,
  Video,
  Bot,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Settings2,
  Activity,
  Database,
  Globe2,
  CalendarClock,
  Megaphone,
  Radio,
  Building2,
  Wrench,
  GraduationCap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import {
  GlassSection,
  SectionHeader,
  MetricCard,
  StatusDot,
  MiniBarChart,
  ProgressBar,
  StudioSkeleton,
} from "@/components/live/studio/studio-shell";
import { ProviderCard } from "@/components/live/studio/provider-card";
import { usePermissions } from "@/lib/use-permissions";
import {
  useLiveAdminStatus,
  useLiveAnalyticsOverview,
  useServerHealth,
  useLiveSessions,
  formatUptime,
  type LiveSessionItem,
} from "@/lib/live-api";

const PROVIDER_LABELS: Record<string, string | undefined> = {
  ZOOM_SDK: "Zoom SDK",
  EXTERNAL_URL: "رابط خارجي",
};

const RULE_KINDS: { key: string; label: string }[] = [
  { key: "GROUP", label: "حصص المجموعة" },
  { key: "PRIVATE_MONTHLY", label: "اشتراك فردي شهري" },
  { key: "ONE_TIME", label: "حصة منفردة" },
  { key: "FREE", label: "فعالية مجانية" },
];

function dateRangeDays(days: number): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: now.toISOString().split("T")[0],
  };
}

function statusMeta(session: LiveSessionItem): { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" } {
  switch (session.status) {
    case "LIVE": return { label: "مباشر", variant: "danger" };
    case "PUBLISHED":
    case "SCHEDULED":
    case "OPEN": return { label: "مجدول", variant: "info" };
    case "COMPLETED": return { label: "مكتمل", variant: "success" };
    case "CANCELLED": return { label: "ملغي", variant: "secondary" };
    default: return { label: session.status, variant: "secondary" };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${String(mins)} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${String(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${String(days)} يوم`;
}

export default function LiveAdminInfrastructurePage(): ReactNode {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useLiveAdminStatus();
  const range = useMemo(() => dateRangeDays(30), []);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useLiveAnalyticsOverview(range.dateFrom, range.dateTo);
  const { data: health, isLoading: healthLoading } = useServerHealth(isAdmin);
  const {
    data: sessions,
    isLoading: sessionsLoading,
  } = useLiveSessions();

  const recentActivity = useMemo(
    () =>
      (sessions ?? [])
        .slice()
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 8),
    [sessions],
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStatus(), refetchAnalytics()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6 pb-4">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <ShieldCheck className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            صلاحية محدودة
          </h1>
          <p className="max-w-sm text-sm text-neutral-500">
            مركز البنية التحتية للحصص المباشرة متاح لمسؤولي المنصة فقط.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={(): void => { router.push("/dashboard/live"); }}
          >
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const providerId = status?.meetingProvider.id;
  const providerConfigured = status?.meetingProvider.configured ?? false;
  const defaultProviderLabel = PROVIDER_LABELS[providerId ?? ""] ?? providerId ?? "—";

  const chartData = [
    { label: "حضور", value: analytics?.attendanceRate ?? 0 },
    { label: "سعة", value: analytics?.capacityUtilization ?? 0 },
    { label: "توصيل", value: status?.notifications.analytics.deliveryRate ?? 0 },
    { label: "قراءة", value: status?.notifications.analytics.readRate ?? 0 },
    { label: "ذاكرة", value: health?.memory.percent ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(): void => { router.push("/dashboard"); }}
            aria-label="العودة للوحة التحكم"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              البنية التحتية للحصص المباشرة
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              مراقبة المزوّدين والسياسات وصحة الخادم — مركز إدارة المنصة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            onClick={(): void => { void handleRefresh(); }}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            تحديث
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(): void => { router.push("/dashboard/live/studio"); }}
          >
            أدوات التدريس
          </Button>
        </div>
      </div>

      {/* System Status */}
      <GlassSection tone="cyan">
        <SectionHeader
          icon={<ServerCog className="h-5 w-5" />}
          title="حالة النظام"
          description="ملخص تشغيلي لمكونات الحصص المباشرة"
        />
        {statusLoading ? (
          <StudioSkeleton rows={2} />
        ) : statusError ? (
          <ErrorState title="تعذر تحميل الحالة" onRetry={(): void => { void refetchStatus(); }} />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-500">مزوّد الاجتماعات (Zoom)</p>
                <div className="mt-1">
                  <StatusDot
                    tone={providerConfigured ? "success" : "warning"}
                    label={providerConfigured ? "جاهز" : "إعداد غير مكتمل"}
                    pulse={providerConfigured}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Radio className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-500">منصة El-Bannawy Live</p>
                <div className="mt-1">
                  <StatusDot
                    tone={!analyticsLoading ? "success" : "neutral"}
                    label={!analyticsLoading ? "تعمل" : "جارٍ الفحص"}
                    pulse
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-500">المهام الخلفية (BullMQ)</p>
                <div className="mt-1">
                  <StatusDot tone="info" label="مفعّلة" />
                </div>
              </div>
            </div>
          </div>
        )}

        {!analyticsLoading && analytics && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="مباشر الآن" value={analytics.liveNowSessions} icon={<Radio className="h-4 w-4" />} tone="rose" />
            <MetricCard label="الحصص المنشورة" value={analytics.publishedSessions} icon={<Video className="h-4 w-4" />} tone="cyan" />
            <MetricCard label="الحصص القادمة" value={analytics.upcomingSessions} icon={<CalendarClock className="h-4 w-4" />} tone="violet" />
            <MetricCard label="إجمالي الحجوزات" value={analytics.totalBookings} icon={<Users className="h-4 w-4" />} tone="emerald" />
          </div>
        )}
      </GlassSection>

      {/* Server Health */}
      <GlassSection tone="emerald">
        <SectionHeader
          icon={<Activity className="h-5 w-5" />}
          title="صحة خادم الحصص المباشرة"
          description="أداء الخادم وقاعدة البيانات وقنوات الإشعارات"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            {healthLoading ? (
              <StudioSkeleton rows={2} />
            ) : health ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusDot
                    tone={health.status === "healthy" ? "success" : "warning"}
                    label={health.status === "healthy" ? "سليم" : "متعثر"}
                    pulse={health.status === "healthy"}
                  />
                  <Badge variant="secondary" className="text-[10px]">
                    Uptime {formatUptime(health.uptime)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]">
                  <Database className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    قاعدة البيانات: {health.database === "ok" ? "متاحة" : "تعذر الوصول"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]">
                  <Globe2 className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    زمن الاستجابة: {String(health.responseTime)}ms
                  </span>
                </div>
                <ProgressBar
                  label="استخدام الذاكرة"
                  value={health.memory.percent}
                  tone={health.memory.percent > 85 ? "rose" : health.memory.percent > 65 ? "amber" : "emerald"}
                />
              </>
            ) : (
              <ErrorState title="تعذر تحميل صحة الخادم" />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-neutral-500">
              مؤشرات الأداء (آخر 30 يوم)
            </p>
            <MiniBarChart data={chartData} className="px-1" />
            <div className="flex flex-col gap-2.5">
              <ProgressBar label="نسبة الحضور" value={analytics?.attendanceRate ?? 0} tone="cyan" />
              <ProgressBar label="استغلال السعة" value={analytics?.capacityUtilization ?? 0} tone="violet" />
              <ProgressBar label="توصيل الإشعارات" value={status?.notifications.analytics.deliveryRate ?? 0} tone="emerald" />
            </div>
          </div>
        </div>
      </GlassSection>

      {/* Meeting Providers */}
      <GlassSection tone="violet">
        <SectionHeader
          icon={<Video className="h-5 w-5" />}
          title="مزوّدات الاجتماعات"
          description="المزوّد النشط والبدائل المتاحة للتكامل مستقبلاً"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProviderCard
            name="Zoom SDK"
            description="تكامل مباشر عبر Zoom Video SDK مع توليد تواقيع جلسات آمنة."
            icon={<Video className="h-6 w-6" />}
            state={providerConfigured ? "active" : "needs-config"}
            badges={
              status
                ? [
                    ...(status.meetingProvider.restConfigured
                      ? [{ label: "REST مفعّل", variant: "success" as const }]
                      : [{ label: "REST غير مفعّل", variant: "warning" as const }]),
                    ...(status.meetingProvider.sdkKeyConfigured
                      ? [{ label: "SDK Key مفعّل", variant: "success" as const }]
                      : [{ label: "SDK Key غير مفعّل", variant: "warning" as const }]),
                  ]
                : []
            }
          />
          <ProviderCard
            name="رابط خارجي"
            description="حلول يسمح باستخدام روابط اجتماعات خارجية مباشرة على الحصص."
            icon={<Globe2 className="h-6 w-6" />}
            state="available"
            badges={[{ label: "بدون إعداد", variant: "primary" }]}
          />
          <ProviderCard
            name="Google Meet"
            description="دمج اجتماعات Google Meet داخل منصة الحصص المباشرة."
            icon={<Video className="h-6 w-6" />}
            state="coming-soon"
          />
          <ProviderCard
            name="Microsoft Teams"
            description="دمج اجتماعات Microsoft Teams للمؤسسات والفرق الكبيرة."
            icon={<Video className="h-6 w-6" />}
            state="coming-soon"
          />
        </div>
      </GlassSection>

      {/* Default Provider + Rules */}
      <GlassSection tone="primary">
        <SectionHeader
          icon={<Wrench className="h-5 w-5" />}
          title="المزوّد الافتراضي وقواعد التوجيه"
          description="يُحتسب المزوّد تلقائياً حسب نوع الحصة من محرك السياسات"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-300">
                  <ServerCog className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">المزوّد الافتراضي الحالي</p>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                    {defaultProviderLabel}
                  </p>
                </div>
              </div>
              <StatusDot tone={providerConfigured ? "success" : "warning"} label={providerConfigured ? "مفعل" : "غير مكتمل"} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-neutral-500">
              قواعد تلقائية لكل نوع حصة
            </p>
            {RULE_KINDS.map((rule) => (
              <div
                key={rule.key}
                className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]"
              >
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                  {rule.label}
                </span>
                <Badge variant="primary" className="text-[10px]">
                  {defaultProviderLabel}
                </Badge>
              </div>
            ))}
            <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
              قواعد التجاوز اليدوي لكل معلم ستُتاح في مرحلة لاحقة دون تغيير في الواجهة الحالية.
            </p>
          </div>
        </div>
      </GlassSection>

      {/* Global Settings */}
      <GlassSection tone="amber">
        <SectionHeader
          icon={<Settings2 className="h-5 w-5" />}
          title="الإعدادات العامة والسياسات"
          description="سياسات الاستهلاك والإلغاء والاسترداد والحضور"
        />
        {statusLoading ? (
          <StudioSkeleton rows={2} />
        ) : status ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <PolicyRow
                label="توقيت استهلاك الحصة"
                value={status.policies.sessionConsumptionTiming}
              />
              <PolicyRow
                label="مهلة الإلغاء"
                value={`${String(status.policies.cancellationRefundPolicy.cutoffHours)} ساعة`}
              />
              <PolicyRow
                label="الاسترداد قبل المهلة"
                value={status.policies.cancellationRefundPolicy.beforeCutoff}
              />
              <PolicyRow
                label="الاسترداد بعد المهلة"
                value={status.policies.cancellationRefundPolicy.afterCutoff}
              />
              <PolicyRow
                label="الحد الأدنى للحضور"
                value={`${String(status.policies.attendancePolicy.minCompletedMinutes)} دقيقة`}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    الإشعارات
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="مرسلة" value={String(status.notifications.analytics.totalSent)} />
                  <MiniStat label="توصيل" value={`${String(Math.round(status.notifications.analytics.deliveryRate))}%`} />
                  <MiniStat label="فشل" value={String(status.notifications.analytics.failedCount)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat label="قوالب الإشعارات" value={String(status.notifications.templatesCount)} />
                <MiniStat label="إعدادات الإرسال" value={String(status.notifications.configsCount)} />
              </div>
            </div>
          </div>
        ) : null}
      </GlassSection>

      {/* Recent activity */}
      <GlassSection tone="rose">
        <SectionHeader
          icon={<Activity className="h-5 w-5" />}
          title="آخر نشاط الحصص"
          description="أحدث التغييرات على الحصص المباشرة"
        />
        {sessionsLoading ? (
          <StudioSkeleton rows={3} />
        ) : recentActivity.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-4 text-center text-xs text-neutral-500 dark:bg-white/[0.04]">
            لا توجد حصص بعد
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentActivity.map((session) => {
              const meta = statusMeta(session);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        {session.title}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {timeAgo(session.updatedAt)} · {session.teacher.fullName}
                      </p>
                    </div>
                  </div>
                  <Badge variant={meta.variant} className="shrink-0 text-[10px]">
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </GlassSection>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.04]">
      <span className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        <Building2 className="h-3.5 w-3.5 text-amber-500" />
        {label}
      </span>
      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        {value}
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/70 py-2 dark:bg-white/[0.03]">
      <span className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
        {value}
      </span>
      <span className="text-[10px] text-neutral-500">{label}</span>
    </div>
  );
}

"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  LiveSessionCard,
  LiveSessionCardSkeleton,
} from "@/components/live/live-session-card";
import {
  useLiveSubscriptions,
  useMyBookings,
  useLiveSessions,
  useBookSession,
  usePublishSession,
  useUnpublishSession,
  deriveSessionState,
  type LiveSubscriptionItem,
  type LiveSessionItem,
} from "@/lib/live-api";
import { useAuthStore } from "@/lib/auth-store";
import { usePermissions } from "@/lib/use-permissions";
import {
  Users,
  User,
  Calendar,
  Zap,
  Star,
  Play,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Video,
  Settings2,
} from "lucide-react";

function SubscriptionHero({
  subscriptions,
  isLoading,
}: {
  subscriptions: LiveSubscriptionItem[];
  isLoading: boolean;
}): ReactNode {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
        {[1, 2].map((i) => (
          <Card key={i} variant="gradient" padding="none" className="min-w-[280px] flex-1 snap-center overflow-hidden">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-4 w-24 rounded bg-white/20" />
                <div className="h-5 w-32 rounded bg-white/20" />
                <div className="h-16 w-full rounded-xl bg-white/10" />
                <div className="h-2 w-full rounded-full bg-white/15" />
                <div className="h-10 w-full rounded-xl bg-white/20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card variant="gradient" padding="none" className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">لا يوجد اشتراك نشط</h2>
              <p className="mt-1 text-sm text-white/70">
                اشترك الآن للاستفادة من الحصص المباشرة
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="bg-white text-primary-600 hover:bg-white/90"
            >
              اشترك الآن
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
      {subscriptions.map((sub) => {
        const isPrivate = sub.planType === "PRIVATE_MONTHLY";
        const remaining = sub.sessionsTotal - sub.sessionsUsed;
        const progressPct =
          sub.sessionsTotal > 0
            ? Math.round((sub.sessionsUsed / sub.sessionsTotal) * 100)
            : 0;

        return (
          <Card
            key={sub.id}
            variant="gradient"
            padding="none"
            className="min-w-[280px] flex-1 snap-center overflow-hidden"
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isPrivate ? (
                      <>
                        <User className="h-4 w-4 text-white/70" />
                        <h2 className="text-sm font-bold text-white">
                          اشتراك فردي
                        </h2>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 text-white/70" />
                        <h2 className="text-sm font-bold text-white">
                          اشتراك مجموعة
                        </h2>
                      </>
                    )}
                  </div>
                  <Badge className="bg-white/20 text-white text-[10px]">
                    نشط
                  </Badge>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-white/60">المعلم</p>
                  <p className="text-base font-semibold text-white">
                    {sub.teacher.name}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">
                      {String(remaining)} / {String(sub.sessionsTotal)} حصص متبقية
                    </span>
                    <span className="text-white/50">{String(progressPct)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-white/60 transition-all"
                      style={{ width: `${String(progressPct)}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  className="mt-1 bg-white text-primary-600 hover:bg-white/90"
                >
                  <Play className="h-4 w-4" />
                  احجز حصة
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ServiceCards(): ReactNode {
  const services = [
    {
      id: "private-monthly",
      icon: <User className="h-6 w-6" />,
      title: "اشتراك فردي شهري",
      description: "موعد ثابت أسبوعياً مع المعلم.",
      benefits: ["اهتمام كامل", "خطة مخصصة", "مواعيد ثابتة"],
      badge: "الأكثر طلباً",
      href: "/dashboard/live/book",
      featured: true,
      buttonLabel: "اشترك الآن",
    },
    {
      id: "group-monthly",
      icon: <Users className="h-6 w-6" />,
      title: "اشتراك مجموعة",
      description: "انضم إلى مجموعة ثابتة.",
      benefits: ["سعر أقل", "تفاعل جماعي", "مواعيد ثابتة"],
      href: "/dashboard/live/book",
      featured: false,
      buttonLabel: "اختر الخطة",
    },
    {
      id: "one-time",
      icon: <Zap className="h-6 w-6" />,
      title: "احجز حصة فردية",
      description: "احجز حصة واحدة حسب المواعيد المتاحة.",
      benefits: ["اختيار اليوم", "اختيار الوقت", "مرونة كاملة"],
      href: "/dashboard/live/book",
      featured: false,
      buttonLabel: "احجز الآن",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {services.map((service) => (
        <Card
          key={service.id}
          variant={service.featured ? "elevated" : "outline"}
          padding="none"
          className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
            service.featured ? "ring-1 ring-primary-500/30 shadow-primary-500/5" : ""
          }`}
        >
          {service.badge && (
            <div className="absolute left-4 top-4">
              <Badge variant="primary" className="text-[10px] shadow-sm">
                <Sparkles className="mr-1 h-3 w-3" />
                {service.badge}
              </Badge>
            </div>
          )}

          <CardContent className="p-5">
            <div className="flex flex-col items-center gap-3 pt-4 text-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                  service.featured
                    ? "bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white"
                    : "bg-neutral-100 text-neutral-500 group-hover:bg-primary-500/10 group-hover:text-primary-500 dark:bg-neutral-800"
                }`}
              >
                {service.icon}
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {service.title}
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {service.description}
                </p>
              </div>

              <ul className="flex flex-col gap-1 w-full">
                {service.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-2 text-xs text-neutral-500"
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-success-500" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <Link href={service.href} className="w-full">
                <Button
                  variant={service.featured ? "primary" : "outline"}
                  size="sm"
                  fullWidth
                  className="mt-1"
                >
                  {service.buttonLabel}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StudentView(): ReactNode {
  const router = useRouter();
  const {
    data: subscriptions,
    isLoading: subsLoading,
  } = useLiveSubscriptions();
  const {
    data: bookings,
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: bookingsRetry,
  } = useMyBookings();
  const {
    data: sessions,
    isError: sessionsError,
    refetch: sessionsRetry,
  } = useLiveSessions();
  const { mutateAsync: bookSession } = useBookSession();

  const bookedSessionIds = useMemo(
    () => new Set(bookings?.map((b) => b.sessionId) ?? []),
    [bookings],
  );

  const availableSessions = useMemo(
    () =>
      (sessions ?? []).filter(
        (s) =>
          !bookedSessionIds.has(s.id) &&
          s.status !== "DRAFT" &&
          s.status !== "CANCELLED" &&
          s.status !== "COMPLETED" &&
          s.status !== "ARCHIVED" &&
          (s.maxStudents === 0 || s._count.bookings < s.maxStudents),
      ),
    [sessions, bookedSessionIds],
  );

  const handleBook = useCallback(
    (sessionId: string): void => {
      void bookSession({ sessionId });
    },
    [bookSession],
  );

  const handleJoin = useCallback((session: LiveSessionItem): void => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            اشتراكك الحالي
          </h2>
        </div>
        <SubscriptionHero
          subscriptions={subscriptions ?? []}
          isLoading={subsLoading}
        />
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            الخدمات المتاحة
          </h2>
          <p className="text-sm text-neutral-500">
            اختر الطريقة المناسبة للتعلم
          </p>
        </div>
        <ServiceCards />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            حصصك القادمة
          </h2>
          <Link
            href="/dashboard/live/book"
            className="text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            احجز حصة
          </Link>
        </div>

        {bookingsError && (
          <ErrorState
            title="فشل تحميل الحجوزات"
            onRetry={(): void => { void bookingsRetry(); }}
          />
        )}

        {bookingsLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <LiveSessionCardSkeleton key={i} />
            ))}
          </div>
        )}

        {bookings?.length === 0 && !bookingsLoading && (
          <EmptyState
            icon={<Calendar className="h-16 w-16" />}
            title="لا توجد حجوزات قادمة"
            description="احجز حصة مباشرة للبدء"
            actionLabel="احجز الآن"
            onAction={(): void => { router.push("/dashboard/live/book"); }}
          />
        )}

        {bookings && bookings.length > 0 && (
          <div className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <LiveSessionCard
                key={booking.id}
                session={booking.session}
                state={deriveSessionState(
                  booking.session,
                  true,
                )}
                onJoin={handleJoin}
              />
            ))}
          </div>
        )}
      </section>

      {sessionsError && (
        <ErrorState
          title="فشل تحميل الجلسات المتاحة"
          onRetry={(): void => { void sessionsRetry(); }}
        />
      )}

      {availableSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-neutral-900 dark:text-neutral-100">
            جلسات متاحة للحجز
          </h2>
          <div className="flex flex-col gap-3">
            {availableSessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                state={deriveSessionState(
                  session,
                  bookedSessionIds.has(session.id),
                )}
                onBook={handleBook}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TeacherView(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { can } = usePermissions();
  const canControl = can("live.control");

  const { mutate: publishSession } = usePublishSession();
  const { mutate: unpublishSession } = useUnpublishSession();

  const handleControl = useCallback(
    (session: LiveSessionItem, action: "start" | "end" | "publish" | "unpublish" | "panel") => {
      if (action === "panel") {
        router.push(`/dashboard/live/sessions/${session.id}`);
      } else if (action === "publish") {
        publishSession(session.id);
      } else if (action === "unpublish") {
        unpublishSession(session.id);
      }
    },
    [router, publishSession, unpublishSession],
  );

  const {
    data: sessions,
    isLoading,
    isError,
    refetch: retry,
  } = useLiveSessions();

  const mySessions = useMemo(
    () => (sessions ?? []).filter((s) => s.teacherId === user?.id),
    [sessions, user?.id],
  );

  const todaySessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return mySessions.filter((s) => {
      const start = new Date(s.startTime);
      return start >= today && start < tomorrow;
    });
  }, [mySessions]);

  const upcomingSessions = useMemo(
    () => mySessions.filter((s) => new Date(s.startTime) > new Date()),
    [mySessions],
  );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <section className="grid gap-4 md:grid-cols-3">
        <Card
          variant="elevated"
          padding="md"
          interactive
          className="text-center"
          onClick={(): void => { router.push("/dashboard/live/availability"); }}
        >
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
                <Settings2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                إدارة الأوقات المتاحة
              </h3>
              <p className="text-xs text-neutral-500">
                حدد أوقاتك المتاحة للحصص المباشرة
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="outline" padding="md" className="text-center">
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-500/10 text-success-500">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                حصص اليوم
              </h3>
              <p className="text-2xl font-bold text-primary-500">
                {String(todaySessions.length)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="outline" padding="md" className="text-center">
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-500/10 text-warning-500">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                الحصص القادمة
              </h3>
              <p className="text-2xl font-bold text-primary-500">
                {String(upcomingSessions.length)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            حصصي المباشرة
          </h2>
          <Link
            href="/dashboard/live/availability"
            className="text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            إدارة الأوقات
          </Link>
        </div>

        {isError && (
          <ErrorState
            title="فشل تحميل الجلسات"
            onRetry={(): void => { void retry(); }}
          />
        )}

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <LiveSessionCardSkeleton key={i} />
            ))}
          </div>
        )}

        {mySessions.length === 0 && !isLoading && (
          <EmptyState
            icon={<Calendar className="h-16 w-16" />}
            title="لا توجد حصص مجدولة"
            description="سيتم عرض الحصص التي تنشئها هنا"
          />
        )}

        {mySessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {mySessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                state={deriveSessionState(session, false)}
                canControl={canControl}
                onControl={handleControl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function LiveSessionsPage(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMINISTRATOR";

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={(): void => { router.push("/dashboard"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للرئيسية
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          الحصص المباشرة
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isTeacher
            ? "إدارة الحصص المباشرة وتحديد الأوقات المتاحة"
            : "احجز حصتك المباشرة وتعلم مع أفضل المعلمين"}
        </p>
      </div>

      {isTeacher ? <TeacherView /> : <StudentView />}
    </div>
  );
}

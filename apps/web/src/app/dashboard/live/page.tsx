"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LiveSessionCard,
  LiveSessionCardSkeleton,
} from "@/components/live/live-session-card";
import { ProductCard } from "@/components/live/product-card";
import { MyBookingsTabs } from "@/components/live/my-bookings-tabs";
import { JoinLiveSessionModal } from "@/components/live/join-live-session-modal";
import { LiveEmpty } from "@/components/live/live-empty";
import {
  useLiveSubscriptions,
  useLiveSessions,
  useCancelBooking,
  useRequestReschedule,
  useCreateSubscription,
  deriveSessionState,
  type LiveSubscriptionItem,
  type LiveSessionItem,
  type LiveBookingItem,
} from "@/lib/live-api";
import { useAuthStore } from "@/lib/auth-store";
import {
  Users,
  User,
  Calendar,
  Zap,
  Star,
  Sparkles,
  ArrowLeft,
  Video,
  RefreshCw,
  Gift,
  GraduationCap,
} from "lucide-react";

function SubscriptionCard({
  subscriptions,
  isLoading,
  onCreateSubscription,
}: {
  subscriptions: LiveSubscriptionItem[];
  isLoading: boolean;
  onCreateSubscription: (sub: LiveSubscriptionItem) => void;
}): ReactNode {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border border-primary-400/20 bg-gradient-to-br from-primary-500/10 via-white/50 to-white/40 p-6 dark:from-primary-400/10 dark:via-white/[0.02] dark:to-white/[0.02]">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-neutral-200 dark:bg-white/10" />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-neutral-200 dark:bg-white/10" />
      </div>
    );
  }

  const active = subscriptions.filter((s) => s.status === "ACTIVE");

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-primary-400/20 bg-gradient-to-br from-primary-500/10 to-transparent p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-500 dark:text-primary-300">
            <Star className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              ابدأ رحلتك مع الحصص المباشرة
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              اختر خطة شهرية أو احجز حصة منفردة الآن.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="rounded-2xl shadow-lg shadow-primary-500/20"
          onClick={(): void => { router.push("/dashboard/live/private-monthly"); }}
        >
          <Sparkles className="h-4 w-4" />
          اشترك الآن
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {active.map((sub) => {
        const isPrivate = sub.type === "PRIVATE_MONTHLY";
        const remaining = sub.sessionsTotal - sub.sessionsUsed;
        const progressPct =
          sub.sessionsTotal > 0 ? Math.round((sub.sessionsUsed / sub.sessionsTotal) * 100) : 0;

        return (
          <div
            key={sub.id}
            className="overflow-hidden rounded-3xl border border-primary-400/25 bg-gradient-to-br from-primary-500/12 via-white/60 to-white/40 p-5 dark:from-primary-400/10 dark:via-white/[0.02] dark:to-white/[0.02]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-500 dark:text-primary-300">
                  {isPrivate ? <User className="h-7 w-7" /> : <Users className="h-7 w-7" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-primary-600 dark:text-primary-300">
                    {isPrivate ? "اشتراك فردي شهري" : "اشتراك مجموعة"}
                  </p>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                    مع {sub.teacher.fullName}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-center gap-4 sm:max-w-sm">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                      {remaining} / {sub.sessionsTotal} حصص متبقية
                    </span>
                    <span className="text-neutral-400">{progressPct}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-primary-500/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
                      style={{ width: `${String(progressPct)}%` }}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-xl border-primary-400/40 text-primary-600 dark:text-primary-300"
                  onClick={(): void => { onCreateSubscription(sub); }}
                >
                  <RefreshCw className="h-4 w-4" />
                  تجديد
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentView(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const { data: subscriptions, isLoading: subsLoading } = useLiveSubscriptions();
  const { mutateAsync: createSubscription } = useCreateSubscription();
  const { mutateAsync: cancelBooking, isPending: isCancelling } = useCancelBooking();
  const { mutateAsync: requestReschedule } = useRequestReschedule();

  const [cancelTarget, setCancelTarget] = useState<LiveBookingItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<LiveBookingItem | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [joinTarget, setJoinTarget] = useState<LiveBookingItem | null>(null);

  const handleJoin = useCallback((booking: LiveBookingItem): void => {
    setJoinTarget(booking);
  }, []);

  const handleCreateSubscription = useCallback(
    (sub: LiveSubscriptionItem): void => {
      if (!user || !sub.teacherId) return;
      void createSubscription({ teacherId: sub.teacherId, type: sub.type });
    },
    [createSubscription, user],
  );

  const handleConfirmCancel = useCallback(async (): Promise<void> => {
    if (!cancelTarget) return;
    try {
      await cancelBooking(cancelTarget.id);
      setCancelTarget(null);
    } catch {
      // handled by mutation
    }
  }, [cancelTarget, cancelBooking]);

  const handleConfirmReschedule = useCallback(async (): Promise<void> => {
    if (!rescheduleTarget || !rescheduleReason.trim()) return;
    try {
      await requestReschedule({
        bookingId: rescheduleTarget.id,
        reason: rescheduleReason.trim(),
      });
      setRescheduleTarget(null);
      setRescheduleReason("");
    } catch {
      // handled by mutation
    }
  }, [rescheduleTarget, rescheduleReason, requestReschedule]);

  return (
    <div className="flex flex-col gap-8 pb-4">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30">
            <Video className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              ابدأ الحجز في أقل من دقيقة
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              اختر الخدمة الأنسب لك — سريع وبسيط وأنيق.
            </p>
          </div>
        </div>
        <SubscriptionCard
          subscriptions={subscriptions ?? []}
          isLoading={subsLoading}
          onCreateSubscription={handleCreateSubscription}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
            الخدمات المتاحة
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductCard
            icon={<User className="h-8 w-8" />}
            title="اشتراك فردي شهري"
            description="حصص خاصة أسبوعية متكررة مع معلمك."
            price="اشتراك شهري"
            badge="الأكثر طلباً"
            href="/dashboard/live/private-monthly"
            cta="اختر خطتك"
            tone="cyan"
            featured
          />
          <ProductCard
            icon={<Users className="h-8 w-8" />}
            title="حصص المجموعة"
            description="ادرس ضمن مجموعة ثابتة من زملائك."
            price="اشتراك مجموعة"
            href="/dashboard/live/group"
            cta="تصفح المجموعات"
            tone="violet"
          />
          <ProductCard
            icon={<Zap className="h-8 w-8" />}
            title="حصة منفردة"
            description="احجز حصة واحدة حسب المواعيد المتاحة."
            price="حسب الجدول"
            href="/dashboard/live/book"
            cta="احجز الآن"
            tone="amber"
          />
          <ProductCard
            icon={<Gift className="h-8 w-8" />}
            title="فعاليات مجانية"
            description="انضم إلى جلسات مباشرة مجانية أسبوعياً."
            href="/dashboard/live/events"
            cta="استكشف الفعاليات"
            tone="emerald"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
            حجوزاتي
          </h2>
        </div>
        <MyBookingsTabs
          onJoin={handleJoin}
          onReschedule={setRescheduleTarget}
          onCancel={setCancelTarget}
          cancelling={isCancelling}
        />
      </section>

      <Dialog open={Boolean(cancelTarget)} onClose={() => { setCancelTarget(null); }} title="إلغاء الحجز">
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            هل أنت متأكد من إلغاء حجز «{cancelTarget?.session.title}»؟
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setCancelTarget(null); }}>
            إبقاء الحجز
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isCancelling}
            onClick={(): void => { void handleConfirmCancel(); }}
          >
            تأكيد الإلغاء
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={Boolean(rescheduleTarget)} onClose={() => { setRescheduleTarget(null); }} title="طلب إعادة جدولة">
        <DialogContent>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              حصة «{rescheduleTarget?.session.title}»
            </p>
            <textarea
              value={rescheduleReason}
              onChange={(e) => { setRescheduleReason(e.target.value); }}
              placeholder="اكتب سبب طلب إعادة الجدولة"
              rows={3}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setRescheduleTarget(null); }}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!rescheduleReason.trim()}
            onClick={(): void => { void handleConfirmReschedule(); }}
          >
            إرسال الطلب
          </Button>
        </DialogFooter>
      </Dialog>

      {joinTarget && (
        <JoinLiveSessionModal
          sessionId={joinTarget.session.id}
          onClose={() => { setJoinTarget(null); }}
        />
      )}
    </div>
  );
}

function SecretaryLiveObserverView(): ReactNode {
  const { data: sessions, isLoading, isError, refetch } = useLiveSessions();

  const upcoming = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [sessions],
  );

  const handleJoin = (session: LiveSessionItem): void => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900 dark:text-neutral-100">
          الحصص القادمة
        </h2>
        {isError && (
          <ErrorState title="فشل تحميل الجلسات" onRetry={(): void => { void refetch(); }} />
        )}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <LiveSessionCardSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && upcoming.length === 0 && (
          <LiveEmpty
            icon={<Calendar className="h-10 w-10" />}
            title="لا توجد حصص قادمة"
            description="سيتم عرض الحصص المجدولة هنا"
          />
        )}
        {!isLoading && upcoming.length > 0 && (
          <div className="flex flex-col gap-3">
            {upcoming.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                state={deriveSessionState(session, false)}
                onJoin={handleJoin}
              />
            ))}
          </div>
        )}
      </section>

      <Link href="/dashboard" className="text-sm font-medium text-primary-500 hover:text-primary-600">
        العودة للوحة التحكم
      </Link>
    </div>
  );
}

function RoleRouter(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  useEffect(() => {
    if (role === "ADMINISTRATOR") {
      router.replace("/dashboard/live/admin");
    } else if (role === "TEACHER") {
      router.replace("/dashboard/live/studio");
    }
  }, [role, router]);

  if (role === "ADMINISTRATOR" || role === "TEACHER") {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function LiveSessionsPage(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMINISTRATOR";
  const isSecretary = user?.role === "SECRETARY";

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
            ? "مركز إدارة الحصص المباشرة"
            : isSecretary
              ? "متابعة الحصص المباشرة والاشتراكات"
              : "اختر خدمتك واحجز حصتك مباشرة — سريع وبسيط"}
        </p>
      </div>

      {isTeacher ? <RoleRouter /> : isSecretary ? <SecretaryLiveObserverView /> : <StudentView />}
    </div>
  );
}

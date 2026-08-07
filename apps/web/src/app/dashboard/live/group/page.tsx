"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { useStudySchedules, useLivePricing } from "@/lib/live-shop-api";
import { StepIndicator } from "@/components/live/step-indicator";
import { BottomCta } from "@/components/live/bottom-cta";
import { SummaryCard, SummaryRow } from "@/components/live/summary-card";
import { LiveEmpty } from "@/components/live/live-empty";
import { cn } from "@/lib/utils";
import { LiveCheckoutDialog, type LiveCheckoutDialogProps } from "@/components/live/live-checkout-dialog";

const STEPS = [
  { key: "package", label: "اختر الخطة" },
  { key: "schedule", label: "اختر المجموعة" },
  { key: "confirm", label: "الملخص" },
] as const;

type StepIndex = 0 | 1 | 2;

const DAY_NAMES = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];
const DAY_VALUES = [6, 0, 1, 2, 3, 4, 5];

interface PlanDef {
  key: "GROUP_PLAN_A" | "GROUP_PLAN_B";
  label: string;
  sessions: number;
  benefits: string[];
}

const PLANS: PlanDef[] = [
  {
    key: "GROUP_PLAN_A",
    label: "خطة A — مرة أسبوعياً",
    sessions: 4,
    benefits: ["حصة مجموعة أسبوعية ثابتة", "متابعة جماعية منظمة", "سعر اقتصادي"],
  },
  {
    key: "GROUP_PLAN_B",
    label: "خطة B — مرتين أسبوعياً",
    sessions: 8,
    benefits: ["حصتان أسبوعياً مع المجموعة", "تغطية أسرع للمنهج", "توازن بين الحصة والتدريب"],
  },
];

export default function GroupPage(): ReactNode {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [plan, setPlan] = useState<PlanDef | null>(null);
  const [scheduleId, setScheduleId] = useState<string>("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: schedules, isLoading: scheduleLoading } = useStudySchedules();
  const { data: pricing } = useLivePricing();

  const groupSchedules = useMemo(
    () => (schedules ?? []).filter((s) => s.type === "GROUP" && s.isActive),
    [schedules],
  );

  const selectedSchedule = useMemo(
    () => groupSchedules.find((s) => s.id === scheduleId) ?? null,
    [groupSchedules, scheduleId],
  );

  const sortedDays = useMemo(
    () => (selectedSchedule ? [...selectedSchedule.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek) : []),
    [selectedSchedule],
  );

  const productPrice = useMemo(() => {
    if (!plan || !pricing) return null;
    return pricing[plan.key];
  }, [plan, pricing]);

  const priceForPlan = (key: "GROUP_PLAN_A" | "GROUP_PLAN_B"): string => {
    if (!pricing) return "…";
    return `${String(pricing[key])} EGP`;
  };

  const checkoutProps: LiveCheckoutDialogProps | null = useMemo(() => {
    if (!plan || !selectedSchedule || productPrice === null) return null;
    const dateFrom = new Date().toISOString().split("T")[0];
    const dateTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    return {
      open: showCheckout,
      onClose: (): void => { setShowCheckout(false); },
      onSuccess: (): void => { router.push("/dashboard/live"); },
      productLabel: plan.label,
      amount: productPrice,
      buildPayload: () => ({
        productType: `LIVE_${plan.key}`,
        productId: selectedSchedule.id,
        paymentMethod: "paymob",
        metadata: {
          scheduleId: selectedSchedule.id,
          dateFrom,
          dateTo,
        },
      }),
    };
  }, [plan, selectedSchedule, productPrice, showCheckout, router]);

  const handleConfirm = (): void => {
    setCheckoutError(null);
    if (!plan || !selectedSchedule || productPrice === null) {
      setCheckoutError("الخطة غير متاحة حالياً");
      return;
    }
    setShowCheckout(true);
  };

  const stepPrimaryLabel =
    step === 0 ? "متابعة" : step === 1 ? "متابعة إلى الملخص" : "إتمام الدفع";

  const stepPrimaryDisabled = step === 0 ? !plan : step === 1 ? !scheduleId : false;

  const goForward = (): void => {
    if (step === 0 && plan) setStep(1);
    else if (step === 1) setStep(2);
    else if (step === 2) handleConfirm();
  };

  const goBack = (): void => {
    if (step === 2) { setStep(1); return; }
    if (step === 1) { setStep(0); return; }
    router.push("/dashboard/live");
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={goBack}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "العودة للحصص المباشرة" : "رجوع"}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-500/30">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              اشتراك مجموعة شهري
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              ادرس ضمن مجموعة ثابتة من زملائك وابدأ قريباً.
            </p>
          </div>
        </div>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            اختر خطتك الأسبوعية
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {PLANS.map((p) => {
              const selected = plan?.key === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => { setPlan(p); }}
                  className={cn(
                    "group relative flex flex-col gap-4 rounded-3xl border bg-white/80 p-6 text-start backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 dark:bg-[var(--ui-card-bg-dark)]",
                    selected
                      ? "border-purple-400/60 ring-2 ring-purple-400/50 shadow-[0_0_30px_rgba(168,85,247,0.25)]"
                      : "border-neutral-200/70 dark:border-white/10",
                  )}
                >
                  {selected && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  )}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{p.label}</h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {p.sessions} حصص شهرياً · 60 دقيقة للحصة
                    </p>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto inline-flex items-center gap-1 text-base font-bold text-purple-600 dark:text-purple-300">
                    {priceForPlan(p.key)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            اختر مجموعة معلمك
          </p>
          {scheduleLoading ? (
            <div className="h-32 animate-pulse rounded-3xl bg-neutral-200 dark:bg-white/5" />
          ) : groupSchedules.length === 0 ? (
            <LiveEmpty
              tone="violet"
              icon={<Users className="h-10 w-10" />}
              title="لا توجد مجموعات متاحة حالياً"
              description="لم يفتح المعلمون مجموعات بعد."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {groupSchedules.map((s) => {
                const selected = scheduleId === s.id;
                const days = [...s.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
                return (
                  <button
                    key={s.id}
                    onClick={() => { setScheduleId(s.id); }}
                    className={cn(
                      "flex flex-col gap-3 rounded-3xl border bg-white/80 p-5 text-start transition-all dark:bg-[var(--ui-card-bg-dark)]",
                      selected
                        ? "border-purple-400/60 ring-2 ring-purple-400/50"
                        : "border-neutral-200/70 dark:border-white/10",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-500">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-neutral-900 dark:text-neutral-50">{s.name}</p>
                        <p className="text-xs text-neutral-500">{days.length} يوم أسبوعياً</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {days.map((day) => (
                        <span
                          key={day.id}
                          className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
                        >
                          <Clock className="h-3 w-3 text-purple-500" />
                          {DAY_NAMES[DAY_VALUES.indexOf(day.dayOfWeek)] ?? day.dayOfWeek}
                          <span className="text-neutral-400" dir="ltr">{day.startTime.slice(0, 5)}</span>
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedSchedule && plan && sortedDays.length > 0 && (
            <p className="rounded-2xl bg-purple-500/10 px-4 py-3 text-xs font-medium text-purple-700 dark:text-purple-200">
              ستحجز {plan.sessions} حصص شهرياً موزعة على{" "}
              {sortedDays.map((d) => DAY_NAMES[DAY_VALUES.indexOf(d.dayOfWeek)] ?? "").join(" و ")}.
            </p>
          )}
        </div>
      )}

      {step === 2 && plan && selectedSchedule && (
        <div className="flex flex-col gap-4">
          <SummaryCard title="ملخص الاشتراك">
            <SummaryRow
              icon={<Sparkles className="h-5 w-5" />}
              label="الخطة"
              value={plan.label}
              sub={`${String(plan.sessions)} حصص شهرياً`}
            />
            <SummaryRow
              icon={<CalendarDays className="h-5 w-5" />}
              label="المجموعة"
              value={selectedSchedule.name}
            />
            <SummaryRow
              icon={<Clock className="h-5 w-5" />}
              label="الأيام الأسبوعية"
              value={sortedDays.map((d) => DAY_NAMES[DAY_VALUES.indexOf(d.dayOfWeek)] ?? "").join("، ")}
            />
            <SummaryRow
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="السعر الشهري"
              value={productPrice === null ? "غير متاح" : `${String(productPrice)} EGP`}
            />
          </SummaryCard>

          {checkoutError && (
            <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600 dark:text-danger-300">
              {checkoutError}
            </p>
          )}
        </div>
      )}

      <BottomCta
        primaryLabel={stepPrimaryLabel}
        onPrimary={goForward}
        primaryLoading={step === 2}
        primaryDisabled={stepPrimaryDisabled}
        secondaryLabel="رجوع"
        onSecondary={goBack}
      />

      {checkoutProps && (
        <LiveCheckoutDialog {...checkoutProps} />
      )}
    </div>
  );
}

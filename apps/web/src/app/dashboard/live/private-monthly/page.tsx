"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
} from "lucide-react";
import {
  useAvailabilities,
  useAvailableSlots,
  useCreateSubscription,
  useRecurringBook,
  type TeacherAvailabilityItem,
} from "@/lib/live-api";
import { formatTime } from "@/lib/live-format";
import { StepIndicator } from "@/components/live/step-indicator";
import { BottomCta } from "@/components/live/bottom-cta";
import { SummaryCard, SummaryRow } from "@/components/live/summary-card";
import { LiveEmpty } from "@/components/live/live-empty";
import { LiveError } from "@/components/live/live-error";
import { SuccessOverlay } from "@/components/live/success-overlay";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "package", label: "اختر الباقة" },
  { key: "schedule", label: "اختر الجدول" },
  { key: "confirm", label: "الملخص" },
] as const;

type StepIndex = 0 | 1 | 2;

const DAY_NAMES = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];

interface PackageDef {
  frequency: number;
  label: string;
  sessions: number;
  duration: number;
  benefits: string[];
  tone: string;
}

const PACKAGES: PackageDef[] = [
  {
    frequency: 1,
    label: "يوم واحد أسبوعياً",
    sessions: 4,
    duration: 60,
    benefits: ["مراجعة أسبوعية ثابتة", "موعد واحد في الأسبوع", "خطة متابعة مخصصة"],
    tone: "from-primary-400 to-primary-600",
  },
  {
    frequency: 2,
    label: "يومان أسبوعياً",
    sessions: 8,
    duration: 60,
    benefits: ["حصة مراجعة + حصة تدريب", "متابعة أقرب للتقدم", "الأكثر توازناً"],
    tone: "from-primary-500 to-primary-700",
  },
  {
    frequency: 3,
    label: "ثلاثة أيام أسبوعياً",
    sessions: 12,
    duration: 60,
    benefits: ["تغطية مكثفة للمنهج", "أسرع تقدم ملحوظ", "مراجعات مستمرة"],
    tone: "from-purple-500 to-primary-600",
  },
];

export default function PrivateMonthlyPage(): ReactNode {
  const router = useRouter();

  const [step, setStep] = useState<StepIndex>(0);
  const [pkg, setPkg] = useState<PackageDef | null>(null);
  const [teacherId, setTeacherId] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const { data: availabilities, isLoading: availLoading } = useAvailabilities();
  const { data: slots } = useAvailableSlots(teacherId || undefined);
  const { mutateAsync: createSubscription } = useCreateSubscription();
  const { mutateAsync: recurringBook } = useRecurringBook();

  const privateAvailabilities = useMemo(
    () => (availabilities ?? []).filter((a) => a.type === "PRIVATE"),
    [availabilities],
  );

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    privateAvailabilities.forEach((a) => {
      if (a.teacherId && a.teacherId !== "") map.set(a.teacherId, "");
    });
    // enrich names from calendar slots
    (slots ?? []).forEach((s) => {
      if (!map.has(s.teacherId)) map.set(s.teacherId, s.teacherName);
      else if (!map.get(s.teacherId)) map.set(s.teacherId, s.teacherName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name: name || (slots?.find((s) => s.teacherId === id)?.teacherName ?? "المعلم"),
    }));
  }, [privateAvailabilities, slots]);

  const availByTeacher = useMemo(() => {
    const map = new Map<string, TeacherAvailabilityItem[]>();
    privateAvailabilities.forEach((a) => {
      const arr = map.get(a.teacherId) ?? [];
      arr.push(a);
      map.set(a.teacherId, arr);
    });
    return map;
  }, [privateAvailabilities]);

  const teacherAvail = teacherId ? (availByTeacher.get(teacherId) ?? []) : [];

  /** Color tone per day-of-week for the selected teacher. */
  const dayTone = useCallback(
    (dow: number): "available" | "few" | "full" | "unavailable" => {
      const daySlots = (slots ?? []).filter((s) => s.dayOfWeek === dow);
      if (daySlots.length > 0) {
        if (daySlots.some((s) => s.availableSeats > 0 && s.availableSeats > 2)) return "available";
        if (daySlots.some((s) => s.availableSeats > 0)) return "few";
        return "full";
      }
      const avail = teacherAvail.find((a) => a.dayOfWeek === dow);
      if (avail) return "available";
      return "unavailable";
    },
    [slots, teacherAvail],
  );

  const dayTime = useCallback(
    (dow: number): string => {
      const avail = teacherAvail.find((a) => a.dayOfWeek === dow);
      if (avail) return formatTime(`1970-01-01T${avail.startTime}`);
      const slot = (slots ?? []).find((s) => s.dayOfWeek === dow);
      return slot ? formatTime(slot.startTime) : "";
    },
    [teacherAvail, slots],
  );

  const sortedDays = useMemo(() => {
    const set = new Set<number>(teacherAvail.map((a) => a.dayOfWeek));
    (slots ?? []).forEach((s) => { if (s.teacherId === teacherId) set.add(s.dayOfWeek); });
    return Array.from(set).sort();
  }, [teacherAvail, slots, teacherId]);

  const toggleDay = useCallback(
    (dow: number): void => {
      if (!pkg) return;
      setSelectedDays((prev) => {
        if (prev.includes(dow)) return prev.filter((d) => d !== dow);
        if (prev.length >= pkg.frequency) return prev;
        return [...prev, dow].sort();
      });
    },
    [pkg],
  );

  const nextSessionDate = useMemo(() => {
    if (selectedDays.length === 0) return null;
    const now = new Date();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      if (selectedDays.includes(d.getDay())) {
        return d.toLocaleDateString("ar-EG-u-nu-latn", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
      }
    }
    return null;
  }, [selectedDays]);

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!pkg || !teacherId || selectedDays.length === 0) return;
    setConfirmError(null);
    try {
      const subscriptionRes = await createSubscription({ teacherId, type: "PRIVATE_MONTHLY" });
      const subscriptionId = subscriptionRes.data?.id;

      for (const dow of selectedDays) {
        const slot = (slots ?? []).find((s) => s.dayOfWeek === dow);
        if (!slot) continue;
        const from = new Date(slot.date + "T00:00:00");
        const to = new Date(from);
        to.setDate(to.getDate() + 30);
        await recurringBook({
          slotId: slot.slotId,
          dateFrom: from.toISOString().split("T")[0],
          dateTo: to.toISOString().split("T")[0],
          subscriptionId,
        });
      }
      setShowSuccess(true);
    } catch {
      setConfirmError("فشل تأكيد الاشتراك");
    }
    }, [pkg, teacherId, selectedDays, slots, createSubscription, recurringBook]);

  const stepPrimaryLabel =
    step === 0
      ? "متابعة"
      : step === 1
        ? "متابعة إلى الملخص"
        : "تأكيد الاشتراك والجدول";

  const stepPrimaryDisabled =
    step === 0 ? !pkg : step === 1 ? teacherId === "" || selectedDays.length === 0 : false;

  const goForward = useCallback((): void => {
    if (step === 0 && pkg) setStep(1);
    else if (step === 1) setStep(2);
    else if (step === 2) void handleConfirm();
  }, [step, pkg, handleConfirm]);

  const goBack = useCallback((): void => {
    if (step === 2) { setStep(1); return; }
    if (step === 1) { setStep(0); return; }
    router.push("/dashboard/live");
  }, [step, router]);

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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              اشتراك فردي شهري
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              حصص خاصة متكررة أسبوعياً مع معلمك.
            </p>
          </div>
        </div>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            كم مرة تريد الحصص أسبوعياً؟
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {PACKAGES.map((p) => {
              const selected = pkg?.frequency === p.frequency;
              return (
                <button
                  key={p.frequency}
                  onClick={() => { setPkg(p); }}
                  className={cn(
                    "group relative flex flex-col gap-4 rounded-3xl border bg-white/80 p-6 text-start backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 dark:bg-[var(--ui-card-bg-dark)]",
                    selected
                      ? "border-primary-400/60 ring-2 ring-primary-400/50 shadow-[0_0_30px_rgba(6,182,212,0.25)]"
                      : "border-neutral-200/70 dark:border-white/10",
                  )}
                >
                  {selected && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  )}
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", p.tone)}>
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{p.label}</h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {p.sessions} حصص شهرياً · {p.duration} دقيقة للحصة
                    </p>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-primary-600 dark:text-primary-300">
                    اشتراك شهري
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              اختر المعلم
            </p>
            {availLoading ? (
              <div className="h-12 animate-pulse rounded-2xl bg-neutral-200 dark:bg-white/5" />
            ) : teachers.length === 0 ? (
              <LiveEmpty
                icon={<User className="h-10 w-10" />}
                title="لا يوجد معلمون متاحون حالياً"
                description="لم يتم تحديد أوقات خاصة بعد."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {teachers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTeacherId(t.id); setSelectedDays([]); }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                      teacherId === t.id
                        ? "border-primary-400/50 bg-primary-500/15 text-primary-700 dark:text-primary-200"
                        : "border-neutral-200 bg-white/60 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300",
                    )}
                  >
                    <User className="h-4 w-4" />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {teacherId !== "" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  اختر {pkg?.frequency} أيام متكررة أسبوعياً
                </p>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-300">
                  {selectedDays.length} / {pkg?.frequency}
                </span>
              </div>

              {sortedDays.length === 0 ? (
                <LiveEmpty
                  icon={<CalendarDays className="h-10 w-10" />}
                  title="لا توجد أوقات متاحة لهذا المعلم"
                  description="اختر معلماً آخر أو عد لاحقاً."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {sortedDays.map((dow) => {
                    const tone = dayTone(dow);
                    const selected = selectedDays.includes(dow);
                    const atLimit = selectedDays.length >= (pkg?.frequency ?? 1) && !selected;
                    return (
                      <button
                        key={dow}
                        disabled={tone === "unavailable" || tone === "full" || atLimit}
                        onClick={() => { toggleDay(dow); }}
                        className={cn(
                          "relative flex flex-col items-center gap-1 rounded-2xl border px-4 py-4 text-center transition-all duration-200",
                          tone === "unavailable"
                            ? "border-dashed border-neutral-200 text-neutral-300 dark:border-white/10 dark:text-neutral-700"
                            : tone === "full"
                              ? "border-neutral-200 bg-neutral-100 text-neutral-400 line-through dark:border-white/5 dark:bg-white/5 dark:text-neutral-600"
                              : "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
                          selected && "ring-2 ring-primary-400 shadow-[0_0_18px_rgba(6,182,212,0.35)]",
                        )}
                      >
                        {selected && (
                          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                        )}
                        <span className="text-sm font-bold">{DAY_NAMES[dow]}</span>
                        <span className="text-xs opacity-80">{dayTime(dow)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedDays.length > 0 && (
                <p className="rounded-2xl bg-primary-500/10 px-4 py-3 text-xs font-medium text-primary-700 dark:text-primary-200">
                  ستحجز حصصاً متكررة كل {DAY_NAMES[selectedDays[0]]}
                  {selectedDays.length > 1 ? ` و ${selectedDays.slice(1).map((d) => DAY_NAMES[d]).join(" و ")}` : ""} أسبوعياً.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && pkg && teacherId !== "" && selectedDays.length > 0 && (
        <div className="flex flex-col gap-4">
          <SummaryCard title="ملخص الاشتراك">
            <SummaryRow
              icon={<BookOpen className="h-5 w-5" />}
              label="الباقة"
              value={`${String(pkg.sessions)} حصص شهرياً`}
              sub={pkg.label}
            />
            <SummaryRow
              icon={<User className="h-5 w-5" />}
              label="المعلم"
              value={teachers.find((t) => t.id === teacherId)?.name ?? "المعلم"}
            />
            <SummaryRow
              icon={<CalendarDays className="h-5 w-5" />}
              label="الأيام المتكررة"
              value={selectedDays.map((d) => DAY_NAMES[d]).join("، ")}
            />
            <SummaryRow
              icon={<Clock className="h-5 w-5" />}
              label="مدة الحصة"
              value={`${String(pkg.duration)} دقيقة`}
            />
            <SummaryRow
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="أول حصة"
              value={nextSessionDate ?? "قريباً"}
            />
          </SummaryCard>

          {confirmError && (
            <LiveError kind="payment" onAction={(): void => { void handleConfirm(); }} />
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

      <SuccessOverlay
        open={showSuccess}
        onDone={(): void => { router.push("/dashboard/live"); }}
        title="تم إنشاء اشتراكك!"
        subtitle="تم تأكيد جدول حصصك الأسبوعية بنجاح."
      />
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CalendarDays, Check, Clock, User, Zap } from "lucide-react";
import { useAvailableSlots, useBookBySlot, type AvailableSlotItem } from "@/lib/live-api";
import { formatTime, slotTone, weekdayName } from "@/lib/live-format";
import { StepIndicator } from "@/components/live/step-indicator";
import { BottomCta } from "@/components/live/bottom-cta";
import { SummaryCard, SummaryRow } from "@/components/live/summary-card";
import { LiveEmpty } from "@/components/live/live-empty";
import { LiveError } from "@/components/live/live-error";
import { SuccessOverlay } from "@/components/live/success-overlay";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "date", label: "اختر اليوم" },
  { key: "time", label: "اختر الوقت" },
  { key: "confirm", label: "تأكيد" },
] as const;

type StepIndex = 0 | 1 | 2;

const toneClasses = {
  available:
    "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
  few: "border-amber-400/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
  full: "border-neutral-200 bg-neutral-100 text-neutral-400 line-through dark:border-white/5 dark:bg-white/5 dark:text-neutral-600",
  unavailable:
    "border-dashed border-neutral-200 bg-transparent text-neutral-300 dark:border-white/10 dark:text-neutral-700",
} as const;

const dateToneClasses: Record<SlotTone, string> = {
  available: "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  few: "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  full: "border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-white/5 dark:bg-white/5 dark:text-neutral-600",
  unavailable: "border-dashed border-neutral-200 text-neutral-300 dark:border-white/10 dark:text-neutral-700",
};

type SlotTone = "available" | "few" | "full" | "unavailable";

function dateTone(slots: AvailableSlotItem[]): SlotTone {
  const tones = slots.map(slotTone);
  if (tones.includes("available")) return "available";
  if (tones.includes("few")) return "few";
  return "full";
}

export default function OneTimeBookPage(): ReactNode {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlotItem | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: slots, isLoading, isError, refetch } = useAvailableSlots(
    selectedTeacher || undefined,
  );

  const { mutateAsync: bookBySlot, isPending: isBooking, error: bookingError } = useBookBySlot();

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    (slots ?? []).forEach((s) => map.set(s.teacherId, s.teacherName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [slots]);

  const byDate = useMemo(() => {
    const map = new Map<string, AvailableSlotItem[]>();
    (slots ?? []).forEach((s) => {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return Array.from(map.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [slots]);

  const timeSlots = useMemo(
    () => (selectedDate ? (byDate.find(([d]) => d === selectedDate)?.[1] ?? []) : []),
    [byDate, selectedDate],
  );

  const handleSelectDate = useCallback((date: string): void => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(1);
  }, []);

  const handleSelectSlot = useCallback((slot: AvailableSlotItem): void => {
    setSelectedSlot(slot);
    setStep(2);
  }, []);

  const handleBack = useCallback((): void => {
    if (step === 2) { setStep(1); return; }
    if (step === 1) { setSelectedSlot(null); setStep(0); return; }
  }, [step]);

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (!selectedSlot) return;
    try {
      await bookBySlot({ slotId: selectedSlot.slotId, date: selectedSlot.date });
      setShowSuccess(true);
    } catch {
      // handled below
    }
  }, [bookBySlot, selectedSlot]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={(): void => {
            if (step === 0) { router.push("/dashboard/live"); return; }
            handleBack();
          }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "العودة للحصص المباشرة" : "رجوع"}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              حصة منفردة
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              اختر اليوم ثم الوقت — ثلاث خطوات فقط.
            </p>
          </div>
        </div>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {isError && (
        <LiveError
          kind="offline"
          onAction={(): void => { void refetch(); }}
          secondaryLabel="العودة"
          onSecondary={(): void => { router.push("/dashboard/live"); }}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-neutral-200 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && step === 0 && (
        <div className="flex flex-col gap-4">
          {teachers.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-xs font-medium text-neutral-500">المعلم:</span>
              {teachers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTeacher(t.id === selectedTeacher ? "" : t.id);
                    setSelectedDate(null);
                    setStep(0);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all",
                    selectedTeacher === t.id
                      ? "border-primary-400/50 bg-primary-500/15 text-primary-700 dark:text-primary-200"
                      : "border-neutral-200 bg-white/60 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300",
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {byDate.length === 0 ? (
            <LiveEmpty
              tone="amber"
              icon={<CalendarDays className="h-10 w-10" />}
              title="لا توجد مواعيد متاحة حالياً"
              description="سيتم إضافة مواعيد جديدة قريباً — تابع الإشعارات."
            />
          ) : (
            <>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                اختر اليوم المتاح
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {byDate.map(([date, daySlots]) => {
                  const tone = dateTone(daySlots);
                  const seats = daySlots.reduce((acc, s) => acc + s.availableSeats, 0);
                  const selected = selectedDate === date;
                  const day = new Date(date + "T12:00:00");
                  return (
                    <button
                      key={date}
                      onClick={() => { handleSelectDate(date); }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border px-4 py-4 text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                        dateToneClasses[tone],
                        selected && "ring-2 ring-primary-400 shadow-[0_0_18px_rgba(6,182,212,0.35)]",
                      )}
                    >
                      {selected && (
                        <Check className="h-4 w-4 text-primary-500" strokeWidth={3} />
                      )}
                      <span className="text-sm font-bold">{weekdayName(day)}</span>
                      <span className="text-xs opacity-80">
                        {day.getDate()}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {seats > 0 ? `${String(seats)} مقعد` : "ممتلئ"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && step === 1 && selectedDate && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            اختر الوقت المناسب
          </p>
          {timeSlots.length === 0 ? (
            <LiveEmpty
              tone="amber"
              icon={<Clock className="h-10 w-10" />}
              title="لا توجد مواعيد لهذا اليوم"
              description="اختر يوماً آخر من المواعيد المتاحة."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {timeSlots.map((slot) => {
                const tone = slotTone(slot);
                const selected = selectedSlot?.slotId === slot.slotId;
                return (
                  <button
                    key={slot.slotId}
                    onClick={() => { handleSelectSlot(slot); }}
                    disabled={tone === "full"}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border px-4 py-4 text-center transition-all duration-200",
                      toneClasses[tone],
                      !tone.includes("full") && "hover:scale-[1.02] active:scale-[0.98]",
                      selected && "ring-2 ring-primary-400 shadow-[0_0_18px_rgba(6,182,212,0.35)]",
                    )}
                  >
                    <span className="text-base font-bold">
                      {formatTime(slot.startTime)}
                    </span>
                    <span className="text-[11px] opacity-75">
                      {slot.availableSeats > 0 ? `${String(slot.availableSeats)} مقعد` : "ممتلئ"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isLoading && !isError && step === 2 && selectedSlot && (
        <div className="flex flex-col gap-4">
          <SummaryCard title="ملخص الحجز">
            <SummaryRow
              icon={<User className="h-5 w-5" />}
              label="المعلم"
              value={selectedSlot.teacherName}
            />
            <SummaryRow
              icon={<CalendarDays className="h-5 w-5" />}
              label="التاريخ"
              value={weekdayName(new Date(selectedSlot.date + "T12:00:00"))}
              sub={new Date(selectedSlot.date + "T12:00:00").toLocaleDateString("ar-EG-u-nu-latn", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
            <SummaryRow
              icon={<Clock className="h-5 w-5" />}
              label="الوقت"
              value={`${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`}
            />
            <SummaryRow
              icon={<BookOpen className="h-5 w-5" />}
              label="النوع"
              value={selectedSlot.type === "PRIVATE" ? "حصّة فردية" : "حصّة مجموعة"}
            />
          </SummaryCard>

          {bookingError && (
            <LiveError
              kind="failed"
              onAction={(): void => { void handleConfirm(); }}
            />
          )}
        </div>
      )}

      {!isLoading && !isError && step === 2 && (
        <BottomCta
          primaryLabel={isBooking ? "جاري الحجز..." : "تأكيد الحجز"}
          onPrimary={(): void => { void handleConfirm(); }}
          primaryLoading={isBooking}
          secondaryLabel="رجوع"
          onSecondary={handleBack}
          hint="بعد التأكيد سيصلك تذكير قبل الحصة."
        />
      )}

      <SuccessOverlay
        open={showSuccess}
        onDone={(): void => { router.push("/dashboard/live"); }}
        title="تم تأكيد الحجز!"
        subtitle="سيتم تذكيرك قبل بدء الحصة مباشرة."
      />
    </div>
  );
}

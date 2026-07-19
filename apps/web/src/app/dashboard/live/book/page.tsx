"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  useAvailableSlots,
  useBookBySlot,
  type AvailableSlotItem,
} from "@/lib/live-api";
import {
  User,
  CalendarDays,
  Clock,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  CreditCard,
} from "lucide-react";

const STEPS = [
  { key: "teacher", label: "اختر المعلم" },
  { key: "date", label: "اختر التاريخ" },
  { key: "time", label: "اختر الوقت" },
  { key: "confirm", label: "تأكيد ودفع" },
] as const;

const DAY_NAMES = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء",
  "الخميس", "الجمعة", "السبت",
];

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function StepIndicator({ current }: { current: number }): ReactNode {
  return (
    <div className="flex items-center justify-center gap-0" dir="ltr">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i <= current
                  ? "bg-primary-500 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
              }`}
            >
              {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-[10px] font-medium ${
                i <= current
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-neutral-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 h-px w-8 sm:w-12 ${
                i < current
                  ? "bg-primary-500"
                  : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function TeacherCard({
  teacher,
  selected,
  onSelect,
}: {
  teacher: { id: string; name: string };
  selected: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <Card
      variant={selected ? "elevated" : "outline"}
      padding="md"
      interactive
      onClick={onSelect}
      className={`transition-all ${
        selected
          ? "ring-2 ring-primary-500 shadow-primary-500/10"
          : "hover:border-primary-300"
      }`}
    >
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            {teacher.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {teacher.name}
            </p>
            <p className="text-xs text-neutral-500">معلم</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DateGrid({
  dates,
  selected,
  onSelect,
}: {
  dates: string[];
  selected: string | null;
  onSelect: (date: string) => void;
}): ReactNode {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const dateSet = useMemo(() => new Set(dates), [dates]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {MONTH_NAMES[currentMonth]} {currentYear}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 font-medium text-neutral-500">
            {d.slice(0, 2)}
          </div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${String(i)}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${String(currentYear)}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isAvailable = dateSet.has(dateStr);
          const isPast = new Date(currentYear, currentMonth, day) < now;
          const isSelected = selected === dateStr;

          return (
            <button
              key={dateStr}
              disabled={!isAvailable || isPast}
              onClick={() => { onSelect(dateStr); }}
              className={`relative flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? "bg-primary-500 text-white shadow-sm"
                  : isAvailable && !isPast
                    ? "bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300"
                    : "text-neutral-300 dark:text-neutral-600"
              }`}
            >
              {day}
              {isAvailable && !isPast && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeSlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: AvailableSlotItem[];
  selected: AvailableSlotItem | null;
  onSelect: (slot: AvailableSlotItem) => void;
}): ReactNode {
  const formatTime = (d: Date): string =>
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {slots.map((slot) => {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);
        const isSelected = selected?.slotId === slot.slotId;

        return (
          <Card
            key={slot.slotId}
            variant={isSelected ? "elevated" : "outline"}
            padding="sm"
            interactive
            onClick={() => { onSelect(slot); }}
            className={`transition-all ${
              isSelected
                ? "ring-2 ring-primary-500"
                : "hover:border-primary-300"
            }`}
          >
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isSelected ? "text-primary-500" : "text-neutral-400"}`} />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatTime(start)} - {formatTime(end)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={slot.type === "PRIVATE" ? "primary" : "warning"} className="text-[10px]">
                    {slot.type === "PRIVATE" ? "فردي" : "مجموعة"}
                  </Badge>
                  <span className="text-[10px] text-neutral-400">
                    {String(slot.availableSeats)} مقعد
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ConfirmStep({
  slot,
  isBooking,
  onConfirm,
  onBack,
}: {
  slot: AvailableSlotItem;
  isBooking: boolean;
  onConfirm: () => void;
  onBack: () => void;
}): ReactNode {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);

  const formatTime = (d: Date): string =>
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (d: string): string => {
    const dt = new Date(d + "T12:00:00");
    return `${String(dt.getDate())} ${MONTH_NAMES[dt.getMonth()]} ${String(dt.getFullYear())}`;
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              تأكيد الحجز
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
              <User className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">المعلم</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {slot.teacherName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
              <CalendarDays className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">التاريخ</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDate(slot.date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
              <Clock className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">الوقت</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatTime(start)} - {formatTime(end)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
              <CreditCard className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-neutral-500">نوع الحصة</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {slot.type === "PRIVATE" ? "حصّة فردية" : "حصّة مجموعة"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onConfirm}
              loading={isBooking}
            >
              {isBooking ? "جاري تأكيد الحجز..." : "تأكيد الحجز والدفع"}
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={onBack}
              disabled={isBooking}
            >
              العودة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingSuccessView({
  slot,
  onDone,
}: {
  slot: AvailableSlotItem;
  onDone: () => void;
}): ReactNode {
  const formatDate = (d: string): string => {
    const dt = new Date(d + "T12:00:00");
    return `${String(dt.getDate())} ${MONTH_NAMES[dt.getMonth()]} ${String(dt.getFullYear())}`;
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardContent>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
            <CheckCircle2 className="h-10 w-10 text-success-600 dark:text-success-400" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              تم الحجز بنجاح! 🎉
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              حصة مع {slot.teacherName} في {formatDate(slot.date)}
            </p>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button variant="primary" size="md" fullWidth onClick={onDone}>
              عرض الحجوزات
            </Button>
            <Button variant="outline" size="md" fullWidth onClick={onDone}>
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookPage(): ReactNode {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlotItem | null>(null);
  const [successSlot, setSuccessSlot] = useState<AvailableSlotItem | null>(null);

  const { data: slots, isLoading, isError, refetch: retry } = useAvailableSlots(
    selectedTeacher || undefined,
  );

  const { mutateAsync: bookBySlot, isPending: isBooking } = useBookBySlot();

  const uniqueTeachers = useMemo(() => {
    if (!slots) return [];
    const map = new Map<string, string>();
    slots.forEach((s) => map.set(s.teacherId, s.teacherName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [slots]);

  const availableDates = useMemo(() => {
    if (!slots) return [];
    const set = new Set<string>();
    slots.forEach((s) => set.add(s.date));
    return Array.from(set).sort();
  }, [slots]);

  const timeSlotsForDate = useMemo(() => {
    if (!slots || !selectedDate) return [];
    return slots.filter((s) => s.date === selectedDate);
  }, [slots, selectedDate]);

  const handleSelectTeacher = useCallback((id: string) => {
    setSelectedTeacher(id);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(1);
  }, []);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(2);
  }, []);

  const handleSelectTime = useCallback((slot: AvailableSlotItem) => {
    setSelectedSlot(slot);
    setStep(3);
  }, []);

  const handleConfirm = async (): Promise<void> => {
    if (!selectedSlot?.slotId) return;
    try {
      await bookBySlot({
        slotId: selectedSlot.slotId,
        date: selectedSlot.date,
      });
      setSuccessSlot(selectedSlot);
    } catch {
      // handled by mutation
    }
  };

  const handleBack = useCallback(() => {
    if (step === 3) { setStep(2); return; }
    if (step === 2) { setSelectedSlot(null); setStep(1); return; }
    if (step === 1) { setSelectedDate(null); setStep(0); return; }
  }, [step]);

  if (successSlot) {
    return (
      <div className="pb-4">
        <div className="mb-6">
          <button
            onClick={() => { router.push("/dashboard/live"); }}
            className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة للحصص المباشرة
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            تم الحجز بنجاح
          </h1>
        </div>
        <BookingSuccessView
          slot={successSlot}
          onDone={() => { router.push("/dashboard/live"); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={() => {
            if (step === 0) { router.push("/dashboard/live"); return; }
            handleBack();
          }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? "العودة للحصص المباشرة" : "الرجوع للخلف"}
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          احجز حصة مباشرة
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          اتبع الخطوات التالية لحجز حصتك
        </p>
      </div>

      <StepIndicator current={step} />

      {isError && (
        <ErrorState
          title="فشل تحميل المواعيد المتاحة"
          onRetry={() => { void retry(); }}
        />
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="outline" padding="md">
              <CardContent>
                <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
                  <div className="h-16 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && step === 0 && (
        <>
          {uniqueTeachers.length === 0 ? (
            <EmptyState
              icon={<User className="h-16 w-16" />}
              title="لا يوجد معلمون متاحون"
              description="لم يتم العثور على معلمين متاحين حالياً"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uniqueTeachers.map((t) => (
                <TeacherCard
                  key={t.id}
                  teacher={t}
                  selected={selectedTeacher === t.id}
                  onSelect={() => { handleSelectTeacher(t.id); }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!isLoading && step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              اختر التاريخ المناسب
            </h2>
            <span className="text-xs text-neutral-400">
              {String(availableDates.length)} تاريخ متاح
            </span>
          </div>

          {availableDates.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-16 w-16" />}
              title="لا توجد تواريخ متاحة"
              description="لم يتم العثور على تواريخ متاحة لهذا المعلم"
            />
          ) : (
            <DateGrid
              dates={availableDates}
              selected={selectedDate}
              onSelect={handleSelectDate}
            />
          )}
        </div>
      )}

      {!isLoading && step === 2 && selectedDate && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              اختر الوقت المناسب
            </h2>
            <span className="text-xs text-neutral-400">
              {String(timeSlotsForDate.length)} موعد متاح
            </span>
          </div>

          {timeSlotsForDate.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-16 w-16" />}
              title="لا توجد مواعيد متاحة"
              description="لم يتم العثور على مواعيد متاحة لهذا التاريخ"
            />
          ) : (
            <TimeSlotPicker
              slots={timeSlotsForDate}
              selected={selectedSlot}
              onSelect={handleSelectTime}
            />
          )}
        </div>
      )}

      {step === 3 && selectedSlot && (
        <ConfirmStep
          slot={selectedSlot}
          isBooking={isBooking}
          onConfirm={() => { void handleConfirm(); }}
          onBack={() => { setStep(2); }}
        />
      )}
    </div>
  );
}

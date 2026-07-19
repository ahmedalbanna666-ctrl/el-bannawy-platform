"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  useAvailabilities,
  useCreateAvailability,
  useDeleteAvailability,
  useBlockDate,
  type TeacherAvailabilityItem,
} from "@/lib/live-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Clock,
  Plus,
  Trash2,
  CalendarOff,
  ArrowLeft,
} from "lucide-react";
import { LiveSessionTypeEnum } from "@el-bannawy/shared";

const DAY_NAMES = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

const DAY_VALUES = [6, 0, 1, 2, 3, 4, 5];

const TIME_SLOTS: string[] = ((): string[] => {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();

function AvailabilityTabBar({
  days,
  activeDay,
  onSelect,
}: {
  days: { value: number; label: string; count: number }[];
  activeDay: number;
  onSelect: (day: number) => void;
}): ReactNode {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" dir="ltr">
      {days.map((day) => (
        <button
          key={day.value}
          onClick={(): void => { onSelect(day.value); }}
          className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
            activeDay === day.value
              ? "bg-primary-500 text-white shadow-md"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
          }`}
        >
          <span>{day.label}</span>
          {day.count > 0 && (
            <span
              className={`text-[10px] ${
                activeDay === day.value
                  ? "text-white/70"
                  : "text-neutral-400"
              }`}
            >
              {String(day.count)} موعد
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function AddSlotForm({
  dayOfWeek,
  onClose,
}: {
  dayOfWeek: number;
  onClose: () => void;
}): ReactNode {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [maxStudents, setMaxStudents] = useState("5");
  const [isRecurring, setIsRecurring] = useState(true);
  const [slotType, setSlotType] = useState<LiveSessionTypeEnum>(
    LiveSessionTypeEnum.PRIVATE,
  );

  const { mutateAsync: createAvailability, isPending } =
    useCreateAvailability();

  const handleSubmit = async (): Promise<void> => {
    if (!startTime || !endTime) return;

    try {
      await createAvailability({
        dayOfWeek,
        startTime,
        endTime,
        maxStudents: parseInt(maxStudents, 10) || 5,
        type: slotType,
        isRecurring,
      });
      onClose();
    } catch {
      // handled by mutation
    }
  };

  return (
    <Card variant="outline" padding="md">
      <CardContent>
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            إضافة موعد جديد
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                من
              </label>
              <select
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); }}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">إلى</label>
              <select
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); }}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                عدد الطلاب
              </label>
              <input
                type="number"
                min="1"
                value={maxStudents}
                onChange={(e) => { setMaxStudents(e.target.value); }}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">النوع</label>
              <select
                value={slotType}
                onChange={(e) => {
                  setSlotType(e.target.value as LiveSessionTypeEnum);
                }}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value={LiveSessionTypeEnum.PRIVATE}>فردي</option>
                <option value={LiveSessionTypeEnum.GROUP}>مجموعة</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => { setIsRecurring(e.target.checked); }}
              className="rounded border-neutral-300"
            />
            متكرر أسبوعياً
          </label>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" fullWidth onClick={onClose}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={(): void => { void handleSubmit(); }}
              loading={isPending}
            >
              إضافة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BlockDateSection(): ReactNode {
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const { mutateAsync: blockDateMutation, isPending } = useBlockDate();

  const handleBlock = async (): Promise<void> => {
    if (!blockDate) return;
    try {
      await blockDateMutation({
        date: blockDate,
        reason: blockReason || undefined,
      });
      setBlockDate("");
      setBlockReason("");
    } catch {
      // handled by mutation
    }
  };

  return (
    <Card variant="outline" padding="md">
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-danger-500" />
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              حظر تاريخ
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={blockDate}
              onChange={(e) => { setBlockDate(e.target.value); }}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <input
              type="text"
              value={blockReason}
              onChange={(e) => { setBlockReason(e.target.value); }}
              placeholder="السبب (اختياري)"
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={(): void => { void handleBlock(); }}
            disabled={!blockDate}
            loading={isPending}
          >
            <CalendarOff className="h-4 w-4" />
            حظر هذا التاريخ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AvailabilityPage(): ReactNode {
  const router = useRouter();
  const [activeDay, setActiveDay] = useState(6);
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    data: availabilities,
    isLoading,
    isError,
    refetch: retry,
  } = useAvailabilities();
  const { mutateAsync: deleteAvailability, isPending: isDeleting } =
    useDeleteAvailability();

  const dayMap = useMemo(() => {
    if (!availabilities) return new Map<number, TeacherAvailabilityItem[]>();
    const map = new Map<number, TeacherAvailabilityItem[]>();
    DAY_VALUES.forEach((d) => map.set(d, []));
    availabilities.forEach((a) => {
      const list = map.get(a.dayOfWeek) ?? [];
      list.push(a);
      map.set(a.dayOfWeek, list);
    });
    return map;
  }, [availabilities]);

  const days = useMemo(
    () =>
      DAY_VALUES.map((v, i) => ({
        value: v,
        label: DAY_NAMES[i] ?? "",
        count: dayMap.get(v)?.length ?? 0,
      })),
    [dayMap],
  );

  const activeSlots = dayMap.get(activeDay) ?? [];

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteAvailability(id);
    } catch {
      // handled by mutation
    }
  };

  const formatTime = (t: string): string => t.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={(): void => { router.push("/dashboard/live"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للحصص المباشرة
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          إدارة الأوقات المتاحة
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          حدد الأوقات التي ترغب في تدريس الحصص المباشرة فيها
        </p>
      </div>

      <AvailabilityTabBar
        days={days}
        activeDay={activeDay}
        onSelect={(d): void => {
          setActiveDay(d);
          setShowAddForm(false);
        }}
      />

      {isError && (
        <ErrorState
          title="فشل تحميل الأوقات المتاحة"
          onRetry={(): void => { void retry(); }}
        />
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <Card key={i} variant="outline" padding="md">
              <CardContent>
                <div className="flex items-center justify-between animate-pulse">
                  <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {activeSlots.length === 0 && !showAddForm && (
            <EmptyState
              icon={<Clock className="h-16 w-16" />}
              title="لا توجد مواعيد لهذا اليوم"
              description="أضف مواعيدك المتاحة لبدء استقبال الحجوزات"
              actionLabel="إضافة موعد"
              onAction={(): void => { setShowAddForm(true); }}
            />
          )}

          {activeSlots.length > 0 && (
            <div className="flex flex-col gap-2">
              {activeSlots.map((slot) => (
                <Card
                  key={slot.id}
                  variant="outline"
                  padding="sm"
                  className="border-neutral-200 dark:border-neutral-700"
                >
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {formatTime(slot.startTime)} -{" "}
                            {formatTime(slot.endTime)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant={
                                slot.type === "PRIVATE"
                                  ? "primary"
                                  : "warning"
                              }
                              className="text-[10px]"
                            >
                              {slot.type === "PRIVATE" ? "فردي" : "مجموعة"}
                            </Badge>
                            <span className="text-[10px] text-neutral-500">
                              {String(slot.maxStudents)} طالب
                            </span>
                            {slot.isRecurring && (
                              <span className="text-[10px] text-primary-500">
                                أسبوعي
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(): void => { void handleDelete(slot.id); }}
                        disabled={isDeleting}
                        className="text-danger-500 hover:bg-danger-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {showAddForm && (
            <AddSlotForm
              dayOfWeek={activeDay}
              onClose={(): void => { setShowAddForm(false); }}
            />
          )}

          {!showAddForm && (
            <Button
              variant="outline"
              size="md"
              onClick={(): void => { setShowAddForm(true); }}
            >
              <Plus className="h-4 w-4" />
              إضافة موعد لـ {DAY_NAMES[DAY_VALUES.indexOf(activeDay)] ?? ""}
            </Button>
          )}

          <BlockDateSection />
        </>
      )}
    </div>
  );
}

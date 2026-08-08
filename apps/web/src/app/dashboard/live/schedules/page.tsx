"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useStudySchedules,
  useCreateStudySchedule,
  useUpdateStudySchedule,
  useDeleteStudySchedule,
  type StudyScheduleItem,
} from "@/lib/live-shop-api";
import { formatAmPm, isValidTimeWindow, TIME_SLOTS } from "@/lib/live-format";
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

interface DayFormRow {
  key: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ScheduleFormState {
  name: string;
  type: "PRIVATE" | "GROUP";
  maxStudents: string;
  rows: DayFormRow[];
}

function emptyForm(): ScheduleFormState {
  return {
    name: "",
    type: "PRIVATE",
    maxStudents: "1",
    rows: [
      { key: crypto.randomUUID(), dayOfWeek: 6, startTime: "17:00", endTime: "18:00" },
    ],
  };
}

function formFromSchedule(schedule: StudyScheduleItem): ScheduleFormState {
  return {
    name: schedule.name,
    type: schedule.type === "GROUP" ? "GROUP" : "PRIVATE",
    maxStudents: String(schedule.maxStudents),
    rows: schedule.days.map((d) => ({
      key: d.id,
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime.slice(0, 5),
      endTime: d.endTime.slice(0, 5),
    })),
  };
}

function ScheduleForm({
  initial,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: StudyScheduleItem | null;
  onSubmit: (dto: {
    name: string;
    type: "PRIVATE" | "GROUP";
    maxStudents: number;
    days: { dayOfWeek: number; startTime: string; endTime: string }[];
  }) => void | Promise<void>;
  onCancel: () => void;
  saving: boolean;
}): ReactNode {
  const [form, setForm] = useState<ScheduleFormState>(initial ? formFromSchedule(initial) : emptyForm());
  const [error, setError] = useState<string | null>(null);

  const setRow = (key: string, patch: Partial<DayFormRow>): void => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }));
  };

  const addRow = (): void => {
    setForm((prev) => ({
      ...prev,
      rows: [...prev.rows, { key: crypto.randomUUID(), dayOfWeek: 6, startTime: "17:00", endTime: "18:00" }],
    }));
  };

  const removeRow = (key: string): void => {
    setForm((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.key !== key) }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.name.trim()) {
      setError("أدخل اسم الجدول");
      return;
    }
    if (form.rows.length === 0) {
      setError("أضف يوماً واحداً على الأقل");
      return;
    }
    for (const row of form.rows) {
      if (!isValidTimeWindow(row.startTime, row.endTime)) {
        setError("وقت النهاية يجب أن يختلف عن وقت البداية");
        return;
      }
    }
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        maxStudents: parseInt(form.maxStudents, 10) || (form.type === "GROUP" ? 5 : 1),
        days: form.rows.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      });
    } catch (err) {
      const detail = err instanceof Error && err.message ? err.message : "";
      setError(
        detail
          ? `تعذر حفظ الجدول — ${detail}`
          : "تعذر حفظ الجدول — تأكد من عدم تعارض المواعيد",
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-primary-400/20 bg-gradient-to-br from-primary-500/10 to-transparent p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            اسم الجدول
          </label>
          <input
            value={form.name}
            onChange={(e) => { setForm((prev) => ({ ...prev, name: e.target.value })); }}
            placeholder="مثال: جدول المراجعة الأسبوعية"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            نوع الجدول
          </label>
          <select
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as "PRIVATE" | "GROUP";
              setForm((prev) => ({
                ...prev,
                type,
                maxStudents: type === "PRIVATE" ? "1" : prev.maxStudents,
              }));
            }}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value={LiveSessionTypeEnum.PRIVATE}>فردي (طالب واحد)</option>
            <option value={LiveSessionTypeEnum.GROUP}>مجموعة</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            عدد الطلاب (للمجموعات)
          </label>
          <input
            type="number"
            min="1"
            disabled={form.type === "PRIVATE"}
            value={form.maxStudents}
            onChange={(e) => { setForm((prev) => ({ ...prev, maxStudents: e.target.value })); }}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            الأيام والأوقات
          </p>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> إضافة يوم
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {form.rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-200 bg-white/70 p-3 sm:grid-cols-4 dark:border-neutral-700 dark:bg-white/5"
            >
              <select
                value={row.dayOfWeek}
                onChange={(e) => { setRow(row.key, { dayOfWeek: Number(e.target.value) }); }}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {DAY_VALUES.map((v, i) => (
                  <option key={v} value={v}>
                    {DAY_NAMES[i]}
                  </option>
                ))}
              </select>
              <select
                value={row.startTime}
                onChange={(e) => { setRow(row.key, { startTime: e.target.value }); }}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {formatAmPm(t)}
                  </option>
                ))}
              </select>
              <select
                value={row.endTime}
                onChange={(e) => { setRow(row.key, { endTime: e.target.value }); }}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {formatAmPm(t)}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-500"
                onClick={() => { removeRow(row.key); }}
                disabled={form.rows.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-danger-500/10 px-3 py-2 text-xs text-danger-600 dark:text-danger-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          إلغاء
        </Button>
        <Button variant="primary" size="sm" onClick={(): void => { void handleSubmit(); }} loading={saving}>
          {initial ? "حفظ التعديلات" : "إنشاء الجدول"}
        </Button>
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  deleting,
}: {
  schedule: StudyScheduleItem;
  onEdit: (schedule: StudyScheduleItem) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}): ReactNode {
  const isGroup = schedule.type === "GROUP";
  const sortedDays = useMemo(
    () => [...schedule.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [schedule.days],
  );

  return (
    <Card variant="elevated" padding="md">
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isGroup ? "bg-violet-500/15 text-violet-500" : "bg-primary-500/15 text-primary-500"}`}>
                {isGroup ? <Users className="h-6 w-6" /> : <CalendarDays className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {schedule.name}
                  </p>
                  <Badge variant={isGroup ? "warning" : "primary"}>
                    {isGroup ? "مجموعة" : "فردي"}
                  </Badge>
                  {!schedule.isActive && (
                    <span className="text-[10px] text-danger-500">متوقف</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {sortedDays.length} أيام أسبوعياً ·{" "}
                  {isGroup ? `${String(schedule.maxStudents)} طلاب` : "طالب واحد لكل موعد"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="تعديل الجدول"
                onClick={() => { onEdit(schedule); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="حذف الجدول"
                onClick={() => { onDelete(schedule.id); }}
                disabled={deleting}
                className="text-danger-500 hover:bg-danger-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sortedDays.map((day) => (
              <span
                key={day.id}
                className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:bg-white/5 dark:text-neutral-300"
              >
                <Clock className="h-3.5 w-3.5 text-primary-500" />
                {DAY_NAMES[DAY_VALUES.indexOf(day.dayOfWeek)] ?? day.dayOfWeek}
                <span className="text-neutral-400" dir="ltr">
                  {formatAmPm(day.startTime)} - {formatAmPm(day.endTime)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudySchedulesPage(): ReactNode {
  const router = useRouter();
  const { data: schedules, isLoading, isError, refetch } = useStudySchedules();
  const { mutateAsync: createSchedule, isPending: isCreating } = useCreateStudySchedule();
  const { mutateAsync: updateSchedule, isPending: isUpdating } = useUpdateStudySchedule();
  const { mutateAsync: deleteSchedule, isPending: isDeleting } = useDeleteStudySchedule();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StudyScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyScheduleItem | null>(null);

  const saving = isCreating || isUpdating;

  const handleSave = async (dto: {
    name: string;
    type: "PRIVATE" | "GROUP";
    maxStudents: number;
    days: { dayOfWeek: number; startTime: string; endTime: string }[];
  }): Promise<void> => {
    if (editing) {
      await updateSchedule({ id: editing.id, dto });
      toast.success("تم تحديث الجدول");
      setEditing(null);
    } else {
      await createSchedule(dto);
      toast.success("تم إنشاء الجدول");
      setShowForm(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteSchedule(deleteTarget.id);
      toast.success("تم حذف الجدول");
      setDeleteTarget(null);
    } catch {
      toast.error("تعذر حذف الجدول");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={(): void => { router.push("/dashboard/live/studio"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للاستوديو
        </button>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              جداول الدراسة
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              أنشئ جداول الحصص المتكررة — يشتري الطلاب الاشتراك وتُولَّد الحجوزات تلقائياً
            </p>
          </div>
          {!showForm && !editing && (
            <Button variant="primary" size="sm" onClick={(): void => { setShowForm(true); }}>
              <Plus className="h-4 w-4" /> جدول جديد
            </Button>
          )}
        </div>
      </div>

      {(showForm || editing) && (
        <ScheduleForm
          initial={editing}
          saving={saving}
          onSubmit={handleSave}
          onCancel={(): void => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {isError && (
        <ErrorState title="فشل تحميل الجداول" onRetry={(): void => { void refetch(); }} />
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl border border-neutral-200 bg-white/60 dark:border-white/10 dark:bg-white/5" />
          ))}
        </div>
      )}

      {!isLoading && !isError && schedules?.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-16 w-16" />}
          title="لا توجد جداول بعد"
          description="أنشئ جدولاً ليتمكن الطلاب من الاشتراك في حصصك المتكررة"
          actionLabel="إنشاء جدول"
          onAction={(): void => { setShowForm(true); }}
        />
      )}

      {!isLoading && !isError && schedules && schedules.length > 0 && (
        <div className="flex flex-col gap-3">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={(s): void => {
                setEditing(s);
                setShowForm(false);
              }}
              onDelete={(id): void => {
                const target = schedules.find((x) => x.id === id) ?? null;
                setDeleteTarget(target);
              }}
              deleting={isDeleting}
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(deleteTarget)} onClose={() => { setDeleteTarget(null); }} title="حذف الجدول">
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            هل أنت متأكد من حذف جدول «{deleteTarget?.name}»؟ سيتم إيقاف جميع الحجوزات المرتبطة به.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setDeleteTarget(null); }}>
            إلغاء
          </Button>
          <Button variant="danger" size="sm" loading={isDeleting} onClick={(): void => { void handleDelete(); }}>
            حذف الجدول
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

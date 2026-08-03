"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { usePermissions } from "@/lib/use-permissions";
import { Calendar, Plus, Pencil, Trash2, ArrowLeft, Bell, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const DAY_LABELS: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

interface GradeInfo {
  id: string;
  name: string;
  stageId: string;
}

interface GradeScheduleItem {
  id: string;
  gradeId: string;
  days: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  grade: GradeInfo;
}

function ScheduleFormDialog({
  open,
  onClose,
  schedule,
  grades,
}: {
  open: boolean;
  onClose: () => void;
  schedule?: GradeScheduleItem | null;
  grades: GradeInfo[];
}): ReactNode {
  const queryClient = useQueryClient();
  const [gradeId, setGradeId] = useState(schedule?.gradeId ?? "");
  const [selectedDays, setSelectedDays] = useState<number[]>(schedule?.days ?? []);
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);
  const scheduleId = schedule?.id ?? null;
  const isEdit = scheduleId !== null;

  const createMutation = useMutation({
    mutationFn: async () => api.post("/grade-schedules", { gradeId, days: selectedDays, isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grade-schedules"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (scheduleId === null) return;
      await api.patch(`/grade-schedules/${scheduleId}`, { days: selectedDays, isActive });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grade-schedules"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (scheduleId === null) return;
      await api.delete(`/grade-schedules/${scheduleId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grade-schedules"] });
      onClose();
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (): void => {
    if (isEdit) {
      updateMutation.mutate();
    } else {
      if (!gradeId) return;
      createMutation.mutate();
    }
  };

  const toggleDay = (day: number): void => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>{isEdit ? "تعديل مواعيد الفرقة" : "إضافة مواعيد جديدة"}</DialogHeader>
        <div className="flex flex-col gap-4 p-4">
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">الفرقة</label>
              <select
                value={gradeId}
                onChange={(e) => { setGradeId(e.target.value); }}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              >
                <option value="">اختر فرقة...</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">أيام التوفّر</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => { toggleDay(day); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedDays.includes(day)
                      ? "bg-primary-500 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">مفعّل</label>
            <button
              type="button"
              onClick={() => { setIsActive(!isActive); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {isActive ? "نعم" : "لا"}
            </button>
          </div>
        </div>
        <DialogFooter>
          <div className="flex gap-2">
            {isEdit && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => { deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
            <Button size="sm" onClick={handleSubmit} disabled={pending || selectedDays.length === 0}>
              {isEdit ? "حفظ" : "إضافة"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LessonSchedulesPage(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GradeScheduleItem | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ["grade-schedules"],
    queryFn: async () => {
      const res = await api.get<GradeScheduleItem[]>("/grade-schedules");
      return res.data;
    },
  });

  const gradesQuery = useQuery({
    queryKey: ["admin-grades"],
    queryFn: async () => {
      const res = await api.get<GradeInfo[]>("/admin/stages");
      const grades: GradeInfo[] = [];
      for (const stage of res.data as unknown as { id: string; name: string; grades: GradeInfo[] }[]) {
        for (const g of stage.grades) {
          grades.push(g);
        }
      }
      return grades;
    },
  });

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ gradesNotified: number; studentsNotified: number }>("/grade-schedules/notify-today");
      return res.data;
    },
    onSuccess: (data) => {
      setNotifyResult(`تم إرسال الإشعارات لـ ${String(data?.gradesNotified)} فرقة و ${String(data?.studentsNotified)} طالب`);
      setTimeout(() => { setNotifyResult(null); }, 5000);
    },
    onError: () => {
      setNotifyResult("فشل إرسال الإشعارات");
      setTimeout(() => { setNotifyResult(null); }, 5000);
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ErrorState title="لا تملك صلاحية الوصول" description="هذه الصفحة مخصصة للمدير فقط" />
        <Button variant="outline" onClick={() => { router.push("/dashboard"); }}>العودة للرئيسية</Button>
      </div>
    );
  }

  if (schedulesQuery.isLoading || gradesQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (schedulesQuery.isError) {
    return (
      <ErrorState
        title="حدث خطأ"
        description="تعذر تحميل مواعيد الفرق"
        onRetry={() => { void queryClient.invalidateQueries({ queryKey: ["grade-schedules"] }); }}
      />
    );
  }

  const schedules = schedulesQuery.data ?? [];
  const grades = gradesQuery.data ?? [];
  const scheduledGradeIds = new Set(schedules.map((s) => s.gradeId));
  const unscheduledGrades = grades.filter((g) => !scheduledGradeIds.has(g.id));

  const hasTodaySchedule = schedules.some(
    (s) => s.isActive && s.days.includes(new Date().getDay()),
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { router.push("/dashboard/admin"); }}
            className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" /> العودة للإدارة
          </button>
        </div>
        <div className="flex items-center gap-2">
          {hasTodaySchedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { notifyMutation.mutate(); }}
              disabled={notifyMutation.isPending}
            >
              <Bell className="h-4 w-4" />
              إرسال إشعارات اليوم
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            إضافة مواعيد
          </Button>
        </div>
      </div>

      {notifyResult && (
        <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
          notifyResult.includes("فشل") ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        }`}>
          {notifyResult}
        </div>
      )}

      {schedules.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-16 w-16" />}
          title="لا توجد مواعيد مضافة"
          description="أضف مواعيد الفرق لتحديد أيام توفر الحصص لكل فرقة"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const today = new Date().getDay();
            const isToday = schedule.isActive && schedule.days.includes(today);

            return (
              <Card key={schedule.id} variant="elevated" padding="md">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {schedule.grade.name}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {schedule.days.map((day) => (
                          <Badge key={day} variant={isToday && day === today ? "primary" : "secondary"}>
                            {DAY_LABELS[day]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {schedule.isActive ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-neutral-400" />
                      )}
                      <button
                        onClick={() => { setEditing(schedule); setFormOpen(true); }}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-neutral-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ScheduleFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        schedule={editing}
        grades={editing ? [] : unscheduledGrades}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Video } from "lucide-react";
import { api } from "@/lib/api-client";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useCreateSession,
  useCreateZoomMeeting,
  useUpdateSession,
  type LiveSessionItem,
} from "@/lib/live-api";
import { useAuthStore } from "@/lib/auth-store";
import {
  LiveSessionTypeEnum,
  MeetingProviderEnum,
  combineLocalDateAndTime,
  toLocalIsoInTimeZone,
  PLATFORM_TIMEZONE,
} from "@el-bannawy/shared";

interface GradeOption {
  id: string;
  name: string;
  units: { id: string; title: string; lessons: { id: string; title: string }[] }[];
}

interface StageOption {
  id: string;
  name: string;
  grades: GradeOption[];
}

interface CreateSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  session?: LiveSessionItem | null;
}

function useGrades(): { grades: GradeOption[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["curriculum"],
    queryFn: async () => {
      const res = await api.get<StageOption[]>("/curriculum");
      return res.data ?? [];
    },
    staleTime: 300_000,
  });
  const grades = useMemo(
    () => (data ?? []).flatMap((stage) => stage.grades),
    [data],
  );
  return { grades, isLoading };
}

/**
 * CreateSessionDialog — teacher dashboard: creates a live session and
 * optionally attaches a Zoom meeting.
 */
export function CreateSessionDialog({
  open,
  onClose,
  onCreated,
  session,
}: CreateSessionDialogProps): ReactNode {
  const user = useAuthStore((s) => s.user);
  const { grades, isLoading: gradesLoading } = useGrades();
  const createSession = useCreateSession();
  const createZoomMeeting = useCreateZoomMeeting();
  const updateSession = useUpdateSession();

  const isEdit = Boolean(session);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [type, setType] = useState("GROUP");
  const [maxStudents, setMaxStudents] = useState("30");
  const [createZoom, setCreateZoom] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (session) {
      setTitle(session.title);
      setDescription(session.description ?? "");
      setGradeId(session.gradeId ?? "");
      setLessonId(session.lessonId ?? "");
      setDate(session.date.slice(0, 10));
      setStartTime(session.startTime.slice(11, 16));
      setDurationMinutes(String(session.durationMinutes));
      setType(session.type);
      setMaxStudents(String(session.maxStudents));
      setCreateZoom(false);
      setError("");
      return;
    }
    reset();
  }, [open, session]);

  const selectedGrade = grades.find((g) => g.id === gradeId);
  const lessons = useMemo(
    () =>
      (selectedGrade?.units ?? []).flatMap((unit) =>
        unit.lessons.map((l) => ({ id: l.id, title: `${unit.title} — ${l.title}` })),
      ),
    [selectedGrade],
  );

  const reset = (): void => {
    setTitle("");
    setDescription("");
    setGradeId("");
    setLessonId("");
    setDate("");
    setStartTime("");
    setDurationMinutes("60");
    setType("GROUP");
    setMaxStudents("30");
    setCreateZoom(true);
    setError("");
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user) return;
    if (!title.trim() || !date || !startTime) {
      setError("يرجى إدخال عنوان المحاضرة والتاريخ ووقت البداية");
      return;
    }
    if (!gradeId) {
      setError("يرجى اختيار المادة");
      return;
    }

    const duration = Number(durationMinutes) || 60;
    const start = combineLocalDateAndTime(date, startTime, PLATFORM_TIMEZONE);
    const end = new Date(start.getTime() + duration * 60_000);
    const iso = (d: Date): string => d.toISOString();

    setSubmitting(true);
    setError("");
    try {
      if (isEdit && session) {
        await updateSession.mutateAsync({
          id: session.id,
          dto: {
            title: title.trim(),
            description: description.trim() || undefined,
            gradeId,
            lessonId: lessonId || undefined,
            date: iso(start),
            startTime: iso(start),
            endTime: iso(end),
            durationMinutes: duration,
            maxStudents: Number(maxStudents) || undefined,
          },
        });
        reset();
        onCreated?.();
        onClose();
        return;
      }

      const res = await createSession.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        teacherId: user.id,
        gradeId,
        lessonId: lessonId || undefined,
        courseId: gradeId,
        date: iso(start),
        startTime: iso(start),
        endTime: iso(end),
        durationMinutes: duration,
        maxStudents: Number(maxStudents) || undefined,
        type: type === "PRIVATE" ? LiveSessionTypeEnum.PRIVATE : LiveSessionTypeEnum.GROUP,
        meetingProvider: createZoom
          ? MeetingProviderEnum.ZOOM_SDK
          : MeetingProviderEnum.EXTERNAL_URL,
      });
      const created = res.data;
      if (!created) throw new Error("تعذر إنشاء المحاضرة");

      if (createZoom) {
        await createZoomMeeting.mutateAsync({
          sessionId: created.id,
          dto: {
            topic: title.trim(),
            durationMinutes: duration,
            startTime: toLocalIsoInTimeZone(start, PLATFORM_TIMEZONE),
            timezone: PLATFORM_TIMEZONE,
            waitingRoom: true,
            autoRecord: false,
            muteUponEntry: true,
            joinBeforeHost: true,
            hostVideo: true,
            participantVideo: false,
          },
        });
      }

      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء المحاضرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? "تعديل المحاضرة" : "إنشاء محاضرة مباشرة"}>
      <DialogContent>
        <div className="flex flex-col gap-4">
          <Input
            label="عنوان المحاضرة"
            value={title}
            onChange={(e) => { setTitle(e.target.value); }}
            placeholder="مثال: مراجعة الوحدة الثالثة"
          />
          <Textarea
            label="الوصف"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
            placeholder="وصف اختياري للمحاضرة"
            rows={2}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="المادة"
              options={grades.map((g) => ({ value: g.id, label: g.name }))}
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setLessonId("");
              }}
              placeholder={gradesLoading ? "جارٍ التحميل..." : "اختر المادة"}
            />
            <Select
              label="الدرس (اختياري)"
              options={lessons.map((l) => ({ value: l.id, label: l.title }))}
              value={lessonId}
              onChange={(e) => { setLessonId(e.target.value); }}
              placeholder={gradeId ? "اختر الدرس" : "اختر المادة أولاً"}
              disabled={!gradeId}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              type="date"
              label="التاريخ"
              value={date}
              onChange={(e) => { setDate(e.target.value); }}
            />
            <Input
              type="time"
              label="وقت البداية"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); }}
            />
            <Input
              type="number"
              label="المدة (دقائق)"
              value={durationMinutes}
              min={1}
              max={1440}
              onChange={(e) => { setDurationMinutes(e.target.value); }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="النوع"
              options={[
                { value: "GROUP", label: "مجموعة" },
                { value: "PRIVATE", label: "فردي" },
              ]}
              value={type}
              onChange={(e) => { setType(e.target.value); }}
            />
            <Input
              type="number"
              label="الحد الأقصى للطلاب"
              value={maxStudents}
              min={1}
              onChange={(e) => { setMaxStudents(e.target.value); }}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-danger-500" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  إنشاء اجتماع Zoom
                </p>
                <p className="text-xs text-neutral-500">
                  ينضم الطلاب من داخل المنصة مباشرة
                </p>
              </div>
            </div>
            <Switch checked={createZoom} onChange={(e) => { setCreateZoom(e.target.checked); }} />
          </div>
          {error && (
            <p className="rounded-xl bg-danger-500/10 px-3 py-2 text-sm text-danger-500" role="alert">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          إلغاء
        </Button>
        <Button variant="primary" size="sm" onClick={(): void => { void handleSubmit(); }} disabled={submitting}>
          {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {isEdit ? "حفظ التعديلات" : "إنشاء المحاضرة"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

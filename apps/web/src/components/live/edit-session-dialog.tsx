"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  useUpdateSession,
  type LiveSessionItem,
} from "@/lib/live-api";
import {
  MeetingProviderEnum,
  combineLocalDateAndTime,
  PLATFORM_TIMEZONE,
} from "@el-bannawy/shared";

interface EditSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  session: LiveSessionItem | null;
}

/**
 * EditSessionDialog — teacher dashboard: edits an existing live session and
 * optionally updates its meeting provider. Sessions are created from
 * availability/schedule flows, so this dialog only handles editing.
 */
export function EditSessionDialog({
  open,
  onClose,
  onSaved,
  session,
}: EditSessionDialogProps): ReactNode {
  const updateSession = useUpdateSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [maxStudents, setMaxStudents] = useState("30");
  const [meetingMode, setMeetingMode] = useState<"manual" | "external">("external");
  const [manualZoomId, setManualZoomId] = useState("");
  const [manualZoomPassword, setManualZoomPassword] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !session) return;
    setTitle(session.title);
    setDescription(session.description ?? "");
    setDate(session.date.slice(0, 10));
    setStartTime(session.startTime.slice(11, 16));
    setDurationMinutes(String(session.durationMinutes));
    setMaxStudents(String(session.maxStudents));
    if (session.meetingProvider === "ZOOM_SDK" && session.zoomMeetingId) {
      setMeetingMode("manual");
      setManualZoomId(session.zoomMeetingId);
      setManualZoomPassword(session.zoomPassword ?? "");
    } else if (session.meetingProvider === "EXTERNAL_URL" && session.meetingUrl) {
      setMeetingMode("external");
      setExternalUrl(session.meetingUrl);
    } else {
      setMeetingMode("external");
      setExternalUrl("");
    }
    setError("");
  }, [open, session]);

  const handleClose = (): void => {
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    if (!session) return;
    if (!title.trim() || !date || !startTime) {
      setError("يرجى إدخال عنوان المحاضرة والتاريخ ووقت البداية");
      return;
    }

    const duration = Number(durationMinutes) || 60;
    const start = combineLocalDateAndTime(date, startTime, PLATFORM_TIMEZONE);
    const end = new Date(start.getTime() + duration * 60_000);
    const iso = (d: Date): string => d.toISOString();

    setSubmitting(true);
    setError("");
    try {
      await updateSession.mutateAsync({
        id: session.id,
        dto: {
          title: title.trim(),
          description: description.trim() || undefined,
          date: iso(start),
          startTime: iso(start),
          endTime: iso(end),
          durationMinutes: duration,
          maxStudents: Number(maxStudents) || undefined,
          meetingProvider:
            meetingMode === "external"
              ? MeetingProviderEnum.EXTERNAL_URL
              : MeetingProviderEnum.ZOOM_SDK,
          ...(meetingMode === "manual"
            ? {
                zoomMeetingId: manualZoomId.trim(),
                ...(manualZoomPassword.trim() ? { zoomPassword: manualZoomPassword.trim() } : {}),
              }
            : {}),
          ...(meetingMode === "external" ? { meetingUrl: externalUrl.trim() } : {}),
        },
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث المحاضرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="تعديل المحاضرة">
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
          <Input
            type="number"
            label="الحد الأقصى للطلاب"
            value={maxStudents}
            min={1}
            onChange={(e) => { setMaxStudents(e.target.value); }}
          />
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-danger-500" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    نوع الاجتماع
                  </p>
                  <p className="text-xs text-neutral-500">
                    ينضم الطلاب من داخل المنصة مباشرة
                  </p>
                </div>
              </div>
              <Select
                options={[
                  { value: "manual", label: "رقم اجتماع يدوي" },
                  { value: "external", label: "رابط خارجي" },
                ]}
                value={meetingMode}
                onChange={(e): void => { setMeetingMode(e.target.value as "manual" | "external"); }}
              />
            </div>

            {meetingMode === "manual" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="رقم الاجتماع (Zoom)"
                  value={manualZoomId}
                  onChange={(e): void => { setManualZoomId(e.target.value); }}
                  placeholder="مثال: 1234567890"
                  dir="ltr"
                />
                <Input
                  label="كلمة المرور (اختياري)"
                  value={manualZoomPassword}
                  onChange={(e): void => { setManualZoomPassword(e.target.value); }}
                  dir="ltr"
                />
              </div>
            )}

            {meetingMode === "external" && (
              <Input
                label="رابط الاجتماع"
                value={externalUrl}
                onChange={(e): void => { setExternalUrl(e.target.value); }}
                placeholder="https://meet.google.com/... أو رابط Zoom"
                dir="ltr"
              />
            )}
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
          حفظ التعديلات
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

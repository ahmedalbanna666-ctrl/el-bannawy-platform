"use client";

import { useState, type ReactNode } from "react";
import { Video, Plus, Trash2, Settings2, Loader2, Link2, KeyRound } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  useCreateZoomMeeting,
  useDeleteZoomMeeting,
  useUpdateZoomMeeting,
  type LiveSessionItem,
  type ICreateZoomMeetingDto,
} from "@/lib/live-api";

interface ZoomMeetingManagerProps {
  session: LiveSessionItem;
}

/**
 * ZoomMeetingManager — teacher control-panel widget that creates, edits and
 * removes the Zoom meeting attached to a live session.
 */
export function ZoomMeetingManager({ session }: ZoomMeetingManagerProps): ReactNode {
  const createMeeting = useCreateZoomMeeting();
  const updateMeeting = useUpdateZoomMeeting();
  const deleteMeeting = useDeleteZoomMeeting();

  const [editOpen, setEditOpen] = useState(false);
  const [settings, setSettings] = useState<ICreateZoomMeetingDto>({
    waitingRoom: session.waitingRoom,
    autoRecord: session.autoRecord,
    muteUponEntry: true,
    joinBeforeHost: true,
    hostVideo: true,
    participantVideo: false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const hasMeeting = Boolean(session.zoomMeetingId);

  const handleCreate = async (): Promise<void> => {
    setPending(true);
    setError("");
    try {
      await createMeeting.mutateAsync({
        sessionId: session.id,
        dto: {
          topic: session.title,
          durationMinutes: session.durationMinutes,
          startTime: session.startTime,
          waitingRoom: true,
          autoRecord: false,
          muteUponEntry: true,
          joinBeforeHost: true,
          hostVideo: true,
          participantVideo: false,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء اجتماع Zoom");
    } finally {
      setPending(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setPending(true);
    setError("");
    try {
      await updateMeeting.mutateAsync({ sessionId: session.id, dto: settings });
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث اجتماع Zoom");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm("هل أنت متأكد من حذف اجتماع Zoom؟")) return;
    setPending(true);
    setError("");
    try {
      await deleteMeeting.mutateAsync(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حذف اجتماع Zoom");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 text-base font-semibold">
        <Video className="h-4 w-4 text-danger-500" />
        اجتماع Zoom
        {hasMeeting ? (
          <Badge variant="success">مرفق</Badge>
        ) : (
          <Badge variant="secondary">غير مرفق</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {hasMeeting ? (
          <>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-500">رقم الاجتماع:</span>
                <span className="font-mono font-medium" dir="ltr">{session.zoomMeetingId}</span>
              </div>
              {session.zoomPassword && (
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-500">كلمة المرور:</span>
                  <span className="font-medium" dir="ltr">{session.zoomPassword}</span>
                </div>
              )}
              {session.zoomJoinUrl && (
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-500">رابط الانضمام:</span>
                  <a
                    href={session.zoomJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                  >
                    فتح
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditOpen(true); }} leftIcon={<Settings2 className="h-4 w-4" />}>
                تعديل الإعدادات
              </Button>
              <Button variant="ghost" size="sm" className="text-danger-500" onClick={() => { void handleDelete(); }} disabled={pending} leftIcon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}>
                حذف الاجتماع
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              لم يتم إنشاء اجتماع Zoom لهذه الحصة بعد. أنشئ الاجتماع حتى يتمكن الطلاب من الانضمام من داخل المنصة.
            </p>
            <div>
              <Button variant="primary" size="sm" onClick={() => { void handleCreate(); }} disabled={pending} leftIcon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}>
                {pending ? "جارٍ الإنشاء..." : "إنشاء اجتماع Zoom"}
              </Button>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-danger-500/10 px-3 py-2 text-sm text-danger-500" role="alert">
            {error}
          </p>
        )}
      </CardContent>

      {editOpen && (
        <Dialog open onClose={() => { setEditOpen(false); }} title="إعدادات اجتماع Zoom">
          <DialogContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <div>
                  <p className="text-sm font-semibold">غرفة الانتظار</p>
                  <p className="text-xs text-neutral-500">ينتظر الطلاب حتى يدخل المعلم</p>
                </div>
                <Switch
                  checked={settings.waitingRoom ?? true}
                  onChange={(e) => { setSettings((s) => ({ ...s, waitingRoom: e.target.checked })); }}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <div>
                  <p className="text-sm font-semibold">التسجيل التلقائي</p>
                  <p className="text-xs text-neutral-500">تسجيل الاجتماع في السحابة</p>
                </div>
                <Switch
                  checked={settings.autoRecord ?? false}
                  onChange={(e) => { setSettings((s) => ({ ...s, autoRecord: e.target.checked })); }}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <div>
                  <p className="text-sm font-semibold">كتم صوت المشاركين عند الدخول</p>
                  <p className="text-xs text-neutral-500">تقليل الضوضاء داخل الاجتماع</p>
                </div>
                <Switch
                  checked={settings.muteUponEntry ?? true}
                  onChange={(e) => { setSettings((s) => ({ ...s, muteUponEntry: e.target.checked })); }}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <div>
                  <p className="text-sm font-semibold">السماح بالدخول قبل المعلم</p>
                  <p className="text-xs text-neutral-500">يمكن للطلاب الانضمام قبل وصول المعلم</p>
                </div>
                <Switch
                  checked={settings.joinBeforeHost ?? true}
                  onChange={(e) => { setSettings((s) => ({ ...s, joinBeforeHost: e.target.checked })); }}
                />
              </div>
              {error && (
                <p className="rounded-lg bg-danger-500/10 px-3 py-2 text-sm text-danger-500" role="alert">
                  {error}
                </p>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setEditOpen(false); }}>
              إلغاء
            </Button>
            <Button variant="primary" size="sm" onClick={() => { void handleSave(); }} disabled={pending}>
              {pending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ الإعدادات
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </Card>
  );
}

"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useLiveSession,
  useControlPanel,
  useStartSession,
  useEndSession,
  useSendAnnouncement,
  useRemoveParticipant,
  useControlLogs,
  type LiveAnnouncementItem,
  type LiveControlLogItem,
  type LiveBookingItem,
} from "@/lib/live-api";
import { usePermissions } from "@/lib/use-permissions";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Square,
  Send,
  UserX,
  History,
  Users,
  Video,
  Clock,
  CalendarDays,
  ArrowLeft,
  AlertTriangle,
  Megaphone,
  Pin,
  MessageSquare,
} from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "primary" | "secondary" }> = {
  DRAFT: { label: "مسودة", variant: "secondary" },
  PUBLISHED: { label: "منشور", variant: "info" },
  SCHEDULED: { label: "مجدول", variant: "info" },
  OPEN: { label: "مفتوح", variant: "success" },
  FULL: { label: "ممتلئ", variant: "warning" },
  LIVE: { label: "مباشر", variant: "danger" },
  COMPLETED: { label: "مكتمل", variant: "success" },
  CANCELLED: { label: "ملغي", variant: "secondary" },
  ARCHIVED: { label: "مؤرشف", variant: "secondary" },
};

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch { return dateStr; }
}

export default function SessionControlPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string | undefined;
  const { can } = usePermissions();

  const { data: session, isLoading: sessionLoading, error: sessionError } = useLiveSession(sessionId);
  const { data: panel, isLoading: panelLoading } = useControlPanel(sessionId);
  const { data: controlLogs } = useControlLogs(sessionId);

  const startSession = useStartSession();
  const endSession = useEndSession();
  const sendAnnouncement = useSendAnnouncement();
  const removeParticipant = useRemoveParticipant();

  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [showLogs, setShowLogs] = useState(false);

  const handleStart = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    try { await startSession.mutateAsync(sessionId); } catch { /* ignore */ }
  }, [sessionId, startSession]);

  const handleEnd = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    try { await endSession.mutateAsync(sessionId); } catch { /* ignore */ }
  }, [sessionId, endSession]);

  const handleSendAnnouncement = useCallback(async (): Promise<void> => {
    if (!sessionId || !announcementMsg.trim()) return;
    try {
      await sendAnnouncement.mutateAsync({ sessionId, message: announcementMsg.trim() });
      setAnnouncementMsg("");
    } catch { /* ignore */ }
  }, [sessionId, announcementMsg, sendAnnouncement]);

  const handleRemoveParticipant = useCallback(async (studentId: string): Promise<void> => {
    if (!sessionId) return;
    try { await removeParticipant.mutateAsync({ sessionId, studentId }); } catch { /* ignore */ }
  }, [sessionId, removeParticipant]);

  if (!can("live.control")) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="h-12 w-12 text-neutral-400" />
        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
          ليس لديك صلاحية التحكم في الجلسات المباشرة
        </p>
        <Button variant="outline" onClick={(): void => { router.back(); }}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة
        </Button>
      </div>
    );
  }

  if (sessionLoading || panelLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return <ErrorState description="تعذر العثور على الجلسة أو ليس لديك صلاحية الوصول" />;
  }

  const statusInfo = STATUS_BADGES[session.status] ?? { label: session.status, variant: "secondary" as const };
  const isLive = session.status === "LIVE";
  const canStart = ["SCHEDULED", "PUBLISHED", "OPEN"].includes(session.status);

  return (
    <div className="flex flex-col gap-6 p-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={(): void => { router.push("/dashboard/live"); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{session.title}</h1>
            <p className="text-sm text-neutral-500">
              {formatDate(session.startTime)} | {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </p>
          </div>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {/* Control Buttons */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          {canStart && (
            <Button onClick={() => { void handleStart(); }} disabled={startSession.isPending} leftIcon={<Play className="h-4 w-4" />}>
              {startSession.isPending ? "جاري البدء..." : "بدء الجلسة"}
            </Button>
          )}
          {isLive && (
            <Button onClick={() => { void handleEnd(); }} disabled={endSession.isPending} variant="danger" leftIcon={<Square className="h-4 w-4" />}>
              {endSession.isPending ? "جاري الإنهاء..." : "إنهاء الجلسة"}
            </Button>
          )}
          <Button variant="outline" onClick={(): void => { setShowLogs(!showLogs); }} leftIcon={<History className="h-4 w-4" />}>
            سجل التحكم
          </Button>
        </CardContent>
      </Card>

      {/* Control Logs */}
      {showLogs && (
        <Card>
          <CardHeader className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4" />
            سجل أحداث التحكم
          </CardHeader>
          <CardContent>
            {controlLogs && controlLogs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {controlLogs.map((log: LiveControlLogItem) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{log.actor.fullName}</span>
                      <span className="text-neutral-500">{log.action === "START_SESSION" ? "بدأ الجلسة" : log.action === "END_SESSION" ? "أنهى الجلسة" : log.action === "SEND_ANNOUNCEMENT" ? "أرسل إعلانًا" : log.action === "REMOVE_PARTICIPANT" ? "أزال مشاركًا" : log.action === "OVERRIDE_SETTINGS" ? "عدّل الإعدادات" : log.action}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{formatTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="لا توجد أحداث" description="لم يتم تسجيل أي أحداث تحكم بعد" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Participants */}
        <Card>
          <CardHeader className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4" />
            المشاركون ({panel?.participants.length ?? 0})
          </CardHeader>
          <CardContent>
            {panel?.participants && panel.participants.length > 0 ? (
              <div className="flex flex-col gap-2">
                {panel.participants.map((p: LiveBookingItem) => {
                  const student = (p as unknown as { student: { id: string; fullName: string; email: string; avatarUrl: string | null } }).student;
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{student.fullName}</p>
                          <p className="text-xs text-neutral-500">{student.email}</p>
                        </div>
                      </div>
                      {isLive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-500" onClick={() => { void handleRemoveParticipant(student.id); }} title="إزالة المشارك">
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="لا يوجد مشاركون" description="لم يحجز أي طالب هذه الجلسة بعد" icon={<Users className="h-8 w-8" />} />
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader className="flex items-center gap-2 text-base font-semibold">
            <Megaphone className="h-4 w-4" />
            الإعلانات
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Composer */}
            <div className="flex gap-2">
              <input
                type="text"
                value={announcementMsg}
                onChange={(e): void => { setAnnouncementMsg(e.target.value); }}
                onKeyDown={(e): void => { if (e.key === "Enter") { void handleSendAnnouncement(); } }}
                placeholder="اكتب إعلانًا..."
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                dir="rtl"
              />
              <Button onClick={() => { void handleSendAnnouncement(); }} disabled={!announcementMsg.trim() || sendAnnouncement.isPending} size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Announcements list */}
            {panel?.announcements && panel.announcements.length > 0 ? (
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {panel.announcements.map((a: LiveAnnouncementItem) => (
                  <div key={a.id} className={`rounded-lg border px-3 py-2 text-sm ${a.pinned ? "border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20" : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{a.message}</span>
                      {a.pinned && <Pin className="h-3 w-3 shrink-0 text-primary-500" />}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-neutral-400">{a.sender.fullName}</span>
                      <div className="flex items-center gap-2">
                        {a.type !== "INFO" && <Badge variant="info">{a.type}</Badge>}
                        <span className="text-xs text-neutral-400">{formatTime(a.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="لا توجد إعلانات" description="لم يتم إرسال أي إعلانات بعد" icon={<MessageSquare className="h-8 w-8" />} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Info Card */}
      <Card>
        <CardHeader className="flex items-center gap-2 text-base font-semibold">
          <Video className="h-4 w-4" />
          معلومات الجلسة
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-400">التاريخ:</span>
              <span className="font-medium">{formatDate(session.startTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-400">الوقت:</span>
              <span className="font-medium">{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-400">المقاعد:</span>
              <span className="font-medium">{panel?.participants.length} / {session.maxStudents}</span>
            </div>
            {session.meetingUrl && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <Video className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-600 dark:text-neutral-400">رابط الجلسة:</span>
                <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400">
                  {session.meetingUrl}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

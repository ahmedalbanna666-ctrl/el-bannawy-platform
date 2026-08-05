"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ZoomMeetingRoom } from "@/components/live/zoom-meeting-room";
import { useJoinSession, useLeaveSession, type ZoomJoinConfig } from "@/lib/live-api";

interface JoinLiveSessionModalProps {
  sessionId: string;
  onClose: () => void;
}

/** In-platform live session join: verifies access, then renders the Zoom room. */
export function JoinLiveSessionModal({ sessionId, onClose }: JoinLiveSessionModalProps): ReactNode {
  const joinSession = useJoinSession();
  const leaveSession = useLeaveSession();
  const [config, setConfig] = useState<ZoomJoinConfig | null>(null);
  const [joinError, setJoinError] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);

  const device = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 255) : "";

  const handleJoin = useCallback(async (): Promise<void> => {
    setJoinError("");
    setConfig(null);
    try {
      const result = await joinSession.mutateAsync({ sessionId, device });
      if (result.provider === "ZOOM_SDK" || result.meetingNumber) {
        setConfig(result);
      } else if (result.meetingUrl) {
        // External meeting link fallback.
        window.open(result.meetingUrl, "_blank", "noopener,noreferrer");
        onClose();
      } else {
        setJoinError("لا يوجد اجتماع مرتبط بهذه الحصة");
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "تعذر الانضمام إلى الاجتماع");
    }
  }, [joinSession, sessionId, device, onClose]);

  useEffect(() => {
    void handleJoin();
  }, [handleJoin, retryKey]);

  const handleLeave = useCallback((): void => {
    leaveSession.mutate(sessionId, { onSettled: () => { onClose(); } });
  }, [leaveSession, sessionId, onClose]);

  return (
    <Dialog open onClose={onClose} title="محاضرة مباشرة" className="max-w-4xl">
      <DialogContent>
        {joinError && !config && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-danger-500">{joinError}</p>
            <Button variant="primary" size="sm" onClick={() => { setRetryKey((k) => k + 1); }}>
              <Loader2 className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        )}
        {!joinError && !config && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
            جارٍ التحقق من الاشتراك وتجهيز الاجتماع...
          </div>
        )}
        {config && (
          <ZoomMeetingRoom
            key={`${sessionId}-${String(retryKey)}`}
            config={config}
            onLeave={handleLeave}
            onExit={onClose}
            onRetry={() => { setRetryKey((k) => k + 1); }}
          />
        )}
      </DialogContent>
      {!config && (
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, PhoneOff, RefreshCw, AlertTriangle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  joinZoomMeeting,
  leaveZoomMeeting,
  type ZoomJoinConfigLike,
} from "@/lib/zoom-sdk";

interface ZoomMeetingRoomProps {
  config: ZoomJoinConfigLike & { sessionId: string };
  onLeave: () => void;
  onExit: () => void;
  onRetry?: () => void;
  onJoined?: () => void;
}

type RoomStatus = "loading" | "joined" | "error";

/**
 * ZoomMeetingRoom — in-platform meeting surface.
 *
 * Renders the Zoom Meeting SDK inside the platform (no new window / tab),
 * manages the join lifecycle, exposes a leave button and a retry path for
 * connection errors, and releases all SDK resources on unmount to prevent
 * memory leaks.
 */
export function ZoomMeetingRoom({
  config,
  onLeave,
  onExit,
  onRetry,
  onJoined,
}: ZoomMeetingRoomProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RoomStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const disposedRef = useRef(false);

  const attemptJoin = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setErrorMessage("");
    const container = containerRef.current;
    if (!container) return;
    try {
      await joinZoomMeeting(config, container);
      if (disposedRef.current) {
        leaveZoomMeeting();
        return;
      }
      setStatus("joined");
      onJoined?.();
    } catch (err) {
      if (disposedRef.current) return;
      setErrorMessage(
        err instanceof Error ? err.message : "تعذر الانضمام إلى الاجتماع",
      );
      setStatus("error");
    }
  }, [config, onJoined]);

  useEffect(() => {
    disposedRef.current = false;
    void attemptJoin();
    return (): void => {
      disposedRef.current = true;
      leaveZoomMeeting();
    };
  }, [attemptJoin]);

  const handleLeave = useCallback((): void => {
    disposedRef.current = true;
    leaveZoomMeeting();
    onLeave();
  }, [onLeave]);

  const handleRetry = useCallback((): void => {
    if (onRetry) {
      onRetry();
      return;
    }
    void attemptJoin();
  }, [onRetry, attemptJoin]);

  if (status === "error") {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-danger-500/40 bg-danger-500/5 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-500/10">
          <AlertTriangle className="h-7 w-7 text-danger-500" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            تعذر الانضمام إلى الاجتماع
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {errorMessage}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleRetry}>
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button variant="outline" size="sm" onClick={onExit}>
            خروج
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              جارٍ تجهيز الاجتماع...
            </>
          ) : (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500" />
              </span>
              أنت الآن في الاجتماع
            </>
          )}
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleLeave}
          disabled={status === "loading"}
        >
          <PhoneOff className="ml-2 h-4 w-4" />
          مغادرة الاجتماع
        </Button>
      </div>

      <div
        ref={containerRef}
        className="h-[480px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 sm:h-[560px] lg:h-[640px] dark:border-neutral-700"
        aria-label="غرفة اجتماعات Zoom"
      >
        {status === "loading" && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-900 text-white/70">
            <Video className="h-10 w-10 text-white/40" />
            <p className="text-sm">جارٍ الاتصال بالاجتماع...</p>
          </div>
        )}
      </div>
    </div>
  );
}

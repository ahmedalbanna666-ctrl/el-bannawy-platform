"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
  getPlayerState(): number;
  setSize(width: number, height: number): void;
}

interface YouTubePlayerProps {
  videoId: string;
  youtubeId: string;
  onProgress: (currentTime: number, duration: number) => void;
  onReady: () => void;
  onError: () => void;
  startAt: number;
}

const YT_SCRIPT_ID = "youtube-iframe-api";
const PROGRESS_INTERVAL_MS = 10_000;

function getYT(): { Player: new (elementId: string, config: Record<string, unknown>) => YTPlayerInstance; PlayerState: Record<string, number> } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as Record<string, any>).YT as
    | { Player: new (elementId: string, config: Record<string, unknown>) => YTPlayerInstance; PlayerState: Record<string, number> }
    | undefined;
}

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    const existing = getYT();
    if (existing?.Player) {
      resolve();
      return;
    }
    if (document.getElementById(YT_SCRIPT_ID)) {
      const check = setInterval(() => {
        const yt = getYT();
        if (yt?.Player) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }
    const tag = document.createElement("script");
    tag.id = YT_SCRIPT_ID;
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = (): void => {
      if (prev) prev();
      resolve();
    };
  });
}

function getPlayerStateNumber(state: Record<string, number>, key: string): number {
  return state[key];
}

export function YouTubePlayer({
  videoId,
  youtubeId,
  onProgress,
  onReady,
  onError,
  startAt,
}: YouTubePlayerProps): ReactNode {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasReportedReady = useRef(false);

  const clearTimers = useCallback((): void => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (saveTimerRef.current) {
      clearInterval(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(
    (player: YTPlayerInstance): void => {
      const currentTime = Math.floor(player.getCurrentTime());
      const duration = Math.floor(player.getDuration());
      if (currentTime > 0 && duration > 0) {
        void api.patch(`/videos/${videoId}/progress`, {
          currentPosition: currentTime,
          watchedSeconds: currentTime,
        });
      }
    },
    [videoId],
  );

  useEffect(() => {
    let mounted = true;

    const init = async (): Promise<void> => {
      await loadYouTubeApi();
      if (!mounted) return;

      const yt = getYT();
      if (!yt) return;

      const player = new yt.Player(`yt-player-${videoId}`, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          start: startAt > 0 ? startAt : undefined,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: { target: YTPlayerInstance }): void => {
            if (!mounted) return;
            playerRef.current = event.target;
            if (!hasReportedReady.current) {
              hasReportedReady.current = true;
              onReady();
            }
            if (startAt > 0) {
              event.target.seekTo(startAt, true);
            }
          },
          onStateChange: (event: { data: number; target: YTPlayerInstance }): void => {
            if (!mounted) return;
            const state = event.data;
            clearTimers();

            const playing = getPlayerStateNumber(yt.PlayerState, "PLAYING");
            const paused = getPlayerStateNumber(yt.PlayerState, "PAUSED");
            const ended = getPlayerStateNumber(yt.PlayerState, "ENDED");

            if (state === playing) {
              progressTimerRef.current = setInterval(() => {
                if (event.target.getPlayerState() === playing) {
                  const currentTime = Math.floor(event.target.getCurrentTime());
                  const duration = Math.floor(event.target.getDuration());
                  if (currentTime > 0 && duration > 0) {
                    onProgress(currentTime, duration);
                  }
                }
              }, PROGRESS_INTERVAL_MS);

              saveTimerRef.current = setInterval(() => {
                saveProgress(event.target);
              }, PROGRESS_INTERVAL_MS);
            }

            if (state === paused || state === ended) {
              saveProgress(event.target);
            }
          },
          onError: (): void => {
            if (mounted) onError();
          },
        },
      });

      playerRef.current = player;
    };

    void init();

    return (): void => {
      mounted = false;
      clearTimers();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, youtubeId, startAt, onProgress, onReady, onError, saveProgress, clearTimers]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-lg" id={`yt-player-${videoId}`} />
  );
}

export function VideoPlayerSkeleton(): ReactNode {
  return (
    <div className="relative aspect-video w-full">
      <Skeleton className="h-full w-full rounded-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-700/50" />
      </div>
    </div>
  );
}

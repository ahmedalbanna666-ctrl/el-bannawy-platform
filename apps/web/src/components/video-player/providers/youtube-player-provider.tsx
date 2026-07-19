"use client";

import { useEffect, useRef, useCallback, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { VideoPlayerProvider, VideoPlayerProps } from "../video-player-provider.interface";
import { usePlayerContext, type PlayerProviderApi, type PlayerCapabilities } from "../use-playback-engine";

const YT_PROVIDER_NAME = "YOUTUBE";

const YT_CAPABILITIES: PlayerCapabilities = {
  supportsSeek: true,
  supportsPlaybackRate: true,
  supportsFullscreen: true,
  supportsCaptions: true,
  supportsEvents: true,
  supportsPiP: true,
};

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
  setVolume(volume: number): void;
  getVolume(): number;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  setSize(width: number, height: number): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
}

const YT_SCRIPT_ID = "youtube-iframe-api";
const TIME_UPDATE_INTERVAL_MS = 1_000;

function getYT():
  | {
      Player: new (elementId: string, config: Record<string, unknown>) => YTPlayerInstance;
      PlayerState: Record<string, number>;
    }
  | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as Record<string, any>).YT as
    | {
        Player: new (elementId: string, config: Record<string, unknown>) => YTPlayerInstance;
        PlayerState: Record<string, number>;
      }
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

let playerCounter = 0;

function YoutubePlayerComponent({
  youtubeId,
  startAt,
}: {
  youtubeId: string;
  startAt: number;
}): ReactNode {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);
  const [elementId] = useState(() => `yt-player-${String(++playerCounter)}`);
  const { dispatchEvent, registerProvider } = usePlayerContext();

  const clearTimeUpdate = useCallback((): void => {
    if (timeUpdateRef.current) {
      clearInterval(timeUpdateRef.current);
      timeUpdateRef.current = null;
    }
  }, []);

  const startTimeUpdate = useCallback(
    (player: YTPlayerInstance): void => {
      clearTimeUpdate();
      timeUpdateRef.current = setInterval(() => {
        try {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
            dispatchEvent({
              type: "PLAYER_TIME_UPDATE",
              payload: { currentTime, duration },
            });
          }
        } catch {
          // player may be destroyed
        }
      }, TIME_UPDATE_INTERVAL_MS);
    },
    [dispatchEvent, clearTimeUpdate],
  );

  useEffect(() => {
    let mounted = true;

    const init = async (): Promise<void> => {
      await loadYouTubeApi();
      if (!mounted) return;

      const yt = getYT();
      if (!yt) return;

      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : undefined;

      const player = new yt.Player(elementId, {
        videoId: youtubeId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 1,
          disablekb: 0,
          start: startAt > 0 ? startAt : undefined,
          enablejsapi: 1,
          origin: origin,
        },
        events: {
          onReady: (event: { target: YTPlayerInstance }): void => {
            if (!mounted) return;
            playerRef.current = event.target;

            const duration = event.target.getDuration();

            registerProvider({
              play: (): void => { event.target.playVideo(); },
              pause: (): void => { event.target.pauseVideo(); },
              seek: (time: number): void => { event.target.seekTo(time, true); },
              setPlaybackRate: (rate: number): void => { event.target.setPlaybackRate(rate); },
              setVolume: (vol: number): void => { event.target.setVolume(vol * 100); },
              toggleMute: (): void => {
                if (event.target.isMuted()) {
                  event.target.unMute();
                } else {
                  event.target.mute();
                }
              },
              toggleFullscreen: (): void => {
                if (document.fullscreenElement) {
                  void document.exitFullscreen();
                } else {
                  void document.getElementById(elementId)?.requestFullscreen();
                }
              },
            } satisfies PlayerProviderApi);

            if (startAt > 0 && !hasStartedRef.current) {
              hasStartedRef.current = true;
              event.target.seekTo(startAt, true);
            }

            dispatchEvent({ type: "PLAYER_READY", payload: { duration } });
          },
          onStateChange: (event: { data: number; target: YTPlayerInstance }): void => {
            if (!mounted) return;
            const state = event.data;

            const playing = getPlayerStateNumber(yt.PlayerState, "PLAYING");
            const paused = getPlayerStateNumber(yt.PlayerState, "PAUSED");
            const ended = getPlayerStateNumber(yt.PlayerState, "ENDED");
            const buffering = getPlayerStateNumber(yt.PlayerState, "BUFFERING");
            const cueing = getPlayerStateNumber(yt.PlayerState, "CUED");

            if (state === playing) {
              const currentTime = event.target.getCurrentTime();
              dispatchEvent({ type: "PLAYER_PLAY" });
              startTimeUpdate(event.target);
              dispatchEvent({
                type: "PLAYER_TIME_UPDATE",
                payload: { currentTime, duration: event.target.getDuration() },
              });
            } else if (state === paused) {
              clearTimeUpdate();
              dispatchEvent({
                type: "PLAYER_PAUSE",
                payload: { currentTime: event.target.getCurrentTime() },
              });
            } else if (state === ended) {
              clearTimeUpdate();
              dispatchEvent({
                type: "PLAYER_ENDED",
              });
            } else if (state === buffering || state === cueing) {
              dispatchEvent({
                type: "PLAYER_BUFFER",
                payload: { isBuffering: true },
              });
            }
          },
          onError: (): void => {
            if (mounted) {
              dispatchEvent({ type: "PLAYER_ERROR", payload: {} });
            }
          },
        },
      });

      playerRef.current = player;
    };

    void init();

    return (): void => {
      mounted = false;
      clearTimeUpdate();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [
    elementId,
    youtubeId,
    startAt,
    dispatchEvent,
    registerProvider,
    clearTimeUpdate,
    startTimeUpdate,
  ]);

  return (
    <div
      className="absolute inset-0 h-full w-full bg-neutral-900"
      id={elementId}
    />
  );
}

function YoutubePlayerSkeleton(): ReactNode {
  return (
    <div className="relative aspect-video w-full">
      <Skeleton className="h-full w-full rounded-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-700/50" />
      </div>
    </div>
  );
}

function YouTubePlayerInner({ providerVideoId, startAt }: VideoPlayerProps): ReactNode {
  return <YoutubePlayerComponent youtubeId={providerVideoId} startAt={startAt} />;
}

export const YouTubePlayerProvider: VideoPlayerProvider = {
  providerName: YT_PROVIDER_NAME,
  capabilities: YT_CAPABILITIES,

  canHandle(providerName: string): boolean {
    return providerName.toUpperCase() === YT_PROVIDER_NAME;
  },

  Player: YouTubePlayerInner,

  Skeleton: YoutubePlayerSkeleton,
};

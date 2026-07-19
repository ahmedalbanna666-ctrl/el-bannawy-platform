"use client";

import { useMemo, type ReactNode } from "react";
import { YouTubePlayerProvider } from "./providers/youtube-player-provider";
import type { VideoPlayerProvider, VideoPlayerProps } from "./video-player-provider.interface";
import { PlaybackEngineProvider } from "./use-playback-engine";
import { EventEngineProvider } from "./event-engine/event-context";
import { EventTimeWatcher } from "./event-engine/event-time-watcher";
import { QuestionPluginProvider } from "./plugins/question/question-context";
import { OverlayRenderer } from "./overlay-renderer";
import { ExperienceLayer, type LessonCompletedActions } from "./experience-layer";

const DEFAULT_PROVIDERS: VideoPlayerProvider[] = [YouTubePlayerProvider];

let registeredProviders: VideoPlayerProvider[] = [...DEFAULT_PROVIDERS];

export function registerVideoPlayerProvider(provider: VideoPlayerProvider): void {
  const exists = registeredProviders.some(
    (p) => p.providerName.toUpperCase() === provider.providerName.toUpperCase(),
  );
  if (!exists) {
    registeredProviders = [...registeredProviders, provider];
  }
}

export function getVideoPlayerProvider(providerName: string): VideoPlayerProvider {
  const provider = registeredProviders.find((p) => p.canHandle(providerName));
  if (!provider) {
    return YouTubePlayerProvider;
  }
  return provider;
}

export function getSupportedPlayerProviders(): string[] {
  return registeredProviders.map((p) => p.providerName);
}

export function VideoPlayer({
  providerName,
  providerVideoId,
  videoId,
  startAt = 0,
  onProgress,
  lessonTitle,
  enableLessonCompleted = false,
  onComplete,
  completedActions,
}: {
  readonly providerName: string;
  readonly providerVideoId: string;
  readonly videoId: string | null;
  readonly startAt?: number;
  readonly onProgress?: (currentTime: number, duration: number) => void;
  readonly lessonTitle?: string;
  readonly enableLessonCompleted?: boolean;
  readonly onComplete?: (currentTime: number, duration: number) => void;
  readonly completedActions?: LessonCompletedActions;
}): ReactNode {
  const provider = useMemo(() => getVideoPlayerProvider(providerName), [providerName]);
  const capabilities = provider.capabilities;

  const props: VideoPlayerProps = useMemo(
    () => ({
      providerVideoId,
      startAt,
    }),
    [providerVideoId, startAt],
  );

  const player = useMemo(
    () => <provider.Player {...props} />,
    [provider, props],
  );

  const engine = useMemo(
    () => (
      <PlaybackEngineProvider videoId={videoId} capabilities={capabilities} onProgress={onProgress}>
        {videoId ? (
          <EventEngineProvider videoId={videoId}>
            <QuestionPluginProvider>
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
                {player}
                <ExperienceLayer
                  lessonTitle={lessonTitle}
                  enableLessonCompleted={enableLessonCompleted}
                  onComplete={onComplete}
                  completedActions={completedActions}
                />
                <EventTimeWatcher />
                <OverlayRenderer />
              </div>
            </QuestionPluginProvider>
          </EventEngineProvider>
        ) : (
          player
        )}
      </PlaybackEngineProvider>
    ),
    [
      videoId,
      capabilities,
      onProgress,
      player,
      lessonTitle,
      enableLessonCompleted,
      onComplete,
      completedActions,
    ],
  );

  return engine;
}

export function VideoPlayerSkeleton({
  providerName,
}: {
  readonly providerName?: string;
}): ReactNode {
  const provider = providerName ? getVideoPlayerProvider(providerName) : YouTubePlayerProvider;
  return <provider.Skeleton />;
}

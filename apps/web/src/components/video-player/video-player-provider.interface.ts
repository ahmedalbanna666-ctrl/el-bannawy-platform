import type { ReactNode } from "react";
import type { PlayerCapabilities } from "./use-playback-engine";

export interface VideoPlayerProps {
  readonly providerVideoId: string;
  readonly startAt: number;
}

export interface VideoPlayerProvider {
  readonly providerName: string;

  readonly capabilities: PlayerCapabilities;

  canHandle(providerName: string): boolean;

  Player: (props: VideoPlayerProps) => ReactNode;

  Skeleton: () => ReactNode;
}

export interface VideoData {
  readonly id: string;
  readonly title: string;
  readonly providerName: string;
  readonly providerVideoId: string;
  readonly duration: number;
  readonly displayOrder: number;
  readonly timelineEvents: unknown[];
  readonly activities: unknown[];
}

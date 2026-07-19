import { Injectable } from "@nestjs/common";
import type { VideoProviderStrategy, PlayerCapabilities, VideoProviderResult } from "../video-provider.interface";

export const YOUTUBE_PROVIDER_NAME = "YOUTUBE";

const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
const YOUTUBE_VIDEO_ID_PATTERN = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const YOUTUBE_CAPABILITIES: PlayerCapabilities = {
  supportsSeek: true,
  supportsPlaybackRate: true,
  supportsFullscreen: true,
  supportsCaptions: true,
  supportsEvents: true,
  supportsPiP: true,
};

@Injectable()
export class YouTubeProvider implements VideoProviderStrategy {
  readonly providerName = YOUTUBE_PROVIDER_NAME;
  readonly capabilities = YOUTUBE_CAPABILITIES;

  canHandle(url: string): boolean {
    return YOUTUBE_URL_PATTERN.test(url.trim());
  }

  extractVideoId(url: string): string | null {
    const trimmed = url.trim();
    const execResult = YOUTUBE_VIDEO_ID_PATTERN.exec(trimmed);
    return execResult?.[1] ?? null;
  }

  validateUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }

  resolve(url: string): VideoProviderResult {
    const trimmedUrl = url.trim();
    const providerVideoId = this.extractVideoId(trimmedUrl);
    if (!providerVideoId) {
      throw new Error(`Invalid YouTube URL: ${trimmedUrl}`);
    }
    return {
      providerName: this.providerName,
      providerVideoId,
    };
  }

  getEmbedUrl(providerVideoId: string): string {
    return `https://www.youtube.com/embed/${providerVideoId}`;
  }

  getWatchUrl(providerVideoId: string): string {
    return `https://www.youtube.com/watch?v=${providerVideoId}`;
  }
}

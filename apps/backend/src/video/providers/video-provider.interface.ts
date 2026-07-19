export interface PlayerCapabilities {
  readonly supportsSeek: boolean;
  readonly supportsPlaybackRate: boolean;
  readonly supportsFullscreen: boolean;
  readonly supportsCaptions: boolean;
  readonly supportsEvents: boolean;
  readonly supportsPiP: boolean;
}

export interface VideoProviderResult {
  readonly providerName: string;
  readonly providerVideoId: string;
}

export interface VideoProviderStrategy {
  readonly providerName: string;
  readonly capabilities: PlayerCapabilities;
  canHandle(url: string): boolean;
  extractVideoId(url: string): string | null;
  validateUrl(url: string): boolean;
  resolve(url: string): VideoProviderResult;
  getEmbedUrl(providerVideoId: string): string;
  getWatchUrl(providerVideoId: string): string;
}

export interface ExecutionContext {
  readonly videoId: string;
  readonly eventId: string;
  readonly pluginType: string;
  readonly userId: string;
  readonly currentTime: number;
  readonly playbackState: string;
  readonly eventPayload: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

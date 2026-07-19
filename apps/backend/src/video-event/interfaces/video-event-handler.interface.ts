export declare enum VideoEventHandlerState {
  Waiting = "WAITING",
  Triggered = "TRIGGERED",
  Executing = "EXECUTING",
  Completed = "COMPLETED",
  Skipped = "SKIPPED",
  Disabled = "DISABLED",
  Error = "ERROR",
}

export interface VideoEventPayload {
  readonly type: string;
  readonly videoId: string;
  readonly timestamp: number;
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
  readonly enabled: boolean;
  readonly displayOrder: number;
  readonly payload: Record<string, unknown>;
}

export interface VideoEventHandler {
  readonly eventType: string;
  canHandle(type: string): boolean;
  onTrigger(payload: VideoEventPayload): Promise<VideoEventHandlerState>;
  onSkip(payload: VideoEventPayload): Promise<VideoEventHandlerState>;
}

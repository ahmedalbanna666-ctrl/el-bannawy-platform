// ── Event State ───────────────────────────────────────────────────

export enum VideoEventState {
  Waiting = "WAITING",
  Triggered = "TRIGGERED",
  Executing = "EXECUTING",
  Completed = "COMPLETED",
  Skipped = "SKIPPED",
  Disabled = "DISABLED",
  Error = "ERROR",
}

// ── Video Event ───────────────────────────────────────────────────

export interface VideoEvent {
  readonly id: string;
  readonly videoId: string;
  readonly timestamp: number;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
  readonly enabled: boolean;
  readonly displayOrder: number;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ── Event Handler Interface ───────────────────────────────────────

export interface VideoEventHandler {
  readonly eventType: string;

  canHandle(type: string): boolean;

  onTrigger(event: VideoEvent): Promise<VideoEventState>;

  onSkip(event: VideoEvent): Promise<VideoEventState>;
}

// ── Event Registry Interface ──────────────────────────────────────

export interface VideoEventRegistry {
  register(handler: VideoEventHandler): void;

  unregister(eventType: string): void;

  getHandler(eventType: string): VideoEventHandler | null;

  hasHandler(eventType: string): boolean;
}

// ── Dispatcher Interface ──────────────────────────────────────────

export interface VideoEventDispatcher {
  dispatch(event: VideoEvent): Promise<void>;
  skip(event: VideoEvent): Promise<void>;
}

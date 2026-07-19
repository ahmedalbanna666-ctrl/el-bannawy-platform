// ── Execution State ────────────────────────────────────────────────

export enum ExecutionState {
  Idle = "IDLE",
  Queued = "QUEUED",
  Running = "RUNNING",
  Waiting = "WAITING",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED",
  Skipped = "SKIPPED",
  Timeout = "TIMEOUT",
  Failed = "FAILED",
}

// ── Execution Decision ─────────────────────────────────────────────

export enum ExecutionDecision {
  Continue = "CONTINUE",
  Wait = "WAIT",
  Retry = "RETRY",
  Stop = "STOP",
  Fail = "FAIL",
  Ignore = "IGNORE",
}

// ── Execution Context ──────────────────────────────────────────────

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

// ── Execution Result ───────────────────────────────────────────────

export interface ExecutionResult {
  readonly success: boolean;
  readonly state: ExecutionState;
  readonly decision: ExecutionDecision;
  readonly message: string;
  readonly score: number;
  readonly data: Record<string, unknown>;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// ── Execution Plugin Interface ─────────────────────────────────────

export interface ExecutionPlugin {
  readonly pluginType: string;

  canExecute(context: ExecutionContext): boolean;

  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

// ── Pipeline Stage ─────────────────────────────────────────────────

export type PipelineStage = (
  context: ExecutionContext,
  next: () => Promise<ExecutionResult>,
) => Promise<ExecutionResult>;

// ── Execution Registry Interface ───────────────────────────────────

export interface ExecutionRegistry {
  register(plugin: ExecutionPlugin): void;

  unregister(pluginType: string): void;

  resolve(pluginType: string): ExecutionPlugin | null;

  hasExecutor(pluginType: string): boolean;
}

// ── Execution Pipeline Interface ───────────────────────────────────

export interface ExecutionPipeline {
  addPreStage(stage: PipelineStage): void;

  addPostStage(stage: PipelineStage): void;

  run(context: ExecutionContext, execute: () => Promise<ExecutionResult>): Promise<ExecutionResult>;
}

// ── Execution Engine Interface ─────────────────────────────────────

export interface ExecutionEngine {
  readonly registry: ExecutionRegistry;

  readonly pipeline: ExecutionPipeline;

  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

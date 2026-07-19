import type { ExecutionState } from "./execution-state.enum";
import type { ExecutionDecision } from "./execution-decision.enum";

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

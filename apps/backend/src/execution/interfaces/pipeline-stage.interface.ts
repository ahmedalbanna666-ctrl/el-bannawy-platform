import type { ExecutionContext } from "./execution-context.interface";
import type { ExecutionResult } from "./execution-result.interface";

export type PipelineStage = (
  context: ExecutionContext,
  next: () => Promise<ExecutionResult>,
) => Promise<ExecutionResult>;

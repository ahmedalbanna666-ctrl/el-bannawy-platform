import { ExecutionState, ExecutionDecision, type ExecutionContext, type ExecutionResult, type PipelineStage, type ExecutionPipeline } from "./types";

export function createExecutionPipeline(): ExecutionPipeline {
  const preStages: PipelineStage[] = [];
  const postStages: PipelineStage[] = [];

  return {
    addPreStage(stage: PipelineStage): void {
      preStages.push(stage);
    },

    addPostStage(stage: PipelineStage): void {
      postStages.push(stage);
    },

    async run(context: ExecutionContext, execute: () => Promise<ExecutionResult>): Promise<ExecutionResult> {
      const pipeline = [...preStages, wrapExecute(execute), ...postStages];
      return runPipeline(pipeline, context);
    },
  };
}

function wrapExecute(execute: () => Promise<ExecutionResult>): PipelineStage {
  return async (_context: ExecutionContext, _next: () => Promise<ExecutionResult>): Promise<ExecutionResult> => {
    return execute();
  };
}

async function runPipeline(
  stages: PipelineStage[],
  context: ExecutionContext,
): Promise<ExecutionResult> {
  let index = 0;

  const next = async (): Promise<ExecutionResult> => {
    const stageIndex = index;

    if (stageIndex >= stages.length) {
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Fail,
        message: "Pipeline ended without execution result",
        score: 0,
        data: {},
        errors: ["Pipeline stage index out of bounds"],
        warnings: [],
      };
    }

    index++;

    const currentStage = stages[stageIndex];

    try {
      return await currentStage(context, next);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Fail,
        message: `Pipeline stage failed: ${message}`,
        score: 0,
        data: {},
        errors: [message],
        warnings: [],
      };
    }
  };

  return next();
}

// ── Factory for default stages ─────────────────────────────────────

export function createValidationStage(): PipelineStage {
  return async (ctx: ExecutionContext, nxt: () => Promise<ExecutionResult>): Promise<ExecutionResult> => {
    const errors: string[] = [];

    if (!ctx.videoId) errors.push("videoId is required");
    if (!ctx.eventId) errors.push("eventId is required");
    if (!ctx.pluginType) errors.push("pluginType is required");
    if (!ctx.userId) errors.push("userId is required");

    if (errors.length > 0) {
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Fail,
        message: "Validation failed",
        score: 0,
        data: {},
        errors,
        warnings: [],
      };
    }

    return nxt();
  };
}

export function createPermissionStage(): PipelineStage {
  return async (_ctx: ExecutionContext, nxt: () => Promise<ExecutionResult>): Promise<ExecutionResult> => {
    return nxt();
  };
}

export function createErrorHandlingStage(): PipelineStage {
  return async (ctx: ExecutionContext, nxt: () => Promise<ExecutionResult>): Promise<ExecutionResult> => {
    try {
      return await nxt();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Fail,
        message: `Execution error: ${message}`,
        score: 0,
        data: {},
        errors: [message],
        warnings: [],
      };
    }
  };
}

export function createLoggingStage(): PipelineStage {
  return async (_ctx: ExecutionContext, nxt: () => Promise<ExecutionResult>): Promise<ExecutionResult> => {
    const result = await nxt();
    return result;
  };
}

export function createResultMappingStage(): PipelineStage {
  return async (_ctx: ExecutionContext, nxt: () => Promise<ExecutionResult>): Promise<ExecutionResult> => {
    return nxt();
  };
}

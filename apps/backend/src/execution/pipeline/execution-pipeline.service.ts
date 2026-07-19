import { Injectable, Logger } from "@nestjs/common";
import { ExecutionState, ExecutionDecision, type ExecutionContext, type ExecutionResult, type PipelineStage } from "../interfaces";

@Injectable()
export class ExecutionPipelineService {
  private readonly logger = new Logger(ExecutionPipelineService.name);
  private readonly preStages: PipelineStage[] = [];
  private readonly postStages: PipelineStage[] = [];

  addPreStage(stage: PipelineStage): void {
    this.preStages.push(stage);
  }

  addPostStage(stage: PipelineStage): void {
    this.postStages.push(stage);
  }

  async runPreStages(context: ExecutionContext, execute: () => Promise<ExecutionResult>): Promise<ExecutionResult> {
    const pipeline = [...this.preStages, this.wrapExecute(execute), ...this.postStages];
    return this.runPipeline(pipeline, context);
  }

  private wrapExecute(execute: () => Promise<ExecutionResult>): PipelineStage {
    return async (_context, _next) => {
      return execute();
    };
  }

  private async runPipeline(stages: PipelineStage[], context: ExecutionContext): Promise<ExecutionResult> {
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
        this.logger.error(`Pipeline stage ${String(stageIndex)} failed: ${message}`);
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

  createValidationStage(): PipelineStage {
    return async (ctx, nxt) => {
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

  createPermissionStage(): PipelineStage {
    return async (_ctx, nxt) => {
      return nxt();
    };
  }

  createErrorHandlingStage(): PipelineStage {
    return async (ctx, nxt) => {
      try {
        return await nxt();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Execution failed for plugin "${ctx.pluginType}": ${message}`);
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

  createLoggingStage(): PipelineStage {
    return async (ctx, nxt) => {
      const result = await nxt();
      this.logger.debug(
        `[${ctx.pluginType}] state=${result.state} decision=${result.decision} success=${String(result.success)} message="${result.message}"`,
      );
      return result;
    };
  }

  createResultMappingStage(): PipelineStage {
    return async (_ctx, nxt) => {
      const result = await nxt();
      return result;
    };
  }
}

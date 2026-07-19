import { Injectable, Logger } from "@nestjs/common";
import { ExecutionRegistryService } from "./execution-registry.service";
import { ExecutionPipelineService } from "./pipeline/execution-pipeline.service";
import { ExecutionState, ExecutionDecision, type ExecutionContext, type ExecutionResult } from "./interfaces";

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly registry: ExecutionRegistryService,
    private readonly pipeline: ExecutionPipelineService,
  ) {
    this.pipeline.addPreStage(this.pipeline.createValidationStage());
    this.pipeline.addPreStage(this.pipeline.createPermissionStage());
    this.pipeline.addPostStage(this.pipeline.createResultMappingStage());
    this.pipeline.addPostStage(this.pipeline.createErrorHandlingStage());
    this.pipeline.addPostStage(this.pipeline.createLoggingStage());
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const plugin = this.registry.resolve(context.pluginType);
    if (!plugin) {
      this.logger.warn(`No executor registered for plugin type: "${context.pluginType}"`);
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Ignore,
        message: `No executor found for plugin type: "${context.pluginType}"`,
        score: 0,
        data: {},
        errors: [`Unregistered plugin type: "${context.pluginType}"`],
        warnings: [],
      };
    }
    if (!plugin.canExecute(context)) {
      this.logger.debug(`Plugin "${context.pluginType}" cannot execute for this context`);
      return {
        success: true,
        state: ExecutionState.Skipped,
        decision: ExecutionDecision.Ignore,
        message: `Plugin "${context.pluginType}" skipped execution`,
        score: 0,
        data: {},
        errors: [],
        warnings: [],
      };
    }
    return this.pipeline.runPreStages(context, () => plugin.execute(context));
  }
}

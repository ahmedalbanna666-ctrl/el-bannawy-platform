import { createExecutionRegistry } from "./execution-registry";
import { createExecutionPipeline, createValidationStage, createPermissionStage, createErrorHandlingStage, createLoggingStage, createResultMappingStage } from "./execution-pipeline";
import { ExecutionState, ExecutionDecision, type ExecutionContext, type ExecutionResult, type ExecutionEngine, type ExecutionRegistry, type ExecutionPipeline } from "./types";

export function createExecutionEngine(): ExecutionEngine {
  const registry: ExecutionRegistry = createExecutionRegistry();
  const pipeline: ExecutionPipeline = createExecutionPipeline();

  pipeline.addPreStage(createValidationStage());
  pipeline.addPreStage(createPermissionStage());
  pipeline.addPostStage(createResultMappingStage());
  pipeline.addPostStage(createErrorHandlingStage());
  pipeline.addPostStage(createLoggingStage());

  function execute(context: ExecutionContext): Promise<ExecutionResult> {
    const plugin = registry.resolve(context.pluginType);

    if (!plugin) {
      return Promise.resolve({
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Ignore,
        message: `No executor found for plugin type: "${context.pluginType}"`,
        score: 0,
        data: {},
        errors: [`Unregistered plugin type: "${context.pluginType}"`],
        warnings: [],
      });
    }

    if (!plugin.canExecute(context)) {
      return Promise.resolve({
        success: true,
        state: ExecutionState.Skipped,
        decision: ExecutionDecision.Ignore,
        message: `Plugin "${context.pluginType}" skipped execution`,
        score: 0,
        data: {},
        errors: [],
        warnings: [],
      });
    }

    return pipeline.run(context, () => plugin.execute(context));
  }

  return {
    registry,
    pipeline,
    execute,
  };
}

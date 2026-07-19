import type { ExecutionContext } from "./execution-context.interface";
import type { ExecutionResult } from "./execution-result.interface";

export interface ExecutionPlugin {
  readonly pluginType: string;
  canExecute(context: ExecutionContext): boolean;
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

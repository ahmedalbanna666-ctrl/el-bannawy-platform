import { useCallback, useState } from "react";
import { useExecutionEngine } from "./execution-context";
import {
  ExecutionState,
  type ExecutionContext,
  type ExecutionResult,
  type ExecutionPlugin,
} from "./types";

export function useExecutePlugin(): {
  readonly result: ExecutionResult | null;
  readonly isExecuting: boolean;
  readonly execute: (context: ExecutionContext) => Promise<ExecutionResult>;
} {
  const { execute } = useExecutionEngine();
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const run = useCallback(
    async (context: ExecutionContext): Promise<ExecutionResult> => {
      setIsExecuting(true);
      const executionResult = await execute(context);
      setResult(executionResult);
      setIsExecuting(false);
      return executionResult;
    },
    [execute],
  );

  return { result, isExecuting, execute: run };
}

export function useRegisterPlugin(): {
  readonly register: (plugin: ExecutionPlugin) => void;
  readonly unregister: (pluginType: string) => void;
} {
  const { engine } = useExecutionEngine();

  const register = useCallback(
    (plugin: ExecutionPlugin): void => {
      engine.registry.register(plugin);
    },
    [engine.registry],
  );

  const unregister = useCallback(
    (pluginType: string): void => {
      engine.registry.unregister(pluginType);
    },
    [engine.registry],
  );

  return { register, unregister };
}

export function useExecutionResult(): {
  readonly lastResult: ExecutionResult | null;
  readonly isSuccessful: boolean;
  readonly isFailed: boolean;
  readonly isCompleted: boolean;
} {
  const { lastResult } = useExecutionEngine();

  return {
    lastResult,
    isSuccessful: lastResult?.success ?? false,
    isFailed: lastResult?.state === ExecutionState.Failed,
    isCompleted: lastResult?.state === ExecutionState.Completed,
  };
}

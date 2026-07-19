"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { createExecutionEngine } from "./execution-engine";
import {
  type ExecutionContext,
  type ExecutionResult,
  type ExecutionEngine,
} from "./types";

// ── Context Value ─────────────────────────────────────────────────

export interface ExecutionEngineContextValue {
  readonly engine: ExecutionEngine;
  readonly lastResult: ExecutionResult | null;
  readonly execute: (context: ExecutionContext) => Promise<ExecutionResult>;
}

const ExecutionEngineContext = createContext<ExecutionEngineContextValue | null>(null);

export function useExecutionEngine(): ExecutionEngineContextValue {
  const ctx = useContext(ExecutionEngineContext);
  if (!ctx) {
    throw new Error("useExecutionEngine must be used within ExecutionEngineProvider");
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────

interface ExecutionEngineProviderProps {
  readonly children: ReactNode;
}

export function ExecutionEngineProvider({
  children,
}: ExecutionEngineProviderProps): ReactNode {
  const engineRef = useRef<ExecutionEngine>(createExecutionEngine());
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

  const execute = useCallback(
    async (context: ExecutionContext): Promise<ExecutionResult> => {
      const result = await engineRef.current.execute(context);
      setLastResult(result);
      return result;
    },
    [],
  );

  const ctx: ExecutionEngineContextValue = {
    engine: engineRef.current,
    lastResult,
    execute,
  };

  return (
    <ExecutionEngineContext.Provider value={ctx}>
      {children}
    </ExecutionEngineContext.Provider>
  );
}

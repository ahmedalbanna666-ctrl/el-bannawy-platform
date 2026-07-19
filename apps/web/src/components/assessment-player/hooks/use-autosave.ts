"use client";

import { useCallback, useMemo } from "react";
import { useAssessmentPlayerContext } from "../context/assessment-player-context";
import type { AutosaveState } from "../autosave/autosave-manager";

export interface UseAutosaveResult {
  state: AutosaveState;
  scheduleSave: (questionId: string, answer: unknown) => void;
  saveImmediate: (questionId: string, answer: unknown) => void;
  flush: () => Promise<void>;
  flushAll: () => Promise<void>;
  getPendingCount: () => number;
  getFailedCount: () => number;
}

export function useAutosave(): UseAutosaveResult {
  const context = useAssessmentPlayerContext();

  const state = useMemo<AutosaveState>(
    () => ({
      pendingCount: 0,
      failedCount: 0,
      lastSavedAt: null,
      isSaving: false,
    }),
    [],
  );

  const scheduleSave = useCallback((questionId: string, answer: unknown): void => {
    context.saveAnswer(questionId, answer);
  }, [context.saveAnswer]);

  const saveImmediate = useCallback((questionId: string, answer: unknown): void => {
    context.saveAnswer(questionId, answer);
  }, [context.saveAnswer]);

  const flush = useCallback(async (): Promise<void> => {
    /* Autosave flush is handled by the engine internally */
  }, []);

  const flushAll = useCallback(async (): Promise<void> => {
    /* Autosave flush is handled by the engine internally */
  }, []);

  const getPendingCount = useCallback((): number => {
    return state.pendingCount;
  }, [state.pendingCount]);

  const getFailedCount = useCallback((): number => {
    return state.failedCount;
  }, [state.failedCount]);

  return {
    state,
    scheduleSave,
    saveImmediate,
    flush,
    flushAll,
    getPendingCount,
    getFailedCount,
  };
}

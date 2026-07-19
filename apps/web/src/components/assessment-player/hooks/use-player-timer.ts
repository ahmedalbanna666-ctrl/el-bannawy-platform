"use client";

import { useMemo } from "react";
import { useAssessmentPlayerContext } from "../context/assessment-player-context";

export interface UsePlayerTimerResult {
  remainingSeconds: number | null;
  isUnlimited: boolean;
  isRunning: boolean;
  isExpired: boolean;
  elapsedSeconds: number;
  warningThreshold: number;
}

export function usePlayerTimer(): UsePlayerTimerResult {
  const context = useAssessmentPlayerContext();

  const remainingSeconds = context.remainingTime;

  return useMemo<UsePlayerTimerResult>(() => {
    const safeRemaining: number = remainingSeconds === null ? 0 : remainingSeconds; // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing

    return {
      remainingSeconds,
      isUnlimited: remainingSeconds === null,
      isRunning: remainingSeconds !== null && safeRemaining > 0,
      isExpired: safeRemaining <= 0,
      elapsedSeconds: 0,
      warningThreshold: 300,
    };
  }, [remainingSeconds]);
}

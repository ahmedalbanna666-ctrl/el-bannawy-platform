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

  const timerState = context.timerState;

  return useMemo<UsePlayerTimerResult>(() => {
    const remainingSeconds = timerState?.remainingSeconds ?? null;
    const elapsedSeconds = timerState?.elapsedSeconds ?? 0;

    return {
      remainingSeconds,
      isUnlimited: remainingSeconds === null,
      isRunning: timerState?.isRunning ?? false,
      isExpired: timerState?.isExpired ?? false,
      elapsedSeconds,
      warningThreshold: 300,
    };
  }, [timerState]);
}

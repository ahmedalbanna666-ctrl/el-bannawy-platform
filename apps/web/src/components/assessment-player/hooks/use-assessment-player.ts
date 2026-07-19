"use client";

import { useMemo } from "react";
import { useAssessmentPlayerContext } from "../context/assessment-player-context";
import {
  PlayerState,
  NavigationDirection,
  type PlayerQuestion,
  type PlayerSection,
  type PlayerProgress,
  type AnswerRecord,
} from "../types/player-types";

export interface UseAssessmentPlayerResult {
  state: PlayerState;
  config: Readonly<Record<string, unknown>>;
  attemptId: string;
  assessmentId: string;
  currentQuestion: PlayerQuestion | null;
  currentQuestionIndex: number;
  currentSection: PlayerSection | null;
  questions: readonly PlayerQuestion[];
  sections: readonly PlayerSection[];
  progress: PlayerProgress;
  remainingTime: number | null;
  visitedQuestions: readonly string[];
  answeredQuestions: readonly string[];
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  isActive: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isCompleted: boolean;
  isExpired: boolean;
  isLocked: boolean;
  isError: boolean;

  start: () => void;
  pause: () => void;
  resume: () => void;
  submit: () => Promise<void>;
  goToNext: () => boolean;
  goToPrevious: () => boolean;
  jumpToQuestion: (questionId: string) => boolean;
  jumpToSection: (sectionId: string) => boolean;
  goToFirstUnanswered: () => boolean;
  goToLastAnswered: () => boolean;
  saveAnswer: (questionId: string, answer: unknown) => void;
  getAnswer: (questionId: string) => AnswerRecord | undefined;
  hasAnswered: (questionId: string) => boolean;
}

export function useAssessmentPlayer(): UseAssessmentPlayerResult {
  const context = useAssessmentPlayerContext();

  return useMemo<UseAssessmentPlayerResult>(() => {
    const toBool = (result: { success: boolean }): boolean => result.success;

    return {
      state: context.state,
      config: context.config as unknown as Readonly<Record<string, unknown>>,
      attemptId: context.attemptId,
      assessmentId: context.assessmentId,
      currentQuestion: context.currentQuestion,
      currentQuestionIndex: context.questions.findIndex(
        (q) => q.id === context.currentQuestion?.id,
      ),
      currentSection: context.currentSection,
      questions: context.questions,
      sections: context.sections,
      progress: context.progress,
      remainingTime: context.remainingTime,
      visitedQuestions: context.visitedQuestions,
      answeredQuestions: context.answeredQuestions,
      error: context.error,
      isLoading: context.state === PlayerState.Loading,
      isReady: context.state === PlayerState.Ready,
      isActive:
        context.state === PlayerState.InProgress ||
        context.state === PlayerState.Paused,
      isSubmitting: context.state === PlayerState.Submitting,
      isSubmitted: context.state === PlayerState.Submitted,
      isCompleted: context.state === PlayerState.Completed,
      isExpired: context.state === PlayerState.Expired,
      isLocked: context.state === PlayerState.Locked,
      isError: context.state === PlayerState.Error,

      start: context.start,
      pause: context.pause,
      resume: context.resume,
      submit: context.submit,
      goToNext: () => toBool(context.goToNext()),
      goToPrevious: () => toBool(context.goToPrevious()),
      jumpToQuestion: (questionId: string) => toBool(context.jumpToQuestion(questionId)),
      jumpToSection: (sectionId: string) => toBool(context.jumpToSection(sectionId)),
      goToFirstUnanswered: () => toBool(context.goToFirstUnanswered()),
      goToLastAnswered: () => toBool(context.goToLastAnswered()),
      saveAnswer: context.saveAnswer,
      getAnswer: context.getAnswer,
      hasAnswered: context.hasAnswered,
    };
  }, [context]);
}

export { NavigationDirection };

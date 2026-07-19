"use client";

import { useCallback, useMemo } from "react";
import { useAssessmentPlayerContext } from "../context/assessment-player-context";
import {
  NavigationDirection,
  type PlayerQuestion,
  type PlayerSection,
  type NavigationResult,
} from "../types/player-types";

export interface UseQuestionNavigationResult {
  currentQuestion: PlayerQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentSection: PlayerSection | null;
  sections: readonly PlayerSection[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  hasUnanswered: boolean;
  hasAnswered: boolean;

  goToNext: () => NavigationResult;
  goToPrevious: () => NavigationResult;
  jumpToQuestion: (questionId: string) => NavigationResult;
  jumpToSection: (sectionId: string) => NavigationResult;
  goToFirstUnanswered: () => NavigationResult;
  goToLastAnswered: () => NavigationResult;
}

export function useQuestionNavigation(): UseQuestionNavigationResult {
  const context = useAssessmentPlayerContext();

  const goToNext = useCallback((): NavigationResult => {
    return context.goToNext();
  }, [context]);

  const goToPrevious = useCallback((): NavigationResult => {
    return context.goToPrevious();
  }, [context]);

  const jumpToQuestion = useCallback((questionId: string): NavigationResult => {
    return context.jumpToQuestion(questionId);
  }, [context]);

  const jumpToSection = useCallback((sectionId: string): NavigationResult => {
    return context.jumpToSection(sectionId);
  }, [context]);

  const goToFirstUnanswered = useCallback((): NavigationResult => {
    return context.goToFirstUnanswered();
  }, [context]);

  const goToLastAnswered = useCallback((): NavigationResult => {
    return context.goToLastAnswered();
  }, [context]);

  return useMemo<UseQuestionNavigationResult>(() => {
    const totalQuestions = context.questions.length;
    const currentIndex = context.questions.findIndex(
      (q) => q.id === context.currentQuestion?.id,
    );
    const hasNext = currentIndex >= 0 && currentIndex < totalQuestions - 1;
    const hasPrevious = currentIndex > 0;
    const unansweredQuestions = context.questions.filter(
      (q) => !context.answeredQuestions.includes(q.id),
    );
    const answeredQuestions = context.questions.filter((q) =>
      context.answeredQuestions.includes(q.id),
    );

    return {
      currentQuestion: context.currentQuestion,
      currentQuestionIndex: currentIndex,
      totalQuestions,
      currentSection: context.currentSection,
      sections: context.sections,
      canGoNext: hasNext,
      canGoPrevious: hasPrevious,
      hasNext,
      hasPrevious,
      hasUnanswered: unansweredQuestions.length > 0,
      hasAnswered: answeredQuestions.length > 0,

      goToNext,
      goToPrevious,
      jumpToQuestion,
      jumpToSection,
      goToFirstUnanswered,
      goToLastAnswered,
    };
  }, [context, goToNext, goToPrevious, jumpToQuestion, jumpToSection, goToFirstUnanswered, goToLastAnswered]);
}

export { NavigationDirection };

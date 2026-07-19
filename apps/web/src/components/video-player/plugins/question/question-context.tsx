"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useEventEngine } from "../../event-engine/event-context";
import { createQuestionHandler } from "./question-handler";
import type { QuestionData, QuestionResult } from "./types";

export interface QuestionPluginContextValue {
  readonly currentQuestion: QuestionData | null;
  readonly lastResult: QuestionResult | null;
  readonly showQuestion: (question: QuestionData) => void;
  readonly clearQuestion: () => void;
  readonly setResult: (result: QuestionResult) => void;
}

const QuestionPluginContext = createContext<QuestionPluginContextValue | null>(null);

export function useQuestionPlugin(): QuestionPluginContextValue {
  const ctx = useContext(QuestionPluginContext);
  if (!ctx) {
    throw new Error("useQuestionPlugin must be used within QuestionPluginProvider");
  }
  return ctx;
}

interface QuestionPluginProviderProps {
  readonly children: ReactNode;
}

export function QuestionPluginProvider({
  children,
}: QuestionPluginProviderProps): ReactNode {
  const { registerHandler } = useEventEngine();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [lastResult, setLastResult] = useState<QuestionResult | null>(null);

  useEffect(() => {
    const handler = createQuestionHandler({
      onTrigger: (question: QuestionData): void => {
        setCurrentQuestion(question);
        setLastResult(null);
      },
    });
    registerHandler(handler);
  }, [registerHandler]);

  const showQuestion = useCallback((question: QuestionData): void => {
    setCurrentQuestion(question);
    setLastResult(null);
  }, []);

  const clearQuestion = useCallback((): void => {
    setCurrentQuestion(null);
  }, []);

  const setResult = useCallback((result: QuestionResult): void => {
    setLastResult(result);
  }, []);

  const ctx: QuestionPluginContextValue = {
    currentQuestion,
    lastResult,
    showQuestion,
    clearQuestion,
    setResult,
  };

  return (
    <QuestionPluginContext.Provider value={ctx}>
      {children}
    </QuestionPluginContext.Provider>
  );
}

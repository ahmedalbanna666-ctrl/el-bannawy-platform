import { useCallback, useState } from "react";
import { useQuestionPlugin } from "./question-context";
import { executeQuestion } from "./question-executor";
import type { QuestionData, QuestionAnswer, QuestionResult } from "./types";

export function useQuestionAnswer(): {
  readonly result: QuestionResult | null;
  readonly submitAnswer: (question: QuestionData, answer: QuestionAnswer) => void;
} {
  const [result, setResult] = useState<QuestionResult | null>(null);

  const submitAnswer = useCallback(
    (question: QuestionData, answer: QuestionAnswer): void => {
      const executionResult = executeQuestion(question, answer);
      setResult(executionResult);
    },
    [],
  );

  return { result, submitAnswer };
}

export function useQuestionData(): {
  readonly currentQuestion: QuestionData | null;
} {
  const { currentQuestion } = useQuestionPlugin();
  return { currentQuestion };
}

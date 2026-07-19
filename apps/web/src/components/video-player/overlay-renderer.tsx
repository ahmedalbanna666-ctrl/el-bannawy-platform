"use client";

import { type ReactNode } from "react";
import { useQuestionPlugin } from "./plugins/question/question-context";
import { QuestionOverlay } from "./plugins/question/question-overlay";

export function OverlayRenderer(): ReactNode {
  const { currentQuestion, clearQuestion } = useQuestionPlugin();

  if (!currentQuestion) return null;

  return <QuestionOverlay question={currentQuestion} onDismiss={clearQuestion} />;
}

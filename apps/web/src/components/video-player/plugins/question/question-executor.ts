import { validateQuestion } from "./question-validator";
import type { QuestionData, QuestionAnswer, QuestionResult } from "./types";

export function executeQuestion(
  question: QuestionData,
  answer: QuestionAnswer,
): QuestionResult {
  const validation = validateQuestion(question as never, answer);

  return {
    questionId: question.id,
    correct: validation.correct,
    score: validation.score,
    maxScore: validation.maxScore,
    message: validation.correct
      ? "Correct"
      : validation.errors[0] ?? "Incorrect",
  };
}

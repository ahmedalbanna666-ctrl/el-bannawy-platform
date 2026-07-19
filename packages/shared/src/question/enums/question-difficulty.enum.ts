export const QuestionDifficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;

export type QuestionDifficulty = (typeof QuestionDifficulty)[keyof typeof QuestionDifficulty];

export const QuestionStatus = {
  VALID: "VALID",
  WARNING: "WARNING",
  INVALID: "INVALID",
} as const;

export type QuestionStatus = (typeof QuestionStatus)[keyof typeof QuestionStatus];

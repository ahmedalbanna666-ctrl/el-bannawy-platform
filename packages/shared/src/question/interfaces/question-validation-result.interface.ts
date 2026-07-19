import type { QuestionStatus } from "../enums/question-status.enum";

export interface QuestionValidationError {
  readonly code: string;
  readonly message: string;
  readonly field: string | null;
}

export interface QuestionValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly field: string | null;
}

export interface QuestionValidationResult {
  readonly status: QuestionStatus;
  readonly errors: readonly QuestionValidationError[];
  readonly warnings: readonly QuestionValidationWarning[];
}

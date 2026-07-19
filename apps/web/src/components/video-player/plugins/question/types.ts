export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "FILL_BLANK"
  | "MATCHING"
  | "ORDERING";

export interface QuestionData {
  readonly id: string;
  readonly videoEventId: string;
  readonly type: QuestionType;
  readonly title: string;
  readonly instructions: string | null;
  readonly displayOrder: number;
  readonly metadata: Record<string, unknown>;
  readonly options: readonly QuestionOptionData[];
}

export interface QuestionOptionData {
  readonly id: string;
  readonly questionId: string;
  readonly text: string;
  readonly displayOrder: number;
  readonly metadata: Record<string, unknown>;
}

export interface QuestionAnswer {
  readonly questionId: string;
  readonly selectedOptionIds: readonly string[];
  readonly text?: string;
}

export interface QuestionResult {
  readonly questionId: string;
  readonly correct: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly message: string | null;
}

export interface QuestionValidationResult {
  readonly isValid: boolean;
  readonly correct: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: readonly string[];
}

export interface QuestionExecutionContext {
  readonly userId: string;
  readonly questionId: string;
  readonly videoEventId: string;
}

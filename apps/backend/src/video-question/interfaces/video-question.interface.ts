export type VideoQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "FILL_BLANK" | "MATCHING" | "ORDERING";

export interface IVideoQuestion {
  readonly id: string;
  readonly videoEventId: string;
  readonly type: VideoQuestionType;
  readonly title: string;
  readonly instructions: string | null;
  readonly displayOrder: number;
  readonly metadata: Record<string, unknown>;
  readonly options: readonly IVideoQuestionOption[];
}

export interface IVideoQuestionOption {
  readonly id: string;
  readonly questionId: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly displayOrder: number;
  readonly metadata: Record<string, unknown>;
}

export interface IVideoQuestionOptionPublic {
  readonly id: string;
  readonly questionId: string;
  readonly text: string;
  readonly displayOrder: number;
  readonly metadata: Record<string, unknown>;
}

export interface IVideoQuestionPublic {
  readonly id: string;
  readonly videoEventId: string;
  readonly type: VideoQuestionType;
  readonly title: string;
  readonly instructions: string | null;
  readonly displayOrder: number;
  readonly metadata: Record<string, unknown>;
  readonly options: readonly IVideoQuestionOptionPublic[];
}

export interface IVideoQuestionAnswer {
  readonly questionId: string;
  readonly selectedOptionIds: readonly string[];
  readonly text?: string;
}

export interface IVideoQuestionResult {
  readonly questionId: string;
  readonly correct: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly message: string | null;
}

export interface IVideoQuestionValidationResult {
  readonly isValid: boolean;
  readonly correct: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly errors: readonly string[];
}

export interface IVideoQuestionExecutionContext {
  readonly userId: string;
  readonly questionId: string;
  readonly videoEventId: string;
}

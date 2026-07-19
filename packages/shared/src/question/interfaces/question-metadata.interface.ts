import type { QuestionDifficulty } from "../enums/question-difficulty.enum";

export interface QuestionMetadata {
  readonly difficulty: QuestionDifficulty | null;
  readonly estimatedDurationSeconds: number | null;
  readonly tags: readonly string[];
  readonly category: string | null;
  readonly source: string | null;
  readonly language: string | null;
  readonly aiGenerated: boolean;
  readonly aiModel: string | null;
}

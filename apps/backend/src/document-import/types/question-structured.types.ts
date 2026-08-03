import type { QuestionPreviewType, QuestionPreviewStatus, QuestionPreviewCounts } from "./question-preview.types";

export interface QuestionCommitOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionCommitItem {
  clientDraftId: string;
  groupId: string;
  questionType: QuestionPreviewType;
  prompt: string;
  instruction?: string | null;
  explanation?: string | null;
  options: QuestionCommitOption[];
  correctAnswer?: string | null;
  acceptableAnswers?: string[];
  passageText?: string | null;
  displayOrder: number;
  status: QuestionPreviewStatus;
  warnings?: string[];
  errors?: string[];
}

export interface QuestionCommitGroup {
  id: string;
  title: string;
  displayOrder: number;
  items: QuestionCommitItem[];
}

export interface QuestionStructuredDraft {
  parserProfile: string;
  counts?: QuestionPreviewCounts;
  groups: QuestionCommitGroup[];
  warnings?: string[];
  errors?: string[];
}

export interface QuestionPersistenceResult {
  lessonId: string;
  groupCount: number;
  questionCount: number;
  groups: { id: string; title: string; count: number }[];
}

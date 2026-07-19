export type QuestionPreviewStatus = "VALID" | "WARNING" | "INVALID";

export type QuestionPreviewType =
  | "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "GRAMMAR"
  | "READING" | "READING_QUESTION" | "DIALOGUE" | "DIALOGUE_QUESTION"
  | "PARAGRAPH" | "WRITING" | "MATCHING" | "ORDERING"
  | "DRAG_DROP" | "SHORT_ANSWER" | "ESSAY" | "UNKNOWN";

export interface QuestionPreviewOption {
  readonly label: string;
  readonly text: string;
  readonly isCorrect: boolean;
}

export interface QuestionPreviewItem {
  readonly clientDraftId: string;
  readonly sourceParagraphIndex: number;
  readonly sourceTableIndex: number | null;
  readonly displayOrder: number;
  readonly questionType: QuestionPreviewType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly options: readonly QuestionPreviewOption[];
  readonly correctAnswer: string | null;
  readonly acceptableAnswers: readonly string[];
  readonly passageText: string | null;
  readonly status: QuestionPreviewStatus;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly groupId: string;
}

export interface QuestionPreviewGroup {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly items: readonly QuestionPreviewItem[];
}

export interface QuestionPreviewCounts {
  readonly total: number;
  readonly valid: number;
  readonly warning: number;
  readonly invalid: number;
}

export interface QuestionImportPreview {
  readonly parserProfile: string;
  readonly counts: QuestionPreviewCounts;
  readonly groups: readonly QuestionPreviewGroup[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export type QuestionGroupAction = "expanded" | "collapsed";

export interface EditableQuestionItem {
  clientDraftId: string;
  questionType: QuestionPreviewType;
  prompt: string;
  instruction: string | null;
  explanation: string | null;
  options: QuestionPreviewOption[];
  correctAnswer: string | null;
  acceptableAnswers: string[];
  passageText: string | null;
  status: QuestionPreviewStatus;
  warnings: string[];
  errors: string[];
  groupId: string;
  displayOrder: number;
  isSelected: boolean;
}

export interface EditableQuestionGroup {
  id: string;
  title: string;
  displayOrder: number;
  items: EditableQuestionItem[];
  isExpanded: boolean;
}

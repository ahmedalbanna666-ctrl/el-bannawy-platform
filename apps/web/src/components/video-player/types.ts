export interface VideoEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
  readonly enabled: boolean;
  readonly displayOrder: number;
  readonly payload: Record<string, unknown>;
}

export interface QuestionData {
  readonly id: string;
  readonly videoEventId: string;
  readonly type: string;
  readonly title: string;
  readonly instructions: string | null;
  readonly options: readonly { id: string; text: string; displayOrder: number }[];
}

export interface LessonCompletedActions {
  readonly onNextLesson?: () => void;
  readonly onReviewQuestions?: () => void;
  readonly onHomework?: () => void;
  readonly onBackToUnit?: () => void;
}

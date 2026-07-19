export enum PlayerState {
  Loading = "Loading",
  Ready = "Ready",
  Started = "Started",
  InProgress = "InProgress",
  Paused = "Paused",
  Submitting = "Submitting",
  Submitted = "Submitted",
  Completed = "Completed",
  Expired = "Expired",
  Locked = "Locked",
  Error = "Error",
}

export enum NavigationDirection {
  Next = "Next",
  Previous = "Previous",
  JumpToQuestion = "JumpToQuestion",
  JumpToSection = "JumpToSection",
  FirstUnanswered = "FirstUnanswered",
  LastAnswered = "LastAnswered",
}

export interface PlayerQuestion {
  id: string;
  sectionId: string;
  type: string;
  title: string;
  order: number;
  points: number;
  config: Record<string, unknown> | null;
}

export interface PlayerSection {
  id: string;
  title: string;
  order: number;
  questionIds: readonly string[];
}

export interface AnswerRecord {
  questionId: string;
  answer: unknown;
  isSaved: boolean;
  savedAt: string | null;
}

export interface PlayerProgress {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  visitedQuestions: number;
  completionPercentage: number;
}

export interface PlayerConfig {
  allowNavigation: boolean;
  allowPause: boolean;
  showProgress: boolean;
  showTimer: boolean;
  timeLimitSeconds: number | null;
  passingScore: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface NavigationResult {
  success: boolean;
  question: PlayerQuestion | null;
  error: string | null;
}

export interface LoadAttemptData {
  attemptId: string;
  assessmentId: string;
  status: string;
  questions: readonly PlayerQuestion[];
  sections: readonly PlayerSection[];
  answers: readonly AnswerRecord[];
  config: PlayerConfig;
  remainingTimeSeconds: number | null;
  startedAt: string;
}

export interface SubmitResultData {
  attemptId: string;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  status: string;
}

export interface SaveAnswerData {
  questionId: string;
  answer: unknown;
  savedAt: string;
}

export interface AssessmentPlayerContextValue {
  state: PlayerState;
  config: PlayerConfig;
  attemptId: string;
  assessmentId: string;
  currentQuestion: PlayerQuestion | null;
  currentSection: PlayerSection | null;
  questions: readonly PlayerQuestion[];
  sections: readonly PlayerSection[];
  progress: PlayerProgress;
  remainingTime: number | null;
  visitedQuestions: readonly string[];
  answeredQuestions: readonly string[];
  error: string | null;

  start: () => void;
  pause: () => void;
  resume: () => void;
  submit: () => Promise<void>;
  goToNext: () => NavigationResult;
  goToPrevious: () => NavigationResult;
  jumpToQuestion: (questionId: string) => NavigationResult;
  jumpToSection: (sectionId: string) => NavigationResult;
  goToFirstUnanswered: () => NavigationResult;
  goToLastAnswered: () => NavigationResult;
  saveAnswer: (questionId: string, answer: unknown) => void;
  getAnswer: (questionId: string) => AnswerRecord | undefined;
  hasAnswered: (questionId: string) => boolean;
}

export interface PlayerError {
  code: string;
  message: string;
  details?: unknown;
}

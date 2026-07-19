import {
  PlayerState,
  NavigationDirection,
  type PlayerQuestion,
  type PlayerSection,
  type AnswerRecord,
  type PlayerProgress,
  type PlayerConfig,
  type NavigationResult,
  type PlayerError,
} from "../types/player-types";
import {
  PLAYER_STATE_TRANSITIONS,
  PLAYER_ERROR_CODES,
} from "../constants/player-constants";
import {
  PlayerEventEmitter,
  PlayerEventType,
} from "../events/player-events";
import { PlayerTimer, type TimerState } from "../timer/player-timer";
import { AutosaveManager, type AutosaveState, type SaveFunction } from "../autosave/autosave-manager";

export class AssessmentPlayerEngine {
  private _state: PlayerState = PlayerState.Loading;
  private _questions: readonly PlayerQuestion[] = [];
  private _sections: readonly PlayerSection[] = [];
  private _answers = new Map<string, AnswerRecord>();
  private _visitedQuestions = new Set<string>();
  private _currentQuestionIndex = 0;
  private _attemptId = "";
  private _assessmentId = "";
  private _config: PlayerConfig | null = null;
  private _error: PlayerError | null = null;
  private readonly _eventEmitter = new PlayerEventEmitter();
  private _timer: PlayerTimer | null = null;
  private _autosave: AutosaveManager | null = null;

  get state(): PlayerState {
    return this._state;
  }

  get questions(): readonly PlayerQuestion[] {
    return this._questions;
  }

  get sections(): readonly PlayerSection[] {
    return this._sections;
  }

  get currentQuestion(): PlayerQuestion | null {
    if (this._questions.length === 0) return null;
    return this._questions[this._currentQuestionIndex] ?? null;
  }

  get currentSection(): PlayerSection | null {
    const question = this.currentQuestion;
    if (!question) return null;
    return this._sections.find((s) => s.id === question.sectionId) ?? null;
  }

  get currentQuestionIndex(): number {
    return this._currentQuestionIndex;
  }

  get attemptId(): string {
    return this._attemptId;
  }

  get assessmentId(): string {
    return this._assessmentId;
  }

  get config(): PlayerConfig | null {
    return this._config;
  }

  get error(): PlayerError | null {
    return this._error;
  }

  get answers(): ReadonlyMap<string, AnswerRecord> {
    return this._answers;
  }

  get visitedQuestions(): readonly string[] {
    return Array.from(this._visitedQuestions);
  }

  get answeredQuestions(): readonly string[] {
    const answered: string[] = [];
    for (const [questionId, record] of this._answers) {
      if (record.isSaved) {
        answered.push(questionId);
      }
    }
    return answered;
  }

  get eventEmitter(): PlayerEventEmitter {
    return this._eventEmitter;
  }

  get timer(): PlayerTimer | null {
    return this._timer;
  }

  get autosave(): AutosaveManager | null {
    return this._autosave;
  }

  get timerState(): TimerState | null {
    return this._timer?.state ?? null;
  }

  get autosaveState(): AutosaveState | null {
    return this._autosave?.state ?? null;
  }

  initializeServices(saveFunction: SaveFunction): void {
    this._timer = new PlayerTimer(this._eventEmitter);
    this._autosave = new AutosaveManager(this._eventEmitter, saveFunction);
  }

  getProgress(): PlayerProgress {
    const totalQuestions = this._questions.length;
    const answeredQuestions = this.answeredQuestions.length;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    const visitedQuestions = this._visitedQuestions.size;
    const completionPercentage = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

    return {
      totalQuestions,
      answeredQuestions,
      unansweredQuestions,
      visitedQuestions,
      completionPercentage,
    };
  }

  getAnswer(questionId: string): AnswerRecord | undefined {
    return this._answers.get(questionId);
  }

  hasAnswered(questionId: string): boolean {
    return this._answers.get(questionId)?.isSaved ?? false;
  }

  initialize(data: {
    attemptId: string;
    assessmentId: string;
    questions: readonly PlayerQuestion[];
    sections: readonly PlayerSection[];
    answers: readonly AnswerRecord[];
    config: PlayerConfig;
  }): void {
    this.validateStateForInitialize();

    this._attemptId = data.attemptId;
    this._assessmentId = data.assessmentId;
    this._questions = data.questions;
    this._sections = data.sections;
    this._config = data.config;

    for (const answer of data.answers) {
      this._answers.set(answer.questionId, answer);
      if (answer.isSaved) {
        this.markVisited(answer.questionId);
      }
    }

    if (this._questions.length > 0) {
      this.markVisited(this._questions[0].id);
    }

    this.transitionTo(PlayerState.Ready);
  }

  start(): void {
    this.validateStateForStart();
    this.transitionTo(PlayerState.InProgress);
    this._timer?.start();
    this._eventEmitter.emit({
      type: PlayerEventType.PlayerStarted,
      payload: { attemptId: this._attemptId, assessmentId: this._assessmentId },
    });
  }

  pause(): void {
    this.validateStateForPause();
    this._timer?.pause();
    this.transitionTo(PlayerState.Paused);
  }

  resume(): void {
    this.validateStateForResume();
    this._timer?.resume();
    this.transitionTo(PlayerState.InProgress);
  }

  submit(): void {
    this.validateStateForSubmit();
    this.transitionTo(PlayerState.Submitting);
  }

  async flushAutosave(): Promise<void> {
    await this._autosave?.flushAll();
  }

  markSubmitSuccess(score: number | null, passed: boolean | null): void {
    if (this._state !== PlayerState.Submitting) {
      this.handleError("INVALID_TRANSITION", "Cannot mark submit success when not submitting");
      return;
    }
    this._timer?.stop();
    this.transitionTo(PlayerState.Submitted);
    this._eventEmitter.emit({
      type: PlayerEventType.PlayerSubmitted,
      payload: { attemptId: this._attemptId, score, passed },
    });
  }

  markSubmitError(): void {
    if (this._state !== PlayerState.Submitting) return;
    this.transitionTo(PlayerState.InProgress);
  }

  complete(score: number | null, passed: boolean | null): void {
    if (this._state !== PlayerState.Submitted) {
      this.handleError("INVALID_TRANSITION", "Cannot complete when not submitted");
      return;
    }
    this._timer?.stop();
    this.transitionTo(PlayerState.Completed);
    this._eventEmitter.emit({
      type: PlayerEventType.PlayerCompleted,
      payload: { attemptId: this._attemptId, score, passed },
    });
  }

  expire(): void {
    this.validateStateForExpire();
    const fromState = this._state;
    this._timer?.stop();
    this.transitionTo(PlayerState.Expired);
    this._eventEmitter.emit({
      type: PlayerEventType.PlayerExpired,
      payload: { attemptId: this._attemptId },
    });

    if (fromState === PlayerState.InProgress) {
      this._eventEmitter.emit({
        type: PlayerEventType.PlayerSubmitted,
        payload: { attemptId: this._attemptId, score: null, passed: null },
      });
    }
  }

  synchronizeTimer(remainingSeconds: number): void {
    this._timer?.synchronize(remainingSeconds);
  }

  lock(): void {
    this.transitionTo(PlayerState.Locked);
  }

  setError(code: string, message: string): void {
    this.transitionTo(PlayerState.Error);
    this._error = { code, message };
    this._eventEmitter.emit({
      type: PlayerEventType.PlayerError,
      payload: { code, message },
    });
  }

  handleError(code: string, message: string): void {
    if (this._state === PlayerState.Error) return;
    this._error = { code, message };
    this._eventEmitter.emit({
      type: PlayerEventType.PlayerError,
      payload: { code, message },
    });
  }

  navigate(direction: NavigationDirection, target?: string): NavigationResult {
    if (this._state !== PlayerState.InProgress) {
      return {
        success: false,
        question: null,
        error: "Navigation is only allowed during InProgress state",
      };
    }

    if (!this._config?.allowNavigation && direction !== NavigationDirection.Next) {
      return {
        success: false,
        question: null,
        error: "Navigation is disabled",
      };
    }

    const question = this.calculateNavigationTarget(direction, target);
    if (!question) {
      return {
        success: false,
        question: null,
        error: this.getNavigationError(direction),
      };
    }

    const newIndex = this._questions.findIndex((q) => q.id === question.id);
    if (newIndex === -1) {
      return {
        success: false,
        question: null,
        error: "Question not found",
      };
    }

    this._currentQuestionIndex = newIndex;
    this.markVisited(question.id);

    this._eventEmitter.emit({
      type: PlayerEventType.QuestionChanged,
      payload: { questionId: question.id, sectionId: question.sectionId },
    });

    return { success: true, question, error: null };
  }

  setAnswer(questionId: string, answer: unknown): void {
    const existing = this._answers.get(questionId);
    this._answers.set(questionId, {
      questionId,
      answer,
      isSaved: existing?.isSaved ?? false,
      savedAt: existing?.savedAt ?? null,
    });
    this._autosave?.scheduleSave(this._attemptId, questionId, answer);
  }

  markAnswerSaved(questionId: string): void {
    const existing = this._answers.get(questionId);
    if (existing) {
      this._answers.set(questionId, {
        ...existing,
        isSaved: true,
        savedAt: new Date().toISOString(),
      });
    }
    this._eventEmitter.emit({
      type: PlayerEventType.AnswerSaved,
      payload: { questionId, answer: existing?.answer, savedAt: new Date().toISOString() },
    });
  }

  queueAnswerSave(questionId: string, answer: unknown): void {
    this._autosave?.scheduleSave(this._attemptId, questionId, answer);
  }

  saveAnswerImmediate(questionId: string, answer: unknown): void {
    this._autosave?.saveImmediate(this._attemptId, questionId, answer);
  }

  markAutosaveComplete(questionId: string, savedAt: string): void {
    this._eventEmitter.emit({
      type: PlayerEventType.AutosaveCompleted,
      payload: { questionId, savedAt },
    });
  }

  reset(): void {
    this._state = PlayerState.Loading;
    this._questions = [];
    this._sections = [];
    this._answers = new Map();
    this._visitedQuestions = new Set();
    this._currentQuestionIndex = 0;
    this._attemptId = "";
    this._assessmentId = "";
    this._config = null;
    this._error = null;
    this._eventEmitter.removeAll();
  }

  private calculateNavigationTarget(
    direction: NavigationDirection,
    target?: string,
  ): PlayerQuestion | null {
    switch (direction) {
      case NavigationDirection.Next: {
        const nextIndex = this._currentQuestionIndex + 1;
        if (nextIndex < this._questions.length) {
          return this._questions[nextIndex];
        }
        return null;
      }
      case NavigationDirection.Previous: {
        const prevIndex = this._currentQuestionIndex - 1;
        if (prevIndex >= 0) {
          return this._questions[prevIndex];
        }
        return null;
      }
      case NavigationDirection.JumpToQuestion: {
        if (!target) return null;
        return this._questions.find((q) => q.id === target) ?? null;
      }
      case NavigationDirection.JumpToSection: {
        if (!target) return null;
        const section = this._sections.find((s) => s.id === target);
        if (!section || section.questionIds.length === 0) return null;
        const firstQuestionId = section.questionIds[0];
        return this._questions.find((q) => q.id === firstQuestionId) ?? null;
      }
      case NavigationDirection.FirstUnanswered: {
        for (const question of this._questions) {
          if (!this.hasAnswered(question.id)) {
            return question;
          }
        }
        return null;
      }
      case NavigationDirection.LastAnswered: {
        const answered = this.answeredQuestions;
        if (answered.length === 0) return null;
        const lastId = answered[answered.length - 1];
        return this._questions.find((q) => q.id === lastId) ?? null;
      }
      default:
        return null;
    }
  }

  private markVisited(questionId: string): void {
    this._visitedQuestions.add(questionId);
  }

  private getNavigationError(direction: NavigationDirection): string {
    switch (direction) {
      case NavigationDirection.Next:
        return "Already at the last question";
      case NavigationDirection.Previous:
        return "Already at the first question";
      case NavigationDirection.FirstUnanswered:
        return "All questions have been answered";
      case NavigationDirection.LastAnswered:
        return "No questions have been answered yet";
      default:
        return "Navigation target not found";
    }
  }

  private validateStateForInitialize(): void {
    if (this._state !== PlayerState.Loading) {
      throw new Error("Engine must be in Loading state to initialize");
    }
  }

  private validateStateForStart(): void {
    if (this._state !== PlayerState.Ready) {
      throw new Error("Engine must be in Ready state to start");
    }
    if (this._questions.length === 0) {
      throw new Error("Cannot start with no questions");
    }
  }

  private validateStateForPause(): void {
    if (this._state !== PlayerState.InProgress) {
      throw new Error("Engine must be in InProgress state to pause");
    }
    if (!this._config?.allowPause) {
      throw new Error("Pausing is not allowed");
    }
  }

  private validateStateForResume(): void {
    if (this._state !== PlayerState.Paused) {
      throw new Error("Engine must be in Paused state to resume");
    }
  }

  private validateStateForSubmit(): void {
    if (this._state !== PlayerState.InProgress) {
      throw new Error("Engine must be in InProgress state to submit");
    }
  }

  private validateStateForExpire(): void {
    if (this._state !== PlayerState.InProgress && this._state !== PlayerState.Paused) {
      throw new Error("Engine must be in InProgress or Paused state to expire");
    }
  }

  private transitionTo(newState: PlayerState): void {
    const allowedTransitions = PLAYER_STATE_TRANSITIONS[this._state];
    if (!allowedTransitions.includes(newState)) {
      this.handleError(
        PLAYER_ERROR_CODES.INVALID_TRANSITION,
        `Cannot transition from ${this._state} to ${newState}`,
      );
      return;
    }

    const fromState = this._state;
    this._state = newState;

    if (newState === PlayerState.Error) {
      this._error = { code: "STATE_ERROR", message: `Transitioned to error from ${fromState}` };
    }

    this._eventEmitter.emit({
      type: PlayerEventType.PlayerStateChanged,
      payload: { from: fromState, to: newState },
    });
  }
}

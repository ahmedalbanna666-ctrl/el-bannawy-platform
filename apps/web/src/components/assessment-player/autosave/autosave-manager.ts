import { PlayerEventEmitter, PlayerEventType } from "../events/player-events";
import { AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_RETRY_COUNT, AUTOSAVE_RETRY_DELAY_MS } from "../constants/player-constants";

export interface AutosaveEntry {
  questionId: string;
  answer: unknown;
  attemptId: string;
  timestamp: number;
  retryCount: number;
}

export interface AutosaveState {
  pendingCount: number;
  failedCount: number;
  lastSavedAt: string | null;
  isSaving: boolean;
}

export type SaveFunction = (
  attemptId: string,
  questionId: string,
  answer: unknown,
) => Promise<void>;

export class AutosaveManager {
  private readonly _eventEmitter: PlayerEventEmitter;
  private readonly _saveFunction: SaveFunction;
  private readonly _queue = new Map<string, AutosaveEntry>();
  private readonly _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _isSaving = false;
  private _failedCount = 0;
  private _lastSavedAt: string | null = null;
  private _destroyed = false;

  constructor(eventEmitter: PlayerEventEmitter, saveFunction: SaveFunction) {
    this._eventEmitter = eventEmitter;
    this._saveFunction = saveFunction;
  }

  get state(): AutosaveState {
    return {
      pendingCount: this._queue.size,
      failedCount: this._failedCount,
      lastSavedAt: this._lastSavedAt,
      isSaving: this._isSaving,
    };
  }

  scheduleSave(attemptId: string, questionId: string, answer: unknown): void {
    if (this._destroyed) return;

    const existingEntry = this._queue.get(questionId);
    this._queue.set(questionId, {
      questionId,
      answer,
      attemptId,
      timestamp: Date.now(),
      retryCount: existingEntry?.retryCount ?? 0,
    });

    const existingTimer = this._debounceTimers.get(questionId);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this._debounceTimers.delete(questionId);
      void this.flush();
    }, AUTOSAVE_DEBOUNCE_MS);

    this._debounceTimers.set(questionId, timer);
  }

  saveImmediate(attemptId: string, questionId: string, answer: unknown): void {
    if (this._destroyed) return;

    const existingTimer = this._debounceTimers.get(questionId);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
      this._debounceTimers.delete(questionId);
    }

    this._queue.set(questionId, {
      questionId,
      answer,
      attemptId,
      timestamp: Date.now(),
      retryCount: 0,
    });

    void this.flush();
  }

  async flush(): Promise<void> {
    if (this._isSaving || this._queue.size === 0 || this._destroyed) return;

    this._isSaving = true;
    const entries = Array.from(this._queue.values());
    this._queue.clear();

    for (const entry of entries) {
      await this.saveWithRetry(entry);
    }

    this._isSaving = false;
  }

  async flushAll(): Promise<void> {
    for (const timer of this._debounceTimers.values()) {
      clearTimeout(timer);
    }
    this._debounceTimers.clear();
    await this.flush();
  }

  getPendingCount(): number {
    return this._queue.size;
  }

  getFailedCount(): number {
    return this._failedCount;
  }

  destroy(): void {
    this._destroyed = true;
    for (const timer of this._debounceTimers.values()) {
      clearTimeout(timer);
    }
    this._debounceTimers.clear();
    this._queue.clear();
  }

  private async saveWithRetry(entry: AutosaveEntry): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= AUTOSAVE_RETRY_COUNT; attempt++) {
      try {
        await this._saveFunction(entry.attemptId, entry.questionId, entry.answer);
        this._lastSavedAt = new Date().toISOString();
        this._eventEmitter.emit({
          type: PlayerEventType.AutosaveCompleted,
          payload: { questionId: entry.questionId, savedAt: this._lastSavedAt },
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown save error");
        if (attempt < AUTOSAVE_RETRY_COUNT) {
          await this.delay(AUTOSAVE_RETRY_DELAY_MS);
        }
      }
    }

    this._failedCount++;
    this._queue.set(entry.questionId, {
      ...entry,
      retryCount: entry.retryCount + 1,
    });

    this._eventEmitter.emit({
      type: PlayerEventType.PlayerError,
      payload: {
        code: "SAVE_FAILED",
        message: `Failed to save answer for question ${entry.questionId}: ${lastError?.message ?? "Unknown error"}`,
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

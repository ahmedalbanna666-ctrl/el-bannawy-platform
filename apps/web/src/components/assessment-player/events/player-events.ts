import type { PlayerState, SaveAnswerData } from "../types/player-types";

export enum PlayerEventType {
  PlayerStarted = "PlayerStarted",
  QuestionChanged = "QuestionChanged",
  AnswerSaved = "AnswerSaved",
  AutosaveCompleted = "AutosaveCompleted",
  PlayerSubmitted = "PlayerSubmitted",
  PlayerCompleted = "PlayerCompleted",
  PlayerExpired = "PlayerExpired",
  PlayerStateChanged = "PlayerStateChanged",
  PlayerError = "PlayerError",
  TimeWarning = "TimeWarning",
  TimerTick = "TimerTick",
}

export interface PlayerEventPayloads {
  [PlayerEventType.PlayerStarted]: { attemptId: string; assessmentId: string };
  [PlayerEventType.QuestionChanged]: { questionId: string; sectionId: string };
  [PlayerEventType.AnswerSaved]: SaveAnswerData;
  [PlayerEventType.AutosaveCompleted]: { questionId: string; savedAt: string };
  [PlayerEventType.PlayerSubmitted]: { attemptId: string; score: number | null; passed: boolean | null };
  [PlayerEventType.PlayerCompleted]: { attemptId: string; score: number | null; passed: boolean | null };
  [PlayerEventType.PlayerExpired]: { attemptId: string };
  [PlayerEventType.PlayerStateChanged]: { from: PlayerState; to: PlayerState };
  [PlayerEventType.PlayerError]: { code: string; message: string };
  [PlayerEventType.TimeWarning]: { remainingSeconds: number };
  [PlayerEventType.TimerTick]: { remainingSeconds: number };
}

export type PlayerEvent = {
  [K in PlayerEventType]: { type: K; payload: PlayerEventPayloads[K] };
}[PlayerEventType];

export type PlayerEventCallback = (event: PlayerEvent) => void;

export type PlayerEventUnsubscribe = () => void;

export class PlayerEventEmitter {
  private readonly listeners = new Map<PlayerEventType, Set<PlayerEventCallback>>();
  private readonly wildcardListeners = new Set<PlayerEventCallback>();

  on(type: PlayerEventType, callback: PlayerEventCallback): PlayerEventUnsubscribe {
    const set = this.listeners.get(type) ?? new Set();
    set.add(callback);
    this.listeners.set(type, set);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  onAny(callback: PlayerEventCallback): PlayerEventUnsubscribe {
    this.wildcardListeners.add(callback);
    return () => {
      this.wildcardListeners.delete(callback);
    };
  }

  off(type: PlayerEventType, callback: PlayerEventCallback): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  emit(event: PlayerEvent): void {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const callback of set) {
        callback(event);
      }
    }

    for (const callback of this.wildcardListeners) {
      callback(event);
    }
  }

  removeAll(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  listenerCount(type?: PlayerEventType): number {
    if (type) {
      return this.listeners.get(type)?.size ?? 0;
    }
    let count = 0;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count + this.wildcardListeners.size;
  }
}

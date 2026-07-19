import { PlayerEventEmitter, PlayerEventType } from "../events/player-events";
import { TIMER_TICK_INTERVAL_MS, TIMER_WARNING_THRESHOLD_SECONDS } from "../constants/player-constants";

export interface TimerState {
  remainingSeconds: number | null;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  elapsedSeconds: number;
}

export class PlayerTimer {
  private _remainingSeconds: number | null = null;
  private _isRunning = false;
  private _isPaused = false;
  private _isExpired = false;
  private _elapsedSeconds = 0;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _startTimestamp: number | null = null;
  private _pausedRemainingSeconds: number | null = null;
  private readonly _eventEmitter: PlayerEventEmitter;
  private _warningEmitted = false;

  constructor(eventEmitter: PlayerEventEmitter) {
    this._eventEmitter = eventEmitter;
  }

  get state(): TimerState {
    return {
      remainingSeconds: this._remainingSeconds,
      isRunning: this._isRunning,
      isPaused: this._isPaused,
      isExpired: this._isExpired,
      elapsedSeconds: this._elapsedSeconds,
    };
  }

  get remainingSeconds(): number | null {
    return this._remainingSeconds;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isExpired(): boolean {
    return this._isExpired;
  }

  get elapsedSeconds(): number {
    return this._elapsedSeconds;
  }

  initialize(remainingSeconds: number | null): void {
    this.stop();
    this._remainingSeconds = remainingSeconds;
    this._isRunning = false;
    this._isPaused = false;
    this._isExpired = false;
    this._elapsedSeconds = 0;
    this._warningEmitted = false;
    this._pausedRemainingSeconds = null;
  }

  start(): void {
    if (this._remainingSeconds === null) {
      this._isRunning = true;
      this._startTimestamp = Date.now();
      this._intervalId = setInterval(() => {
        this.tickUnlimited();
      }, TIMER_TICK_INTERVAL_MS);
      return;
    }

    if (this._remainingSeconds <= 0) {
      this._isExpired = true;
      return;
    }

    this._isRunning = true;
    this._isPaused = false;
    this._startTimestamp = Date.now();

    this._intervalId = setInterval(() => {
      this.tickLimited();
    }, TIMER_TICK_INTERVAL_MS);
  }

  pause(): void {
    if (!this._isRunning || this._isPaused) return;

    this._isPaused = true;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    if (this._remainingSeconds !== null) {
      this._pausedRemainingSeconds = this._remainingSeconds;
    }
  }

  resume(): void {
    if (!this._isPaused) return;

    this._isPaused = false;
    if (this._remainingSeconds !== null) {
      const pausedAt = this._pausedRemainingSeconds;
      this._pausedRemainingSeconds = null;
      this._remainingSeconds = pausedAt;
    }
    this._startTimestamp = Date.now();

    this._intervalId = setInterval(() => {
      if (this._remainingSeconds === null) {
        this.tickUnlimited();
      } else {
        this.tickLimited();
      }
    }, TIMER_TICK_INTERVAL_MS);
  }

  stop(): void {
    this._isRunning = false;
    this._isPaused = false;
    this._pausedRemainingSeconds = null;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  synchronize(remainingSeconds: number): void {
    this._remainingSeconds = remainingSeconds;
    if (this._remainingSeconds <= 0) {
      this._isExpired = true;
    }
  }

  private tickLimited(): void {
    if (this._remainingSeconds === null) return;

    this._remainingSeconds -= 1;
    this._elapsedSeconds += 1;

    this._eventEmitter.emit({
      type: PlayerEventType.TimerTick,
      payload: { remainingSeconds: this._remainingSeconds },
    });

    if (!this._warningEmitted && this._remainingSeconds <= TIMER_WARNING_THRESHOLD_SECONDS) {
      this._warningEmitted = true;
      this._eventEmitter.emit({
        type: PlayerEventType.TimeWarning,
        payload: { remainingSeconds: this._remainingSeconds },
      });
    }

    if (this._remainingSeconds <= 0) {
      this._remainingSeconds = 0;
      this._isExpired = true;
      this.stop();
      this._eventEmitter.emit({
        type: PlayerEventType.PlayerExpired,
        payload: { attemptId: "" },
      });
    }
  }

  private tickUnlimited(): void {
    this._elapsedSeconds += 1;
  }

  destroy(): void {
    this.stop();
  }
}

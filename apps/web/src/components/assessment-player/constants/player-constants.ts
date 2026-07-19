import { PlayerState } from "../types/player-types";

export const PLAYER_STATE_TRANSITIONS: Record<PlayerState, readonly PlayerState[]> = {
  [PlayerState.Loading]: [PlayerState.Ready, PlayerState.Error],
  [PlayerState.Ready]: [PlayerState.InProgress, PlayerState.Locked, PlayerState.Error],
  [PlayerState.Started]: [PlayerState.InProgress, PlayerState.Error],
  [PlayerState.InProgress]: [
    PlayerState.Paused,
    PlayerState.Submitting,
    PlayerState.Expired,
    PlayerState.Locked,
    PlayerState.Error,
  ],
  [PlayerState.Paused]: [PlayerState.InProgress, PlayerState.Locked, PlayerState.Error],
  [PlayerState.Submitting]: [PlayerState.Submitted, PlayerState.Error],
  [PlayerState.Submitted]: [PlayerState.Completed, PlayerState.Error],
  [PlayerState.Completed]: [PlayerState.Locked, PlayerState.Error],
  [PlayerState.Expired]: [
    PlayerState.Submitting,
    PlayerState.Completed,
    PlayerState.Locked,
    PlayerState.Error,
  ],
  [PlayerState.Locked]: [PlayerState.Error],
  [PlayerState.Error]: [PlayerState.Ready, PlayerState.Locked],
};

export const ACTIVE_PLAYER_STATES: readonly PlayerState[] = [
  PlayerState.Started,
  PlayerState.InProgress,
  PlayerState.Paused,
];

export const FINAL_PLAYER_STATES: readonly PlayerState[] = [
  PlayerState.Submitted,
  PlayerState.Completed,
  PlayerState.Expired,
  PlayerState.Locked,
];

export const DEFAULT_PLAYER_CONFIG = {
  allowNavigation: true,
  allowPause: true,
  showProgress: true,
  showTimer: true,
  timeLimitSeconds: null,
  passingScore: null,
  shuffleQuestions: false,
  shuffleOptions: false,
};

export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const AUTOSAVE_RETRY_COUNT = 3;
export const AUTOSAVE_RETRY_DELAY_MS = 1000;
export const TIMER_TICK_INTERVAL_MS = 1000;
export const TIMER_WARNING_THRESHOLD_SECONDS = 300;

export const PLAYER_ERROR_CODES = {
  LOAD_FAILED: "LOAD_FAILED",
  START_FAILED: "START_FAILED",
  SUBMIT_FAILED: "SUBMIT_FAILED",
  SAVE_FAILED: "SAVE_FAILED",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  NAVIGATION_BLOCKED: "NAVIGATION_BLOCKED",
  ATTEMPT_NOT_FOUND: "ATTEMPT_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

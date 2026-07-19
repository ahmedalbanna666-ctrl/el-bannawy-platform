"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";

// ── Player State ──────────────────────────────────────────────────

export enum PlayerState {
  Idle = "IDLE",
  Loading = "LOADING",
  Ready = "READY",
  Playing = "PLAYING",
  Paused = "PAUSED",
  Buffering = "BUFFERING",
  Seeking = "SEEKING",
  Ended = "ENDED",
  Error = "ERROR",
}

// ── Player Capabilities ───────────────────────────────────────────

export interface PlayerCapabilities {
  readonly supportsSeek: boolean;
  readonly supportsPlaybackRate: boolean;
  readonly supportsFullscreen: boolean;
  readonly supportsCaptions: boolean;
  readonly supportsEvents: boolean;
  readonly supportsPiP: boolean;
}

// ── Playback Events ───────────────────────────────────────────────

export type PlaybackEvent =
  | { readonly type: "PLAYER_READY"; readonly payload: { readonly duration: number } }
  | { readonly type: "PLAYER_PLAY" }
  | { readonly type: "PLAYER_PAUSE"; readonly payload: { readonly currentTime: number } }
  | { readonly type: "PLAYER_SEEK"; readonly payload: { readonly position: number } }
  | { readonly type: "PLAYER_BUFFER"; readonly payload: { readonly isBuffering: boolean } }
  | {
      readonly type: "PLAYER_TIME_UPDATE";
      readonly payload: { readonly currentTime: number; readonly duration: number };
    }
  | { readonly type: "PLAYER_ENDED" }
  | { readonly type: "PLAYER_ERROR"; readonly payload: { readonly code?: string; readonly message?: string } };

// ── Provider API (providers register an object implementing this) ─

export interface PlayerProviderApi {
  play(): void;
  pause(): void;
  seek(time: number): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  toggleFullscreen(): void;
}

// ── Internal State ────────────────────────────────────────────────

interface InternalPlayerState {
  readonly playerState: PlayerState;
  readonly currentTime: number;
  readonly duration: number;
  readonly playbackRate: number;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly isFullscreen: boolean;
  readonly capabilities: PlayerCapabilities;
}

type PlayerAction =
  | { type: "SET_STATE"; playerState: PlayerState }
  | { type: "SET_TIME"; currentTime: number; duration: number }
  | { type: "SET_DURATION"; duration: number }
  | { type: "SET_PLAYBACK_RATE"; playbackRate: number }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "TOGGLE_FULLSCREEN" }
  | { type: "SET_CAPABILITIES"; capabilities: PlayerCapabilities };

const DEFAULT_CAPABILITIES: PlayerCapabilities = {
  supportsSeek: false,
  supportsPlaybackRate: false,
  supportsFullscreen: false,
  supportsCaptions: false,
  supportsEvents: false,
  supportsPiP: false,
};

const INITIAL_STATE: InternalPlayerState = {
  playerState: PlayerState.Idle,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  capabilities: DEFAULT_CAPABILITIES,
};

function playerReducer(state: InternalPlayerState, action: PlayerAction): InternalPlayerState {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, playerState: action.playerState };
    case "SET_TIME":
      return { ...state, currentTime: action.currentTime, duration: action.duration };
    case "SET_DURATION":
      return { ...state, duration: action.duration };
    case "SET_PLAYBACK_RATE":
      return { ...state, playbackRate: action.playbackRate };
    case "SET_VOLUME":
      return { ...state, volume: action.volume, isMuted: action.volume === 0 };
    case "TOGGLE_MUTE":
      return { ...state, isMuted: !state.isMuted };
    case "TOGGLE_FULLSCREEN":
      return { ...state, isFullscreen: !state.isFullscreen };
    case "SET_CAPABILITIES":
      return { ...state, capabilities: action.capabilities };
  }
}

// ── Context ───────────────────────────────────────────────────────

export interface PlayerContextValue {
  readonly playerState: PlayerState;
  readonly currentTime: number;
  readonly duration: number;
  readonly playbackRate: number;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly isFullscreen: boolean;
  readonly capabilities: PlayerCapabilities;

  readonly play: () => void;
  readonly pause: () => void;
  readonly seek: (time: number) => void;
  readonly setPlaybackRate: (rate: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly toggleMute: () => void;
  readonly toggleFullscreen: () => void;

  readonly dispatchEvent: (event: PlaybackEvent) => void;
  readonly registerProvider: (api: PlayerProviderApi) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayerContext must be used within PlaybackEngineProvider");
  }
  return ctx;
}

// ── Provider Component ────────────────────────────────────────────

interface PlaybackEngineProviderProps {
  readonly children: ReactNode;
  readonly videoId: string | null;
  readonly capabilities?: PlayerCapabilities;
  readonly onProgress?: (currentTime: number, duration: number) => void;
}

export function PlaybackEngineProvider({
  children,
  videoId,
  capabilities,
  onProgress,
}: PlaybackEngineProviderProps): ReactNode {
  const [state, dispatch] = useReducer(playerReducer, {
    ...INITIAL_STATE,
    ...(capabilities ? { capabilities } : {}),
  });

  const providerApiRef = useRef<PlayerProviderApi | null>(null);

  // ── Progress Saving ────────────────────────────────────────────────

  const lastSavedRef = useRef(0);
  const playerStateRef = useRef(state.playerState);
  const currentTimeRef = useRef(state.currentTime);
  const durationRef = useRef(state.duration);
  const videoIdRef = useRef(videoId);

  playerStateRef.current = state.playerState;
  currentTimeRef.current = state.currentTime;
  durationRef.current = state.duration;
  videoIdRef.current = videoId;

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const saveProgress = useCallback((time: number, dur: number): void => {
    const vid = videoIdRef.current;
    if (!vid) return;
    const floorTime = Math.floor(time);
    const floorDur = Math.floor(dur);
    if (floorTime > 0 && floorDur > 0 && floorTime !== lastSavedRef.current) {
      lastSavedRef.current = floorTime;
      void api.patch(`/videos/${vid}/progress`, {
        currentPosition: floorTime,
        watchedSeconds: floorTime,
      });
      onProgressRef.current?.(time, dur);
    }
  }, []);

  useEffect(() => {
    if (state.playerState === PlayerState.Playing && videoId) {
      const interval = setInterval(() => {
        saveProgress(currentTimeRef.current, durationRef.current);
      }, 10_000);
      return (): void => { clearInterval(interval); };
    }
  }, [state.playerState, videoId, saveProgress]);

  // ── Event Dispatcher ───────────────────────────────────────────────

  const dispatchEvent = useCallback(
    (event: PlaybackEvent): void => {
      switch (event.type) {
        case "PLAYER_READY":
          dispatch({ type: "SET_STATE", playerState: PlayerState.Ready });
          dispatch({ type: "SET_DURATION", duration: event.payload.duration });
          break;
        case "PLAYER_PLAY":
          dispatch({ type: "SET_STATE", playerState: PlayerState.Playing });
          break;
        case "PLAYER_PAUSE":
          dispatch({ type: "SET_STATE", playerState: PlayerState.Paused });
          saveProgress(event.payload.currentTime, durationRef.current);
          break;
        case "PLAYER_SEEK":
          dispatch({ type: "SET_STATE", playerState: PlayerState.Seeking });
          dispatch({ type: "SET_TIME", currentTime: event.payload.position, duration: durationRef.current });
          break;
        case "PLAYER_BUFFER":
          dispatch({
            type: "SET_STATE",
            playerState: event.payload.isBuffering ? PlayerState.Buffering : PlayerState.Playing,
          });
          break;
        case "PLAYER_TIME_UPDATE":
          dispatch({
            type: "SET_TIME",
            currentTime: event.payload.currentTime,
            duration: event.payload.duration,
          });
          break;
        case "PLAYER_ENDED":
          dispatch({ type: "SET_STATE", playerState: PlayerState.Ended });
          saveProgress(durationRef.current, durationRef.current);
          break;
        case "PLAYER_ERROR":
          dispatch({ type: "SET_STATE", playerState: PlayerState.Error });
          break;
      }
    },
    [saveProgress],
  );

  // ── Public API ─────────────────────────────────────────────────────

  const play = useCallback((): void => {
    providerApiRef.current?.play();
  }, []);

  const pause = useCallback((): void => {
    providerApiRef.current?.pause();
  }, []);

  const seek = useCallback(
    (time: number): void => {
      providerApiRef.current?.seek(time);
    },
    [],
  );

  const setPlaybackRate = useCallback(
    (rate: number): void => {
      providerApiRef.current?.setPlaybackRate(rate);
      dispatch({ type: "SET_PLAYBACK_RATE", playbackRate: rate });
    },
    [],
  );

  const setVolume = useCallback(
    (vol: number): void => {
      providerApiRef.current?.setVolume(vol);
      dispatch({ type: "SET_VOLUME", volume: vol });
    },
    [],
  );

  const toggleMute = useCallback((): void => {
    providerApiRef.current?.toggleMute();
    dispatch({ type: "TOGGLE_MUTE" });
  }, []);

  const toggleFullscreen = useCallback((): void => {
    providerApiRef.current?.toggleFullscreen();
    dispatch({ type: "TOGGLE_FULLSCREEN" });
  }, []);

  // ── Provider Registration ─────────────────────────────────────────

  const registerProvider = useCallback((api: PlayerProviderApi): void => {
    providerApiRef.current = api;
  }, []);

  // ── Context Value ──────────────────────────────────────────────────

  const ctx: PlayerContextValue = {
    playerState: state.playerState,
    currentTime: state.currentTime,
    duration: state.duration,
    playbackRate: state.playbackRate,
    volume: state.volume,
    isMuted: state.isMuted,
    isFullscreen: state.isFullscreen,
    capabilities: state.capabilities,
    play,
    pause,
    seek,
    setPlaybackRate,
    setVolume,
    toggleMute,
    toggleFullscreen,
    dispatchEvent,
    registerProvider,
  };

  return <PlayerContext.Provider value={ctx}>{children}</PlayerContext.Provider>;
}



"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { AssessmentPlayerEngine } from "../engine/assessment-player-engine";
import { AssessmentPlayerService } from "../services/assessment-player-service";
import { PlayerEventType } from "../events/player-events";
import {
  PlayerState,
  NavigationDirection,
  type AssessmentPlayerContextValue,
  type LoadAttemptData,
  type SubmitResultData,
  type AnswerRecord,
  type PlayerQuestion,
  type PlayerSection,
  type PlayerConfig,
  type PlayerProgress,
  type NavigationResult,
} from "../types/player-types";

interface PlayerStateSnapshot {
  playerState: PlayerState;
  currentQuestion: PlayerQuestion | null;
  currentSection: PlayerSection | null;
  questions: readonly PlayerQuestion[];
  sections: readonly PlayerSection[];
  config: PlayerConfig | null;
  progress: PlayerProgress;
  remainingTime: number | null;
  visitedQuestions: readonly string[];
  answeredQuestions: readonly string[];
  error: string | null;
  answers: ReadonlyMap<string, AnswerRecord>;
  timerState: {
    remainingSeconds: number | null;
    isRunning: boolean;
    isExpired: boolean;
    elapsedSeconds: number;
  } | null;
  autosaveState: {
    pendingCount: number;
    failedCount: number;
    lastSavedAt: string | null;
    isSaving: boolean;
  } | null;
}

type PlayerAction =
  | { type: "SYNC_ENGINE" }
  | { type: "SET_ERROR"; error: string };

function createInitialState(): PlayerStateSnapshot {
  return {
    playerState: PlayerState.Loading,
    currentQuestion: null,
    currentSection: null,
    questions: [],
    sections: [],
    config: null,
    progress: {
      totalQuestions: 0,
      answeredQuestions: 0,
      unansweredQuestions: 0,
      visitedQuestions: 0,
      completionPercentage: 0,
    },
    remainingTime: null,
    visitedQuestions: [],
    answeredQuestions: [],
    error: null,
    answers: new Map(),
    timerState: null,
    autosaveState: null,
  };
}

function buildSnapshot(engine: AssessmentPlayerEngine): PlayerStateSnapshot {
  return {
    playerState: engine.state,
    currentQuestion: engine.currentQuestion,
    currentSection: engine.currentSection,
    questions: engine.questions,
    sections: engine.sections,
    config: engine.config,
    progress: engine.getProgress(),
    remainingTime: engine.timerState?.remainingSeconds ?? null,
    visitedQuestions: engine.visitedQuestions,
    answeredQuestions: engine.answeredQuestions,
    error: engine.error ? engine.error.message : null,
    answers: engine.answers,
    timerState: engine.timerState,
    autosaveState: engine.autosaveState,
  };
}

interface AssessmentPlayerProviderProps {
  attemptId: string;
  children: ReactNode;
  service?: AssessmentPlayerService;
  autoStart?: boolean;
}

const AssessmentPlayerContext = createContext<AssessmentPlayerContextValue | null>(null);

export function AssessmentPlayerProvider({
  attemptId,
  children,
  service,
  autoStart = false,
}: AssessmentPlayerProviderProps): ReactNode {
  const engineRef = useRef<AssessmentPlayerEngine | null>(null);
  const serviceRef = useRef<AssessmentPlayerService>(service ?? new AssessmentPlayerService());
  const isInitializedRef = useRef<boolean>(false);

  const [snapshot, dispatch] = useReducer(
    (state: PlayerStateSnapshot, action: PlayerAction): PlayerStateSnapshot => {
      switch (action.type) {
        case "SYNC_ENGINE": {
          const engine = engineRef.current;
          if (!engine) return state;
          return buildSnapshot(engine);
        }
        case "SET_ERROR": {
          return { ...state, error: action.error };
        }
        default:
          return state;
      }
    },
    createInitialState(),
  );

  const syncEngine = useCallback((): void => {
    dispatch({ type: "SYNC_ENGINE" });
  }, []);

  const handleAutoSubmit = useCallback(async (): Promise<void> => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.flushAutosave();
      engine.submit();
      const result: SubmitResultData = await serviceRef.current.submitAttempt(attemptId);
      engine.markSubmitSuccess(result.score, result.passed);
      engine.complete(result.score, result.passed);
      syncEngine();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Auto-submit failed";
      engine.handleError("SUBMIT_FAILED", message);
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [attemptId, syncEngine]);

  const initialize = useCallback(async (): Promise<void> => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const engine = new AssessmentPlayerEngine();
    engineRef.current = engine;

    engine.eventEmitter.onAny(() => {
      syncEngine();
    });

    engine.eventEmitter.on(PlayerEventType.PlayerExpired, () => {
      if (engine.state === PlayerState.Expired) {
        void handleAutoSubmit();
      }
    });

    try {
      const data: LoadAttemptData = await serviceRef.current.loadAttempt(attemptId);

      engine.initializeServices(async (aId, qId, answer) => {
        await serviceRef.current.saveAnswer(aId, qId, answer);
      });

      engine.initialize({
        attemptId: data.attemptId,
        assessmentId: data.assessmentId,
        questions: data.questions,
        sections: data.sections,
        answers: data.answers,
        config: data.config,
      });

      engine.synchronizeTimer(data.remainingTimeSeconds ?? 0);

      if (autoStart && engine.state === PlayerState.Ready) {
        engine.start();
      }

      syncEngine();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load attempt";
      engine.setError("LOAD_FAILED", message);
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [attemptId, autoStart, syncEngine, handleAutoSubmit]);

  useEffect(() => {
    void initialize();
    return (): void => {
      engineRef.current?.reset();
      isInitializedRef.current = false;
    };
  }, [initialize]);

  const contextValue = useMemo<AssessmentPlayerContextValue>((): AssessmentPlayerContextValue => {
    const engine = engineRef.current;

    const start = (): void => {
      if (!engine) return;
      try {
        engine.start();
        syncEngine();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start";
        engine.handleError("START_FAILED", message);
        dispatch({ type: "SET_ERROR", error: message });
      }
    };

    const pause = (): void => {
      if (!engine) return;
      try {
        engine.pause();
        syncEngine();
      } catch {
        /* no-op */
      }
    };

    const resume = (): void => {
      if (!engine) return;
      try {
        engine.resume();
        syncEngine();
      } catch {
        /* no-op */
      }
    };

    const submit = async (): Promise<void> => {
      if (!engine) return;
      try {
        await engine.flushAutosave();
        engine.submit();
        syncEngine();

        const result = await serviceRef.current.submitAttempt(attemptId);
        engine.markSubmitSuccess(result.score, result.passed);
        engine.complete(result.score, result.passed);
        syncEngine();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit";
        engine.markSubmitError();
        engine.handleError("SUBMIT_FAILED", message);
        dispatch({ type: "SET_ERROR", error: message });
      }
    };

    const navigate = (direction: NavigationDirection, target?: string): NavigationResult => {
      if (!engine) return { success: false, question: null, error: "Engine not initialized" };
      const result = engine.navigate(direction, target);
      syncEngine();
      return result;
    };

    const saveAnswer = (questionId: string, answer: unknown): void => {
      if (!engine) return;
      engine.setAnswer(questionId, answer);
      syncEngine();
    };

    return {
      state: snapshot.playerState,
      config: snapshot.config ?? ({} as PlayerConfig),
      attemptId,
      assessmentId: engine?.assessmentId ?? "",
      currentQuestion: snapshot.currentQuestion,
      currentSection: snapshot.currentSection,
      questions: snapshot.questions,
      sections: snapshot.sections,
      progress: snapshot.progress,
      remainingTime: snapshot.remainingTime,
      visitedQuestions: snapshot.visitedQuestions,
      answeredQuestions: snapshot.answeredQuestions,
      error: snapshot.error,

      start,
      pause,
      resume,
      submit,
      goToNext: (): NavigationResult => navigate(NavigationDirection.Next),
      goToPrevious: (): NavigationResult => navigate(NavigationDirection.Previous),
      jumpToQuestion: (questionId: string): NavigationResult => navigate(NavigationDirection.JumpToQuestion, questionId),
      jumpToSection: (sectionId: string): NavigationResult => navigate(NavigationDirection.JumpToSection, sectionId),
      goToFirstUnanswered: (): NavigationResult => navigate(NavigationDirection.FirstUnanswered),
      goToLastAnswered: (): NavigationResult => navigate(NavigationDirection.LastAnswered),
      saveAnswer,
      getAnswer: (questionId: string): AnswerRecord | undefined => snapshot.answers.get(questionId),
      hasAnswered: (questionId: string): boolean => engine?.hasAnswered(questionId) ?? false,
    };
  }, [snapshot, attemptId, syncEngine]);

  return (
    <AssessmentPlayerContext.Provider value={contextValue}>
      {children}
    </AssessmentPlayerContext.Provider>
  );
}

export function useAssessmentPlayerContext(): AssessmentPlayerContextValue {
  const context = useContext(AssessmentPlayerContext);
  if (!context) {
    throw new Error("useAssessmentPlayerContext must be used within AssessmentPlayerProvider");
  }
  return context;
}

export { AssessmentPlayerContext };

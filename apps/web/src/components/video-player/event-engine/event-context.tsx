"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";
import { createEventRegistry } from "./event-registry";
import { createEventDispatcher } from "./event-dispatcher";
import { createExecutionEngine } from "../execution-engine/execution-engine";
import { VideoEventState, type VideoEvent, type VideoEventHandler, type VideoEventRegistry, type VideoEventDispatcher } from "./types";
import type { ExecutionEngine } from "../execution-engine/types";

export interface EventEngineContextValue {
  readonly events: readonly VideoEvent[];
  readonly eventStates: ReadonlyMap<string, VideoEventState>;
  readonly registry: VideoEventRegistry;
  readonly dispatcher: VideoEventDispatcher;
  readonly executionEngine: ExecutionEngine;
  readonly isLoaded: boolean;
  readonly registerHandler: (handler: VideoEventHandler) => void;
  readonly refreshEvents: () => Promise<void>;
  readonly getEventsAtTimestamp: (timestamp: number, tolerance?: number) => readonly VideoEvent[];
}

const EventEngineContext = createContext<EventEngineContextValue | null>(null);

export function useEventEngine(): EventEngineContextValue {
  const ctx = useContext(EventEngineContext);
  if (!ctx) {
    throw new Error("useEventEngine must be used within EventEngineProvider");
  }
  return ctx;
}

interface EventEngineProviderProps {
  readonly children: ReactNode;
  readonly videoId: string;
}

export function EventEngineProvider({
  children,
  videoId,
}: EventEngineProviderProps): ReactNode {
  const [events, setEvents] = useState<readonly VideoEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const eventStatesRef = useRef(new Map<string, VideoEventState>());
  const registryRef = useRef<VideoEventRegistry>(createEventRegistry());
  const executionEngineRef = useRef<ExecutionEngine>(createExecutionEngine());
  const dispatcherRef = useRef<VideoEventDispatcher>(
    createEventDispatcher(registryRef.current, executionEngineRef.current),
  );

  const refreshEvents = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get(`/video-events?videoId=${encodeURIComponent(videoId)}`);
      const data = (response as { data: unknown }).data ?? response;
      const fetched = Array.isArray(data) ? (data as VideoEvent[]) : [];
      setEvents(fetched);
      setIsLoaded(true);
    } catch {
      setIsLoaded(true);
    }
  }, [videoId]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const registerHandler = useCallback((handler: VideoEventHandler): void => {
    registryRef.current.register(handler);
  }, []);

  const getEventsAtTimestamp = useCallback(
    (timestamp: number, tolerance = 1): readonly VideoEvent[] => {
      return events.filter((event) => {
        if (!event.enabled) return false;
        return Math.abs(event.timestamp - timestamp) <= tolerance;
      });
    },
    [events],
  );

  const ctx: EventEngineContextValue = {
    events,
    eventStates: eventStatesRef.current,
    registry: registryRef.current,
    dispatcher: dispatcherRef.current,
    executionEngine: executionEngineRef.current,
    isLoaded,
    registerHandler,
    refreshEvents,
    getEventsAtTimestamp,
  };

  return (
    <EventEngineContext.Provider value={ctx}>
      {children}
    </EventEngineContext.Provider>
  );
}

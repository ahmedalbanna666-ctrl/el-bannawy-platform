"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePlayerContext, PlayerState } from "../use-playback-engine";
import { useEventEngine } from "./event-context";

function EventTimeWatcherImpl(): null {
  const { playerState, currentTime, duration } = usePlayerContext();
  const { getEventsAtTimestamp, dispatcher, isLoaded } = useEventEngine();
  const lastTriggeredRef = useRef(new Set<string>());
  const lastStateRef = useRef(playerState);

  useEffect(() => {
    if (!isLoaded) return;

    if (playerState === PlayerState.Ended && lastStateRef.current !== PlayerState.Ended) {
      const finalEvents = getEventsAtTimestamp(duration, 1);
      for (const event of finalEvents) {
        if (!lastTriggeredRef.current.has(event.id)) {
          lastTriggeredRef.current.add(event.id);
          void dispatcher.dispatch(event);
        }
      }
    }

    if (playerState === PlayerState.Playing || playerState === PlayerState.Paused) {
      const matched = getEventsAtTimestamp(currentTime);
      for (const event of matched) {
        if (!lastTriggeredRef.current.has(event.id)) {
          lastTriggeredRef.current.add(event.id);
          void dispatcher.dispatch(event);
        }
      }
    }

    lastStateRef.current = playerState;
  }, [playerState, currentTime, duration, isLoaded, getEventsAtTimestamp, dispatcher]);

  useEffect(() => {
    lastTriggeredRef.current.clear();
  }, [isLoaded]);

  return null;
}

export function EventTimeWatcher(): ReactNode {
  return <EventTimeWatcherImpl />;
}

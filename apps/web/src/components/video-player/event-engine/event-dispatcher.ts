import { VideoEventState, type VideoEvent, type VideoEventDispatcher, type VideoEventHandler, type VideoEventRegistry } from "./types";
import { ExecutionState, ExecutionDecision, type ExecutionEngine, type ExecutionContext } from "../execution-engine/types";

export function createEventDispatcher(
  registry: VideoEventRegistry,
  executionEngine: ExecutionEngine,
): VideoEventDispatcher {
  const handlerCache = new Map<string, VideoEventHandler>();

  function getHandler(type: string): VideoEventHandler | null {
    const cached = handlerCache.get(type.toUpperCase());
    if (cached) return cached;

    const handler = registry.getHandler(type);
    if (handler) {
      handlerCache.set(type.toUpperCase(), handler);
    }
    return handler;
  }

  return {
    async dispatch(event: VideoEvent): Promise<void> {
      const execContext: ExecutionContext = {
        videoId: event.videoId,
        eventId: event.id,
        pluginType: event.type,
        userId: "",
        currentTime: event.timestamp,
        playbackState: "PLAYING",
        eventPayload: { videoEventId: event.id, ...event.payload },
        metadata: {
          title: event.title,
          description: event.description,
          required: event.required,
          displayOrder: event.displayOrder,
        },
      };

      const result = await executionEngine.execute(execContext);

      if (result.state === ExecutionState.Failed) {
        const handler = getHandler(event.type);
        if (handler) {
          await handler.onTrigger(event);
        }
        return;
      }

      const handler = getHandler(event.type);
      if (handler && result.decision !== ExecutionDecision.Ignore) {
        try {
          const state = await handler.onTrigger(event);
          if (state === VideoEventState.Error) {
            console.error(`[EventDispatcher] Handler error for event ${event.id} (${event.type})`);
          }
        } catch (error) {
          console.error(
            `[EventDispatcher] Handler exception for event ${event.id} (${event.type}):`,
            error,
          );
        }
      }
    },

    async skip(event: VideoEvent): Promise<void> {
      const handler = getHandler(event.type);
      if (!handler) return;

      try {
        await handler.onSkip(event);
      } catch (error) {
        console.error(
          `[EventDispatcher] Skip exception for event ${event.id} (${event.type}):`,
          error,
        );
      }
    },
  };
}

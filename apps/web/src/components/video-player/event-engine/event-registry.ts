import type { VideoEventHandler, VideoEventRegistry } from "./types";

export function createEventRegistry(): VideoEventRegistry {
  const handlers = new Map<string, VideoEventHandler>();

  return {
    register(handler: VideoEventHandler): void {
      const type = handler.eventType.toUpperCase();
      handlers.set(type, handler);
    },

    unregister(eventType: string): void {
      handlers.delete(eventType.toUpperCase());
    },

    getHandler(eventType: string): VideoEventHandler | null {
      return handlers.get(eventType.toUpperCase()) ?? null;
    },

    hasHandler(eventType: string): boolean {
      return handlers.has(eventType.toUpperCase());
    },
  };
}

import { Injectable, Logger } from "@nestjs/common";
import type { VideoEventHandler } from "../interfaces/video-event-handler.interface";

@Injectable()
export class VideoEventRegistryService {
  private readonly logger = new Logger(VideoEventRegistryService.name);
  private readonly handlers = new Map<string, VideoEventHandler>();

  register(handler: VideoEventHandler): void {
    const type = handler.eventType.toUpperCase();
    if (this.handlers.has(type)) {
      this.logger.warn(`Handler for event type "${type}" is already registered. Skipping duplicate.`);
      return;
    }
    this.handlers.set(type, handler);
    this.logger.log(`Handler registered for event type: "${type}"`);
  }

  unregister(eventType: string): void {
    const type = eventType.toUpperCase();
    if (this.handlers.delete(type)) {
      this.logger.log(`Handler unregistered for event type: "${type}"`);
    }
  }

  getHandler(eventType: string): VideoEventHandler | null {
    return this.handlers.get(eventType.toUpperCase()) ?? null;
  }

  hasHandler(eventType: string): boolean {
    return this.handlers.has(eventType.toUpperCase());
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

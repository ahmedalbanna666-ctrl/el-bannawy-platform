import { Injectable, Logger } from "@nestjs/common";
import { ExecutionService } from "../../execution/execution.service";
import type { VideoEventPayload } from "../interfaces/video-event-handler.interface";

@Injectable()
export class VideoEventDispatcherService {
  private readonly logger = new Logger(VideoEventDispatcherService.name);

  constructor(private readonly executionService: ExecutionService) {}

  async dispatch(event: VideoEventPayload): Promise<void> {
    try {
      const context = {
        videoId: event.videoId,
        eventId: typeof event.payload.videoEventId === "string" ? event.payload.videoEventId : event.videoId,
        pluginType: event.type,
        userId: "",
        currentTime: event.timestamp,
        playbackState: "PLAYING",
        eventPayload: event.payload,
        metadata: {
          title: event.title,
          description: event.description,
          required: event.required,
          displayOrder: event.displayOrder,
        },
      };
      const result = await this.executionService.execute(context);
      this.logger.debug(`Event "${event.type}" at ${String(event.timestamp)}s → decision=${result.decision} state=${result.state}`);
    } catch (error) {
      this.logger.error(`Execution for event type "${event.type}" failed:`, error instanceof Error ? error.message : String(error));
    }
  }

  skip(event: VideoEventPayload): void {
    this.logger.debug(`Event "${event.type}" at ${String(event.timestamp)}s skipped`);
  }
}

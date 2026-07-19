import { Injectable, Logger } from "@nestjs/common";
import { VideoEventHandlerState, type VideoEventHandler, type VideoEventPayload } from "../video-event/interfaces/video-event-handler.interface";
import { VideoQuestionExecutor } from "./video-question.executor";
import { VideoQuestionRepository } from "./video-question.repository";
import { VideoQuestionMapper } from "./video-question.mapper";

@Injectable()
export class VideoQuestionHandler implements VideoEventHandler {
  private readonly logger = new Logger(VideoQuestionHandler.name);

  readonly eventType = "QUESTION";

  constructor(
    private readonly executor: VideoQuestionExecutor,
    private readonly repository: VideoQuestionRepository,
    private readonly mapper: VideoQuestionMapper,
  ) {}

  canHandle(type: string): boolean {
    return type.toUpperCase() === "QUESTION";
  }

  async onTrigger(payload: VideoEventPayload): Promise<VideoEventHandlerState> {
    try {
      const videoEventId = payload.payload.videoEventId as string;
      if (!videoEventId) {
        this.logger.warn("No videoEventId in payload");
        return VideoEventHandlerState.Skipped;
      }
      const record = await this.repository.findByVideoEventId(videoEventId);
      if (!record) {
        this.logger.warn(`No question found for videoEventId: ${videoEventId}`);
        return VideoEventHandlerState.Skipped;
      }
      const question = this.mapper.toDomain(record);
      this.logger.debug(`Question triggered: ${question.id} type=${question.type} title="${question.title}"`);
      return VideoEventHandlerState.Triggered;
    } catch (error) {
      this.logger.error("Error in question onTrigger", error);
      return VideoEventHandlerState.Error;
    }
  }

  onSkip(_payload: VideoEventPayload): Promise<VideoEventHandlerState> {
    this.logger.debug("Question skipped");
    return Promise.resolve(VideoEventHandlerState.Skipped);
  }
}

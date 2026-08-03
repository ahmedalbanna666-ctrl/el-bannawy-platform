import { Injectable, Logger } from "@nestjs/common";
import { VideoEventHandlerState, type VideoEventHandler, type VideoEventPayload } from "../video-event/interfaces/video-event-handler.interface";
import { VideoQuestionRepository } from "./video-question.repository";
import { VideoQuestionMapper } from "./video-question.mapper";
import { AuditService } from "../common/services/audit.service";

@Injectable()
export class VideoQuestionHandler implements VideoEventHandler {
  private readonly logger = new Logger(VideoQuestionHandler.name);

  readonly eventType = "QUESTION";

  constructor(
    private readonly repository: VideoQuestionRepository,
    private readonly mapper: VideoQuestionMapper,
    private readonly audit: AuditService,
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

      await this.audit.log({
        actorId: "",
        action: "VIDEO_QUESTION_TRIGGERED",
        entity: "VideoQuestion",
        entityId: question.id,
        details: `Question triggered at ${String(payload.timestamp)}s in video ${payload.videoId}`,
      });

      return VideoEventHandlerState.Completed;
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

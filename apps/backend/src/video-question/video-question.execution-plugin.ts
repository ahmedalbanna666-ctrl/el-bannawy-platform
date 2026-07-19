import { Injectable, Logger } from "@nestjs/common";
import { ExecutionState, ExecutionDecision, type ExecutionContext, type ExecutionPlugin, type ExecutionResult } from "../execution/interfaces";
import { VideoQuestionRepository } from "./video-question.repository";
import { VideoQuestionMapper } from "./video-question.mapper";

@Injectable()
export class VideoQuestionExecutionPlugin implements ExecutionPlugin {
  private readonly logger = new Logger(VideoQuestionExecutionPlugin.name);

  readonly pluginType = "QUESTION";

  constructor(
    private readonly repository: VideoQuestionRepository,
    private readonly mapper: VideoQuestionMapper,
  ) {}

  canExecute(context: ExecutionContext): boolean {
    return context.pluginType.toUpperCase() === "QUESTION";
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const videoEventId = context.eventPayload.videoEventId as string | undefined;
    if (!videoEventId) {
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Fail,
        message: "No videoEventId in execution context payload",
        score: 0,
        data: {},
        errors: ["Missing videoEventId in eventPayload"],
        warnings: [],
      };
    }

    const record = await this.repository.findByVideoEventId(videoEventId);
    if (!record) {
      return {
        success: false,
        state: ExecutionState.Failed,
        decision: ExecutionDecision.Ignore,
        message: `No question found for videoEventId: ${videoEventId}`,
        score: 0,
        data: {},
        errors: ["Question not found for this video event"],
        warnings: [],
      };
    }

    const question = this.mapper.toPublic(record);
    this.logger.debug(`Question plugin executed: ${question.id} type=${question.type} title="${question.title}"`);

    return {
      success: true,
      state: ExecutionState.Completed,
      decision: ExecutionDecision.Stop,
      message: "Question ready for student",
      score: 0,
      data: {
        question: { ...question },
      },
      errors: [],
      warnings: [],
    };
  }
}

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { VideoQuestionValidator } from "./video-question.validator";
import { VideoQuestionMapper } from "./video-question.mapper";
import { VideoQuestionRepository } from "./video-question.repository";
import type { IVideoQuestionAnswer, IVideoQuestionResult } from "./interfaces";

@Injectable()
export class VideoQuestionExecutor {
  private readonly logger = new Logger(VideoQuestionExecutor.name);

  constructor(
    private readonly validator: VideoQuestionValidator,
    private readonly mapper: VideoQuestionMapper,
    private readonly repository: VideoQuestionRepository,
  ) {}

  async execute(questionId: string, answer: IVideoQuestionAnswer): Promise<IVideoQuestionResult> {
    const record = await this.repository.findById(questionId);
    if (!record) {
      throw new NotFoundException(`Question not found: ${questionId}`);
    }

    const question = this.mapper.toDomain(record);

    for (const optionId of answer.selectedOptionIds) {
      const belongs = question.options.some((o) => o.id === optionId);
      if (!belongs) {
        return {
          questionId,
          correct: false,
          score: 0,
          maxScore: 1,
          message: `Option ${optionId} does not belong to this question`,
        };
      }
    }

    const validation = this.validator.validate(question, answer);
    this.logger.debug(
      `Question ${questionId} validated: correct=${String(validation.correct)}, score=${String(validation.score)}/${String(validation.maxScore)}`,
    );

    return {
      questionId,
      correct: validation.correct,
      score: validation.score,
      maxScore: validation.maxScore,
      message: validation.correct ? "Correct" : validation.errors[0] ?? "Incorrect",
    };
  }
}

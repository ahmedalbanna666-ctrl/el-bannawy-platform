import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { IVideoQuestion, IVideoQuestionOption, IVideoQuestionPublic, IVideoQuestionOptionPublic, VideoQuestionType } from "./interfaces";
import { VIDEO_QUESTION_INCLUDE } from "./video-question.repository";

type VideoQuestionWithOptions = Prisma.VideoQuestionGetPayload<{
  include: typeof VIDEO_QUESTION_INCLUDE;
}>;

@Injectable()
export class VideoQuestionMapper {
  toDomain(prisma: VideoQuestionWithOptions): IVideoQuestion {
    return {
      id: prisma.id,
      videoEventId: prisma.videoEventId,
      type: prisma.type as VideoQuestionType,
      title: prisma.title,
      instructions: prisma.instructions,
      displayOrder: prisma.displayOrder,
      metadata: prisma.metadata as Record<string, unknown>,
      options: prisma.options.map((opt) => this.toOptionDomain(opt)),
    };
  }

  toPublic(prisma: VideoQuestionWithOptions): IVideoQuestionPublic {
    return {
      id: prisma.id,
      videoEventId: prisma.videoEventId,
      type: prisma.type as VideoQuestionType,
      title: prisma.title,
      instructions: prisma.instructions,
      displayOrder: prisma.displayOrder,
      metadata: prisma.metadata as Record<string, unknown>,
      options: prisma.options.map((opt) => this.toOptionPublic(opt)),
    };
  }

  toPublicFromDomain(question: IVideoQuestion): IVideoQuestionPublic {
    return {
      id: question.id,
      videoEventId: question.videoEventId,
      type: question.type,
      title: question.title,
      instructions: question.instructions,
      displayOrder: question.displayOrder,
      metadata: question.metadata,
      options: question.options.map((opt) => ({
        id: opt.id,
        questionId: opt.questionId,
        text: opt.text,
        displayOrder: opt.displayOrder,
        metadata: opt.metadata,
      })),
    };
  }

  toOptionDomain(prisma: VideoQuestionWithOptions["options"][number]): IVideoQuestionOption {
    return {
      id: prisma.id,
      questionId: prisma.questionId,
      text: prisma.text,
      isCorrect: prisma.isCorrect,
      displayOrder: prisma.displayOrder,
      metadata: prisma.metadata as Record<string, unknown>,
    };
  }

  toOptionPublic(prisma: VideoQuestionWithOptions["options"][number]): IVideoQuestionOptionPublic {
    return {
      id: prisma.id,
      questionId: prisma.questionId,
      text: prisma.text,
      displayOrder: prisma.displayOrder,
      metadata: prisma.metadata as Record<string, unknown>,
    };
  }
}

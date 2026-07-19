import { Injectable } from "@nestjs/common";
import type { Prisma, VideoQuestionOption } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const VIDEO_QUESTION_INCLUDE = {
  options: { orderBy: { displayOrder: "asc" } },
} as const;

type VideoQuestionWithOptions = Prisma.VideoQuestionGetPayload<{
  include: typeof VIDEO_QUESTION_INCLUDE;
}>;

@Injectable()
export class VideoQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVideoEventId(videoEventId: string): Promise<VideoQuestionWithOptions | null> {
    return this.prisma.videoQuestion.findUnique({
      where: { videoEventId },
      include: VIDEO_QUESTION_INCLUDE,
    });
  }

  async findById(id: string): Promise<VideoQuestionWithOptions | null> {
    return this.prisma.videoQuestion.findUnique({
      where: { id },
      include: VIDEO_QUESTION_INCLUDE,
    });
  }

  async create(data: Prisma.VideoQuestionCreateInput): Promise<VideoQuestionWithOptions> {
    return this.prisma.videoQuestion.create({
      data,
      include: VIDEO_QUESTION_INCLUDE,
    });
  }

  async update(id: string, data: Prisma.VideoQuestionUpdateInput): Promise<VideoQuestionWithOptions> {
    return this.prisma.videoQuestion.update({
      where: { id },
      data,
      include: VIDEO_QUESTION_INCLUDE,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.videoQuestion.delete({ where: { id } });
  }

  async findOptionsByQuestionId(questionId: string): Promise<readonly VideoQuestionOption[]> {
    return this.prisma.videoQuestionOption.findMany({
      where: { questionId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async deleteOptionsByQuestionId(questionId: string): Promise<void> {
    await this.prisma.videoQuestionOption.deleteMany({
      where: { questionId },
    });
  }

  async createOption(
    questionId: string,
    data: {
      text: string;
      isCorrect: boolean;
      displayOrder: number;
      metadata: Record<string, unknown>;
    },
  ): Promise<VideoQuestionOption> {
    return this.prisma.videoQuestionOption.create({
      data: {
        questionId,
        text: data.text,
        isCorrect: data.isCorrect,
        displayOrder: data.displayOrder,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }
}

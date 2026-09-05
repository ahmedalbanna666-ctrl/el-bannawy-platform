import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { VideoQuestionRepository } from "./video-question.repository";
import { VideoQuestionMapper } from "./video-question.mapper";
import type {
  CreateVideoQuestionDto,
  UpdateVideoQuestionDto,
  AnswerVideoQuestionDto,
  CreateVideoQuestionWithEventDto,
} from "./dto";
import type { IVideoQuestion, IVideoQuestionPublic, IVideoQuestionResult } from "./interfaces";
import { VideoQuestionExecutor } from "./video-question.executor";
import { AcademicContextService } from "../common/services/academic-context.service";

@Injectable()
export class VideoQuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: VideoQuestionRepository,
    private readonly mapper: VideoQuestionMapper,
    private readonly executor: VideoQuestionExecutor,
    private readonly academicContext: AcademicContextService,
  ) {}

  async getByVideoEventId(videoEventId: string): Promise<IVideoQuestionPublic | null> {
    const record = await this.repository.findByVideoEventId(videoEventId);
    if (!record) return null;
    return this.mapper.toPublic(record);
  }

  async getByVideoEventIdFull(videoEventId: string): Promise<IVideoQuestion | null> {
    const record = await this.repository.findByVideoEventId(videoEventId);
    if (!record) return null;
    return this.mapper.toDomain(record);
  }

  async getById(id: string): Promise<IVideoQuestionPublic | null> {
    const record = await this.repository.findById(id);
    if (!record) return null;
    return this.mapper.toPublic(record);
  }

  async create(dto: CreateVideoQuestionDto): Promise<IVideoQuestion> {
    const existing = await this.repository.findByVideoEventId(dto.videoEventId);
    if (existing) {
      throw new ConflictException("A question already exists for this video event");
    }
    const record = await this.repository.create({
      videoEvent: { connect: { id: dto.videoEventId } },
      type: dto.type,
      title: dto.title,
      instructions: dto.instructions ?? null,
      displayOrder: dto.displayOrder ?? 0,
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      options: {
        createMany: {
          data: dto.options.map((opt, idx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            displayOrder: opt.displayOrder ?? idx,
            metadata: (opt.metadata ?? {}) as Prisma.InputJsonValue,
          })),
        },
      },
    });
    return this.mapper.toDomain(record);
  }

  async createWithEvent(dto: CreateVideoQuestionWithEventDto, userId: string): Promise<{ event: unknown; question: IVideoQuestion }> {
    const video = await this.prisma.lessonVideo.findUnique({
      where: { id: dto.videoId },
      select: { lessonId: true },
    });
    if (!video) throw new NotFoundException("Video not found");
    await this.academicContext.verifyTeacherLessonAccess(userId, video.lessonId);

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.videoEvent.create({
        data: {
          videoId: dto.videoId,
          timestamp: dto.timestamp,
          type: "QUESTION",
          title: dto.title,
          description: dto.description ?? "",
          required: dto.required ?? true,
          enabled: true,
          displayOrder: dto.displayOrder ?? 0,
          payload: {},
        },
      });

      const question = await tx.videoQuestion.create({
        data: {
          videoEventId: event.id,
          type: dto.type,
          title: dto.title,
          instructions: dto.instructions ?? null,
          displayOrder: dto.displayOrder ?? 0,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          options: {
            createMany: {
              data: dto.options.map((opt, idx) => ({
                text: opt.text,
                isCorrect: opt.isCorrect ?? false,
                displayOrder: opt.displayOrder ?? idx,
                metadata: (opt.metadata ?? {}) as Prisma.InputJsonValue,
              })),
            },
          },
        },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
        },
      });

      const questionDomain = this.mapper.toDomain(question);
      return { event, question: questionDomain };
    });
  }

  async update(id: string, dto: UpdateVideoQuestionDto): Promise<IVideoQuestion> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Video question not found");
    }

    return this.prisma.$transaction(async (tx) => {
      if (
        dto.type !== undefined ||
        dto.title !== undefined ||
        dto.instructions !== undefined ||
        dto.displayOrder !== undefined ||
        dto.metadata !== undefined
      ) {
        const updateData: Record<string, unknown> = {};
        if (dto.type !== undefined) updateData.type = dto.type;
        if (dto.title !== undefined) updateData.title = dto.title;
        if (dto.instructions !== undefined) updateData.instructions = dto.instructions;
        if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
        if (dto.metadata !== undefined) updateData.metadata = dto.metadata;
        await tx.videoQuestion.update({ where: { id }, data: updateData });
      }

      if (dto.options) {
        await tx.videoQuestionOption.deleteMany({ where: { questionId: id } });
        await tx.videoQuestionOption.createMany({
          data: dto.options.map((opt, idx) => ({
            questionId: id,
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            displayOrder: opt.displayOrder ?? idx,
            metadata: (opt.metadata ?? {}) as Prisma.InputJsonValue,
          })),
        });
      }

      if (dto.timestamp !== undefined) {
        await tx.videoEvent.update({
          where: { id: existing.videoEventId },
          data: { timestamp: dto.timestamp },
        });
      }

      const updated = await tx.videoQuestion.findUnique({
        where: { id },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
        },
      });
      if (!updated) {
        throw new NotFoundException("Video question not found after update");
      }
      return this.mapper.toDomain(updated);
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Video question not found");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.videoQuestion.delete({ where: { id } });
      await tx.videoEvent.delete({ where: { id: existing.videoEventId } });
    });
  }

  async answer(dto: AnswerVideoQuestionDto, userId: string): Promise<IVideoQuestionResult> {
    const result = await this.executor.execute(dto.questionId, {
      questionId: dto.questionId,
      selectedOptionIds: dto.selectedOptionIds,
      text: dto.text,
    });

    await this.repository.upsertAnswer({
      questionId: dto.questionId,
      userId,
      selectedOptionIds: dto.selectedOptionIds,
      text: dto.text ?? null,
      correct: result.correct,
      score: result.score,
      maxScore: result.maxScore,
    });

    return result;
  }
}

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import { AcademicContextService } from "../common/services/academic-context.service";
import { AuditService } from "../common/services/audit.service";
import type {
  CreateStoryDto,
  UpdateStoryDto,
  PublishStoryDto,
  CreateChapterDto,
  UpdateChapterDto,
  PublishChapterDto,
  ReorderChaptersDto,
} from "./dto/story.dto";

@Injectable()
export class StoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly audit: AuditService,
  ) {}

  async getStoriesForManagement(
    userId: string,
    academicYearId?: string,
    termId?: string,
    gradeId?: string,
    educationalSystem?: string,
  ): Promise<unknown[]> {
    const gradeIds = await this.academicContext.getTeacherGradeIds(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return this.prisma.story.findMany({
      orderBy: { displayOrder: "asc" },
      where: {
        deletedAt: null,
        AND: [
          {
            gradeId: {
              in: user?.role === "ADMINISTRATOR" ? undefined : [...gradeIds],
            },
          },
          ...(gradeId ? [{ gradeId }] : []),
          ...(academicYearId ? [{ academicYearId }] : []),
          ...(termId ? [{ termId }] : []),
          ...(educationalSystem ? [{ educationalSystem }] : []),
        ],
      },
      include: {
        grade: { include: { stage: { select: { id: true, name: true } } } },
        _count: { select: { chapters: true } },
      },
    });
  }

  async getStoryForManagement(id: string, userId: string): Promise<unknown> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        grade: { include: { stage: { select: { id: true, name: true } } } },
        chapters: { orderBy: { displayOrder: "asc" } },
      },
    });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);
    return story;
  }

  async createStory(dto: CreateStoryDto, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId);
    await this.validateAcademicContext(dto.academicYearId, dto.termId);

    const story = await this.prisma.story.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        gradeId: dto.gradeId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        educationalSystem: dto.educationalSystem,
        displayOrder: dto.displayOrder ?? 0,
      },
    });

    await this.audit.log({ actorId: userId, action: "STORY_CREATED", entity: "Story", entityId: story.id });
    return story;
  }

  async updateStory(id: string, dto: UpdateStoryDto, userId: string): Promise<unknown> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: { id: true, gradeId: true, academicYearId: true, termId: true, educationalSystem: true, deletedAt: true },
    });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    if (dto.academicYearId || dto.termId || dto.gradeId) {
      const ay = dto.academicYearId ?? story.academicYearId;
      const t = dto.termId ?? story.termId;
      if (dto.gradeId) await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId);
      await this.validateAcademicContext(ay, t);
    }

    const updated = await this.prisma.story.update({ where: { id }, data: dto });
    await this.audit.log({ actorId: userId, action: "STORY_UPDATED", entity: "Story", entityId: id });
    return updated;
  }

  async deleteStory(id: string, userId: string): Promise<void> {
    const story = await this.prisma.story.findUnique({ where: { id }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    await this.prisma.story.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ actorId: userId, action: "STORY_DELETED", entity: "Story", entityId: id });
  }

  async publishStory(id: string, dto: PublishStoryDto, userId: string): Promise<unknown> {
    const story = await this.prisma.story.findUnique({ where: { id }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    const updated = await this.prisma.story.update({ where: { id }, data: { published: dto.published } });
    await this.audit.log({ actorId: userId, action: dto.published ? "STORY_PUBLISHED" : "STORY_UNPUBLISHED", entity: "Story", entityId: id });
    return updated;
  }

  async createChapter(storyId: string, dto: CreateChapterDto, userId: string): Promise<unknown> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    const chapter = await this.prisma.storyChapter.create({
      data: {
        storyId,
        title: dto.title,
        content: (dto.content as Prisma.InputJsonValue) ?? undefined,
        imageUrl: dto.imageUrl ?? null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
    await this.audit.log({ actorId: userId, action: "STORY_CHAPTER_CREATED", entity: "StoryChapter", entityId: chapter.id });
    return chapter;
  }

  async updateChapter(storyId: string, chapterId: string, dto: UpdateChapterDto, userId: string): Promise<unknown> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    const chapter = await this.prisma.storyChapter.findFirst({ where: { id: chapterId, storyId } });
    if (!chapter) throw new NotFoundException("Chapter not found");

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content as Prisma.InputJsonValue;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.published !== undefined) data.published = dto.published;

    const updated = await this.prisma.storyChapter.update({ where: { id: chapterId }, data });
    await this.audit.log({ actorId: userId, action: "STORY_CHAPTER_UPDATED", entity: "StoryChapter", entityId: chapterId });
    return updated;
  }

  async deleteChapter(storyId: string, chapterId: string, userId: string): Promise<void> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    await this.prisma.storyChapter.delete({ where: { id: chapterId } });
    await this.audit.log({ actorId: userId, action: "STORY_CHAPTER_DELETED", entity: "StoryChapter", entityId: chapterId });
  }

  async publishChapter(storyId: string, chapterId: string, dto: PublishChapterDto, userId: string): Promise<unknown> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    const updated = await this.prisma.storyChapter.update({
      where: { id: chapterId },
      data: { published: dto.published },
    });
    await this.audit.log({ actorId: userId, action: dto.published ? "STORY_CHAPTER_PUBLISHED" : "STORY_CHAPTER_UNPUBLISHED", entity: "StoryChapter", entityId: chapterId });
    return updated;
  }

  async reorderChapters(storyId: string, dto: ReorderChaptersDto, userId: string): Promise<void> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { id: true, gradeId: true, deletedAt: true } });
    if (!story || story.deletedAt) throw new NotFoundException("Story not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, story.gradeId);

    const chapters = await this.prisma.storyChapter.findMany({
      where: { storyId },
      select: { id: true },
    });
    const existingIds = new Set(chapters.map((c) => c.id));
    for (const id of dto.chapterIds) {
      if (!existingIds.has(id)) throw new BadRequestException(`Chapter ${id} does not belong to this Story`);
    }

    await this.prisma.$transaction(
      dto.chapterIds.map((id, index) =>
        this.prisma.storyChapter.update({ where: { id }, data: { displayOrder: index } }),
      ),
    );
    await this.audit.log({ actorId: userId, action: "STORY_CHAPTERS_REORDERED", entity: "Story", entityId: storyId });
  }

  async getStoriesForStudent(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, gradeId: true, academicYearId: true, termId: true, educationalSystem: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const isStudent = user.role === "STUDENT";

    const where: Record<string, unknown> = { published: true, deletedAt: null };

    if (isStudent) {
      if (!user.gradeId || !user.academicYearId || !user.termId) {
        throw new ForbiddenException("Academic context not assigned");
      }
      where.gradeId = user.gradeId;
      where.academicYearId = user.academicYearId;
      where.termId = user.termId;
      if (user.educationalSystem) {
        where.educationalSystem = user.educationalSystem;
      }
    }

    return this.prisma.story.findMany({
      orderBy: { displayOrder: "asc" },
      where,
      include: {
        chapters: {
          where: { published: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  }

  async getStoryForStudent(id: string, userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, gradeId: true, academicYearId: true, termId: true, educationalSystem: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const isStudent = user.role === "STUDENT";

    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        chapters: {
          where: { published: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!story || story.deletedAt || !story.published) throw new NotFoundException("Story not found");

    if (isStudent) {
      if (!user.gradeId || !user.academicYearId || !user.termId) {
        throw new ForbiddenException("Academic context not assigned");
      }
      if (story.gradeId !== user.gradeId || story.academicYearId !== user.academicYearId || story.termId !== user.termId) {
        throw new ForbiddenException("Story not available in your academic context");
      }
      if (user.educationalSystem && story.educationalSystem !== user.educationalSystem) {
        throw new ForbiddenException("Story not available in your educational system");
      }
    }

    return story;
  }

  private async validateAcademicContext(academicYearId: string, termId: string): Promise<void> {
    const year = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!year) throw new BadRequestException("Academic year not found");

    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new BadRequestException("Term not found");
    if (term.academicYearId !== academicYearId) {
      throw new BadRequestException("Term does not belong to the selected academic year");
    }
  }
}

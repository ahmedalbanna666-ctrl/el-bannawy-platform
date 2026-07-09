import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import type {
  CreateUnitDto,
  UpdateUnitDto,
  CreateLessonDto,
  UpdateLessonDto,
} from "./dto/curriculum.dto";

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
  ) {}

  async getCurriculum(userId: string): Promise<unknown[]> {
    const ctx = await this.academicContext.getStudentContext(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Students with assigned grade: filter by academic context
    if (user?.role === "STUDENT") {
      if (!ctx?.gradeId || !ctx.academicYearId || !ctx.termId) {
        return [];
      }
      const grade = await this.prisma.grade.findUnique({
        where: { id: ctx.gradeId },
        select: { stageId: true },
      });

      return this.prisma.stage.findMany({
        where: { id: grade?.stageId },
        orderBy: { displayOrder: "asc" },
        include: {
          grades: {
            where: { id: ctx.gradeId },
            orderBy: { displayOrder: "asc" },
            include: {
              units: {
                orderBy: { displayOrder: "asc" },
                where: {
                  published: true,
                  gradeId: ctx.gradeId,
                  academicYearId: ctx.academicYearId,
                  termId: ctx.termId,
                  ...(ctx.educationalSystem
                    ? {
                        OR: [
                          { educationalSystem: ctx.educationalSystem },
                          { educationalSystem: null },
                        ],
                      }
                    : {}),
                },
                include: {
                  lessons: {
                    orderBy: { displayOrder: "asc" },
                    where: { published: true },
                    select: {
                      id: true,
                      title: true,
                      displayOrder: true,
                      estimatedDuration: true,
                      isPremium: true,
                      sequentialMode: true,
                      homeworkEnabled: true,
                      quizEnabled: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Teachers/Admins or students without context: return all published
    return this.prisma.stage.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        grades: {
          orderBy: { displayOrder: "asc" },
          include: {
            units: {
              orderBy: { displayOrder: "asc" },
              where: { published: true },
              include: {
                lessons: {
                  orderBy: { displayOrder: "asc" },
                  where: { published: true },
                  select: {
                    id: true,
                    title: true,
                    displayOrder: true,
                    estimatedDuration: true,
                    isPremium: true,
                    sequentialMode: true,
                    homeworkEnabled: true,
                    quizEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getContinueLearning(userId: string): Promise<unknown> {
    const ctx = await this.academicContext.getStudentContext(userId);
    const lastProgress = await this.prisma.lessonProgress.findFirst({
      where: {
        userId,
        completed: false,
        ...(ctx?.gradeId && ctx.academicYearId && ctx.termId
          ? {
              lesson: {
                unit: {
                  gradeId: ctx.gradeId,
                  academicYearId: ctx.academicYearId,
                  termId: ctx.termId,
                  ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}),
                },
              },
            }
          : {}),
      },
      orderBy: { startedAt: "desc" },
      include: {
        lesson: {
          select: { id: true, title: true, displayOrder: true, estimatedDuration: true },
        },
      },
    });

    if (!lastProgress) {
      const firstLesson = await this.prisma.lesson.findFirst({
        where: {
          published: true,
          ...(ctx?.gradeId && ctx.academicYearId && ctx.termId
            ? {
                unit: {
                  gradeId: ctx.gradeId,
                  academicYearId: ctx.academicYearId,
                  termId: ctx.termId,
                  ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}),
                },
              }
            : {}),
        },
        orderBy: [{ unit: { displayOrder: "asc" } }, { displayOrder: "asc" }],
        select: { id: true, title: true, displayOrder: true, estimatedDuration: true },
      });

      if (!firstLesson) return null;

      return {
        lessonId: firstLesson.id,
        lessonTitle: firstLesson.title,
        progress: 0,
        lessonOrder: firstLesson.displayOrder,
        resumeAt: 0,
      };
    }

    // Get all video IDs for this lesson
    const lessonVideos = await this.prisma.lessonVideo.findMany({
      where: { lessonId: lastProgress.lesson.id, enabled: true },
      select: { id: true },
    });
    const videoIds = lessonVideos.map((v) => v.id);

    const lastVideoProgress = videoIds.length > 0
      ? await this.prisma.videoProgress.findFirst({
          where: { userId, videoId: { in: videoIds } },
          orderBy: { updatedAt: "desc" },
        })
      : null;

    return {
      lessonId: lastProgress.lesson.id,
      lessonTitle: lastProgress.lesson.title,
      progress: lastProgress.progress,
      lessonOrder: lastProgress.lesson.displayOrder,
      resumeAt: lastVideoProgress?.lastPosition ?? 0,
      videoId: lastVideoProgress?.videoId ?? null,
    };
  }

  async getOverallProgress(userId: string): Promise<unknown> {
    const ctx = await this.academicContext.getStudentContext(userId);
    const academicFilter = ctx?.gradeId && ctx.academicYearId && ctx.termId
      ? {
          unit: {
            gradeId: ctx.gradeId,
            academicYearId: ctx.academicYearId,
            termId: ctx.termId,
            ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}),
          },
        }
      : {};

    const [totalLessons, completedLessons, lessonProgressRecords] = await Promise.all([
      this.prisma.lesson.count({ where: { published: true, ...academicFilter } }),
      this.prisma.lessonProgress.count({ where: { userId, completed: true } }),
      this.prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { select: { unitId: true } } },
      }),
    ]);

    const lessonsByUnit = await this.prisma.lesson.groupBy({
      by: ["unitId"],
      where: { published: true, ...academicFilter },
      _count: { id: true },
    });

    const unitTotalMap = new Map(lessonsByUnit.map((u) => [u.unitId, u._count.id]));
    const unitCompletedMap = new Map<string, number>();

    for (const record of lessonProgressRecords) {
      const unitId = record.lesson.unitId;
      if (unitTotalMap.has(unitId) && record.completed) {
        unitCompletedMap.set(unitId, (unitCompletedMap.get(unitId) ?? 0) + 1);
      }
    }

    const unitsProgress = Array.from(unitTotalMap.entries()).map(([unitId, total]) => {
      const completed = unitCompletedMap.get(unitId) ?? 0;
      return {
        unitId,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed: completed === total,
      };
    });

    return {
      totalLessons,
      completedLessons,
      overallProgress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      unitsProgress,
    };
  }

  async getLessonProgress(lessonId: string, userId: string): Promise<unknown> {
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    const progress = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const lessonVideos = await this.prisma.lessonVideo.findMany({
      where: { lessonId, enabled: true },
      select: { id: true },
    });
    const videoIds = lessonVideos.map((v) => v.id);

    const videoProgress = videoIds.length > 0
      ? await this.prisma.videoProgress.findMany({
          where: { userId, videoId: { in: videoIds } },
        })
      : [];

    return {
      lessonProgress: progress ?? { progress: 0, completed: false },
      videoProgress,
    };
  }

  async updateLessonProgress(lessonId: string, userId: string, progressValue: number): Promise<unknown> {
    await this.academicContext.verifyStudentLessonAccess(userId, lessonId);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { progress: progressValue },
      create: { userId, lessonId, progress: progressValue },
    });
  }

  // ── Unit Management ─────────────────────────────────────────────

  async getUnitsForManagement(
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

    return this.prisma.unit.findMany({
      orderBy: { displayOrder: "asc" },
      where: {
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
        grade: { include: { stage: true } },
        _count: { select: { lessons: true } },
      },
    });
  }

  async getUnitForManagement(
    id: string,
    userId: string,
  ): Promise<unknown> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        grade: { include: { stage: true } },
        lessons: {
          orderBy: { displayOrder: "asc" },
          include: {
            _count: {
              select: { videos: true, vocabulary: true },
            },
            document: true,
            homework: true,
            quiz: true,
          },
        },
      },
    });
    if (!unit) throw new NotFoundException("Unit not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, unit.gradeId);
    return unit;
  }

  async createUnit(dto: CreateUnitDto, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherGradeAccess(userId, dto.gradeId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { educationalSystem: true },
    });

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
      select: { id: true },
    });
    if (!academicYear) {
      throw new NotFoundException("Academic year not found");
    }

    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
      select: { academicYearId: true },
    });
    if (!term) {
      throw new NotFoundException("Term not found");
    }
    if (term.academicYearId !== dto.academicYearId) {
      throw new BadRequestException("Term does not belong to the selected academic year");
    }

    return this.prisma.unit.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        gradeId: dto.gradeId,
        displayOrder: dto.displayOrder ?? 0,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        educationalSystem: dto.educationalSystem ?? user?.educationalSystem ?? null,
        bookId: dto.bookId ?? null,
      },
    });
  }

  async updateUnit(
    id: string,
    dto: UpdateUnitDto,
    userId: string,
  ): Promise<unknown> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      select: { gradeId: true },
    });
    if (!unit) throw new NotFoundException("Unit not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, unit.gradeId);
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async deleteUnit(id: string, userId: string): Promise<unknown> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      select: { gradeId: true },
    });
    if (!unit) throw new NotFoundException("Unit not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, unit.gradeId);
    return this.prisma.unit.delete({ where: { id } });
  }

  // ── Lesson Management ───────────────────────────────────────────

  async createLesson(dto: CreateLessonDto, userId: string): Promise<unknown> {
    await this.academicContext.verifyTeacherUnitAccess(userId, dto.unitId);
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        unitId: dto.unitId,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async updateLesson(
    id: string,
    dto: UpdateLessonDto,
    userId: string,
  ): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { unit: { select: { gradeId: true } } },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, lesson.unit.gradeId);
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async deleteLesson(id: string, userId: string): Promise<unknown> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { unit: { select: { gradeId: true } } },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.academicContext.verifyTeacherGradeAccess(userId, lesson.unit.gradeId);
    return this.prisma.lesson.delete({ where: { id } });
  }
}

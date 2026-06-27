import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurriculum(): Promise<unknown[]> {
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
    const lastProgress = await this.prisma.lessonProgress.findFirst({
      where: { userId, completed: false },
      orderBy: { startedAt: "desc" },
      include: {
        lesson: {
          select: { id: true, title: true, displayOrder: true, estimatedDuration: true },
        },
      },
    });

    if (!lastProgress) {
      const firstLesson = await this.prisma.lesson.findFirst({
        where: { published: true },
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
    const [totalLessons, completedLessons, lessonProgressRecords] = await Promise.all([
      this.prisma.lesson.count({ where: { published: true } }),
      this.prisma.lessonProgress.count({ where: { userId, completed: true } }),
      this.prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { select: { unitId: true } } },
      }),
    ]);

    // Calculate unit-level progress
    const lessonsByUnit = await this.prisma.lesson.groupBy({
      by: ["unitId"],
      where: { published: true },
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
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Lesson not found");

    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { progress: progressValue },
      create: { userId, lessonId, progress: progressValue },
    });
  }
}

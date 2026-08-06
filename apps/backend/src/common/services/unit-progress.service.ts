import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface UnitActivityProgress {
  unitId: string;
  unitName: string | null;
  /** Number of completed activities within the unit. */
  completedActivities: number;
  /** Total available activities (video + homework + quiz across lessons). */
  totalActivities: number;
  /** 0–100, based on completedActivities / totalActivities. */
  percent: number;
}

/**
 * Unit progress computed from the three lesson activities the student must
 * complete: watching the video(s), solving the homework, and passing the quiz.
 *
 * Each published lesson contributes up to 3 activities:
 *   - video: 1 activity if the lesson has at least one enabled video AND all of
 *     them are marked completed in `video_progress`.
 *   - homework: 1 activity if the lesson has a published homework AND the
 *     student has a submitted + passed attempt.
 *   - quiz: 1 activity if the lesson has a published quiz AND the student has a
 *     submitted + passed attempt.
 *
 * Lessons without a given activity (e.g. no homework configured) simply do not
 * count it, so the unit percentage reflects only the activities that exist.
 */
@Injectable()
export class UnitProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Map of videoId → lessonId for the requested video ids. */
  private async getVideoLessonMap(videoIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (videoIds.length === 0) return map;
    const rows = await this.prisma.lessonVideo.findMany({
      where: { id: { in: videoIds } },
      select: { id: true, lessonId: true },
    });
    for (const row of rows) map.set(row.id, row.lessonId);
    return map;
  }

  /**
   * Compute activity-based progress for a single unit.
   */
  async getUnitProgress(
    userId: string,
    unitId: string,
  ): Promise<UnitActivityProgress> {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        title: true,
        lessons: {
          where: { published: true },
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            videos: { where: { enabled: true }, select: { id: true } },
            homework: { select: { id: true } },
            quiz: { select: { id: true } },
          },
        },
      },
    });

    if (!unit) {
      return { unitId, unitName: null, completedActivities: 0, totalActivities: 0, percent: 0 };
    }

    const videoIds = unit.lessons.flatMap((l) => l.videos.map((v) => v.id));
    const homeworkIds = unit.lessons.flatMap((l) => (l.homework ? [l.homework.id] : []));
    const quizIds = unit.lessons.flatMap((l) => (l.quiz ? [l.quiz.id] : []));

    // Completed video activity per lesson: all enabled videos of that lesson
    // must be completed in video_progress.
    const completedVideoCounts = new Map<string, number>();
    if (videoIds.length > 0) {
      const videoLessonMap = await this.getVideoLessonMap(videoIds);
      const rows = await this.prisma.videoProgress.findMany({
        where: { userId, videoId: { in: videoIds }, completed: true },
        select: { videoId: true },
      });
      for (const row of rows) {
        const lessonId = videoLessonMap.get(row.videoId);
        if (lessonId) {
          completedVideoCounts.set(
            lessonId,
            (completedVideoCounts.get(lessonId) ?? 0) + 1,
          );
        }
      }
    }

    // Homework activity: at least one submitted + passed attempt.
    const passedHomework = new Set<string>();
    if (homeworkIds.length > 0) {
      const rows = await this.prisma.studentHomeworkAttempt.findMany({
        where: { userId, homeworkId: { in: homeworkIds }, submitted: true, passed: true },
        select: { homeworkId: true },
      });
      for (const row of rows) passedHomework.add(row.homeworkId);
    }

    // Quiz activity: at least one submitted + passed attempt.
    const passedQuizzes = new Set<string>();
    if (quizIds.length > 0) {
      const rows = await this.prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: quizIds }, submitted: true, passed: true },
        select: { quizId: true },
      });
      for (const row of rows) passedQuizzes.add(row.quizId);
    }

    let completedActivities = 0;
    let totalActivities = 0;

    for (const lesson of unit.lessons) {
      // Video
      if (lesson.videos.length > 0) {
        totalActivities += 1;
        if ((completedVideoCounts.get(lesson.id) ?? 0) >= lesson.videos.length) {
          completedActivities += 1;
        }
      }
      // Homework
      if (lesson.homework) {
        totalActivities += 1;
        if (passedHomework.has(lesson.homework.id)) completedActivities += 1;
      }
      // Quiz
      if (lesson.quiz) {
        totalActivities += 1;
        if (passedQuizzes.has(lesson.quiz.id)) completedActivities += 1;
      }
    }

    const percent = totalActivities > 0
      ? Math.min(100, Math.round((completedActivities / totalActivities) * 100))
      : 0;

    return {
      unitId,
      unitName: unit.title,
      completedActivities,
      totalActivities,
      percent,
    };
  }

  /**
   * Compute activity-based progress for multiple units in one pass.
   * Returns a Map<unitId, UnitActivityProgress>.
   */
  async getUnitsProgress(
    userId: string,
    unitIds: string[],
  ): Promise<Map<string, UnitActivityProgress>> {
    const result = new Map<string, UnitActivityProgress>();
    if (unitIds.length === 0) return result;

    const units = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: {
        id: true,
        title: true,
        lessons: {
          where: { published: true },
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            videos: { where: { enabled: true }, select: { id: true } },
            homework: { select: { id: true } },
            quiz: { select: { id: true } },
          },
        },
      },
    });

    const videoIds = units.flatMap((u) => u.lessons.flatMap((l) => l.videos.map((v) => v.id)));
    const homeworkIds = units.flatMap((u) => u.lessons.flatMap((l) => (l.homework ? [l.homework.id] : [])));
    const quizIds = units.flatMap((u) => u.lessons.flatMap((l) => (l.quiz ? [l.quiz.id] : [])));

    const completedVideoCounts = new Map<string, number>();
    if (videoIds.length > 0) {
      const videoLessonMap = await this.getVideoLessonMap(videoIds);
      const rows = await this.prisma.videoProgress.findMany({
        where: { userId, videoId: { in: videoIds }, completed: true },
        select: { videoId: true },
      });
      for (const row of rows) {
        const lessonId = videoLessonMap.get(row.videoId);
        if (lessonId) {
          completedVideoCounts.set(
            lessonId,
            (completedVideoCounts.get(lessonId) ?? 0) + 1,
          );
        }
      }
    }

    const passedHomework = new Set<string>();
    if (homeworkIds.length > 0) {
      const rows = await this.prisma.studentHomeworkAttempt.findMany({
        where: { userId, homeworkId: { in: homeworkIds }, submitted: true, passed: true },
        select: { homeworkId: true },
      });
      for (const row of rows) passedHomework.add(row.homeworkId);
    }

    const passedQuizzes = new Set<string>();
    if (quizIds.length > 0) {
      const rows = await this.prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: quizIds }, submitted: true, passed: true },
        select: { quizId: true },
      });
      for (const row of rows) passedQuizzes.add(row.quizId);
    }

    for (const unit of units) {
      let completedActivities = 0;
      let totalActivities = 0;

      for (const lesson of unit.lessons) {
        if (lesson.videos.length > 0) {
          totalActivities += 1;
          if ((completedVideoCounts.get(lesson.id) ?? 0) >= lesson.videos.length) {
            completedActivities += 1;
          }
        }
        if (lesson.homework) {
          totalActivities += 1;
          if (passedHomework.has(lesson.homework.id)) completedActivities += 1;
        }
        if (lesson.quiz) {
          totalActivities += 1;
          if (passedQuizzes.has(lesson.quiz.id)) completedActivities += 1;
        }
      }

      const percent = totalActivities > 0
        ? Math.min(100, Math.round((completedActivities / totalActivities) * 100))
        : 0;

      result.set(unit.id, {
        unitId: unit.id,
        unitName: unit.title,
        completedActivities,
        totalActivities,
        percent,
      });
    }

    return result;
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivity(activityId: string): Promise<unknown> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            question: true,
            options: true,
            displayOrder: true,
          },
        },
      },
    });

    if (!activity) throw new NotFoundException("Activity not found");
    return activity;
  }

  async startActivity(activityId: string, userId: string): Promise<unknown> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException("Activity not found");

    return this.prisma.activityProgress.upsert({
      where: { userId_activityId: { userId, activityId } },
      update: { startedAt: new Date() },
      create: { userId, activityId, startedAt: new Date() },
    });
  }

  async submitActivity(
    activityId: string,
    userId: string,
    response?: string,
    answers?: string[],
    clientScore?: number,
  ): Promise<unknown> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { questions: { orderBy: { displayOrder: "asc" } } },
    });
    if (!activity) throw new NotFoundException("Activity not found");

    let score = clientScore;

    // Auto-grade from config for single-answer activities
    if (score === undefined && activity.config !== null) {
      const config = JSON.parse(activity.config) as Record<string, unknown>;
      const correctAnswer = config.correctAnswer;

      if (correctAnswer !== undefined && answers !== undefined && answers.length > 0) {
        const correct = typeof correctAnswer === "string" ? correctAnswer.toLowerCase().trim() : "";
        const studentAnswer = answers[0].toLowerCase().trim();
        score = studentAnswer === correct ? 100 : 0;
      }
    }

    // Auto-grade via questions if present
    const questions = activity.questions;
    if (score === undefined && questions.length > 0 && answers !== undefined) {
      let correctCount = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
          if (typeof q.correctAnswer === "string") {
          if (q.correctAnswer.toLowerCase().trim() === answers[i].toLowerCase().trim()) {
            correctCount++;
          }
        }
      }
      score = Math.round((correctCount / questions.length) * 100);
    }

    const finalScore = Math.min(100, Math.max(0, score ?? 0));

    const progress = await this.prisma.activityProgress.upsert({
      where: { userId_activityId: { userId, activityId } },
      update: {
        completed: true,
        completedAt: new Date(),
        score: finalScore,
        response: response ?? (answers ? JSON.stringify(answers) : undefined),
      },
      create: {
        userId,
        activityId,
        completed: true,
        completedAt: new Date(),
        score: finalScore,
        response: response ?? (answers ? JSON.stringify(answers) : undefined),
      },
    });

    // Update video lesson progress
    const video = await this.prisma.lessonVideo.findUnique({
      where: { id: activity.videoId },
      select: { lessonId: true },
    });
    if (video !== null) {
      await this.updateVideoLessonProgress(video.lessonId, userId);
    }

    return {
      ...progress,
      score: finalScore,
      passed: finalScore >= 70,
    };
  }

  async getActivityProgress(activityId: string, userId: string): Promise<unknown> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException("Activity not found");

    const progress = await this.prisma.activityProgress.findUnique({
      where: { userId_activityId: { userId, activityId } },
    });

    return progress ?? { completed: false, score: null };
  }

  private async updateVideoLessonProgress(lessonId: string, userId: string): Promise<void> {
    const [videos, totalActivities] = await Promise.all([
      this.prisma.lessonVideo.findMany({
        where: { lessonId, enabled: true },
        select: { id: true },
      }),
      this.prisma.activity.count({
        where: { video: { lessonId, enabled: true } },
      }),
    ]);

    const videoIds = videos.map((v) => v.id);
    if (videoIds.length === 0) return;

    const [progressRecords, completedActivities] = await Promise.all([
      this.prisma.videoProgress.findMany({ where: { userId, videoId: { in: videoIds } } }),
      this.prisma.activityProgress.count({
        where: { userId, completed: true, activity: { videoId: { in: videoIds } } },
      }),
    ]);

    const completedVideos = progressRecords.filter((p) => p.completed).length;
    const totalVideos = videos.length;

    let progress = 0;
    if (totalVideos > 0) progress += Math.round((completedVideos / totalVideos) * 70);
    if (totalActivities > 0) progress += Math.round((completedActivities / totalActivities) * 30);

    const allDone = completedVideos === totalVideos && (totalActivities === 0 || completedActivities === totalActivities);

    const updateData: Record<string, unknown> = { progress, completed: allDone };
    if (allDone) updateData.completedAt = new Date();

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: updateData as never,
      create: {
        userId,
        lessonId,
        progress,
        completed: allDone,
        ...(allDone ? { completedAt: new Date() } : {}),
      },
    });
  }
}

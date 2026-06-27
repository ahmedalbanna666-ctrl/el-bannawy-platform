import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VideoService {
  constructor(private readonly prisma: PrismaService) {}

  async getVideo(videoId: string): Promise<unknown> {
    const video = await this.prisma.lessonVideo.findUnique({
      where: { id: videoId },
      include: {
        timelineEvents: {
          orderBy: { timestamp: "asc" },
        },
        activities: {
          orderBy: { displayOrder: "asc" },
          include: { questions: true },
        },
      },
    });

    if (!video) throw new NotFoundException("Video not found");
    return video;
  }

  async getVideoProgress(videoId: string, userId: string): Promise<unknown> {
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("Video not found");

    const progress = await this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    return progress ?? { watchedSeconds: 0, completed: false, lastPosition: 0 };
  }

  async updateProgress(videoId: string, userId: string, currentPosition: number, watchedSeconds?: number): Promise<unknown> {
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("Video not found");

    const existing = await this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    const newWatched = watchedSeconds !== undefined
      ? Math.max(existing?.watchedSeconds ?? 0, watchedSeconds)
      : existing?.watchedSeconds ?? 0;

    return this.prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { lastPosition: currentPosition, watchedSeconds: newWatched },
      create: { userId, videoId, lastPosition: currentPosition, watchedSeconds: newWatched },
    });
  }

  async completeVideo(videoId: string, userId: string): Promise<unknown> {
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("Video not found");

    // Check all required activities for this video are completed
    const requiredActivities = await this.prisma.activity.findMany({
      where: { videoId, required: true },
      select: { id: true },
    });

    if (requiredActivities.length > 0) {
      const requiredIds = requiredActivities.map((a) => a.id);
      const completedCount = await this.prisma.activityProgress.count({
        where: {
          userId,
          activityId: { in: requiredIds },
          completed: true,
        },
      });

      if (completedCount < requiredActivities.length) {
        throw new ForbiddenException("Complete all required lesson activities first");
      }
    }

    const progress = await this.prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: {
        completed: true,
        completedAt: new Date(),
        lastPosition: video.duration,
        watchedSeconds: video.duration,
      },
      create: {
        userId,
        videoId,
        completed: true,
        completedAt: new Date(),
        lastPosition: video.duration,
        watchedSeconds: video.duration,
      },
    });

    await this.updateLessonProgress(video.lessonId, userId);

    return progress;
  }

  async getResumeData(videoId: string, userId: string): Promise<unknown> {
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("Video not found");

    const progress = await this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    // Find incomplete required activities
    const allRequiredActivities = await this.prisma.activity.findMany({
      where: { videoId, required: true },
      select: { id: true, title: true, type: true, displayOrder: true },
    });

    const requiredIds = allRequiredActivities.map((a) => a.id);

    // Get completed activities for this user and video
    const completedActivities = requiredIds.length > 0
      ? await this.prisma.activityProgress.findMany({
          where: { userId, activityId: { in: requiredIds }, completed: true },
          select: { activityId: true },
        })
      : [];

    const completedActivityIds = new Set(completedActivities.map((a) => a.activityId));
    const incompleteOnes = allRequiredActivities.filter((a: { id: string }) => !completedActivityIds.has(a.id));

    return {
      resumePosition: progress?.lastPosition ?? 0,
      completed: progress?.completed ?? false,
      watchPercentage: video.duration > 0
        ? Math.round(((progress?.watchedSeconds ?? 0) / video.duration) * 100)
        : 0,
      incompleteRequiredActivities: incompleteOnes,
    };
  }

  async getTimelineEvents(videoId: string): Promise<unknown[]> {
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("Video not found");

    return this.prisma.timelineEvent.findMany({
      where: { videoId },
      orderBy: { timestamp: "asc" },
    });
  }

  async completeTimelineEvent(eventId: string, _userId: string): Promise<unknown> {
    const event = await this.prisma.timelineEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Timeline event not found");

    return { completed: true, eventId, resumeVideo: true };
  }

  private async updateLessonProgress(lessonId: string, userId: string): Promise<void> {
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

    const [progressRecords, completedActivities] = await Promise.all([
      videoIds.length > 0
        ? this.prisma.videoProgress.findMany({
            where: { userId, videoId: { in: videoIds } },
          })
        : Promise.resolve([]),
      videoIds.length > 0
        ? this.prisma.activityProgress.count({
            where: {
              userId,
              completed: true,
              activity: { videoId: { in: videoIds } },
            },
          })
        : Promise.resolve(0),
    ]);

    const totalVideos = videos.length;
    const completedVideos = progressRecords.filter((p: { completed: boolean }) => p.completed).length;

    let progress = 0;
    if (totalVideos > 0) {
      progress = Math.round((completedVideos / totalVideos) * 70);
    }
    if (totalActivities > 0) {
      progress += Math.round((completedActivities / totalActivities) * 30);
    }

    const allDone = completedVideos === totalVideos && (totalActivities === 0 || completedActivities === totalActivities);

    const updateData: Record<string, unknown> = { progress, completed: allDone };
    if (allDone) {
      updateData.completedAt = new Date();
    }

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

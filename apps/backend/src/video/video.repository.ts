import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const VIDEO_INCLUDE = {
  timelineEvents: { orderBy: { timestamp: "asc" as const } },
  activities: {
    orderBy: { displayOrder: "asc" as const },
    include: { questions: true },
  },
} as const;

export const VIDEO_BASIC_INCLUDE = {
  timelineEvents: { orderBy: { timestamp: "asc" as const } },
} as const;

type VideoWithIncludes = Prisma.LessonVideoGetPayload<{ include: typeof VIDEO_INCLUDE }>;
type VideoBasic = Prisma.LessonVideoGetPayload<{ include: typeof VIDEO_BASIC_INCLUDE }>;

@Injectable()
export class VideoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<VideoWithIncludes | null> {
    return this.prisma.lessonVideo.findUnique({
      where: { id },
      include: VIDEO_INCLUDE,
    });
  }

  async findByIdWithTimeline(id: string): Promise<VideoBasic | null> {
    return this.prisma.lessonVideo.findUnique({
      where: { id },
      include: VIDEO_BASIC_INCLUDE,
    });
  }

  async findByIdBasic(id: string): Promise<{ id: string; lessonId: string; duration: number } | null> {
    return this.prisma.lessonVideo.findUnique({
      where: { id },
      select: { id: true, lessonId: true, duration: true },
    });
  }

  async findLessonId(id: string): Promise<{ lessonId: string } | null> {
    return this.prisma.lessonVideo.findUnique({
      where: { id },
      select: { lessonId: true },
    });
  }

  async findProgress(userId: string, videoId: string): Promise<{
    watchedSeconds: number;
    completed: boolean;
    lastPosition: number;
  } | null> {
    return this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId, videoId } },
      select: { watchedSeconds: true, completed: true, lastPosition: true },
    });
  }

  async upsertProgress(
    userId: string,
    videoId: string,
    data: { lastPosition: number; watchedSeconds: number },
  ): Promise<unknown> {
    return this.prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: data,
      create: { userId, videoId, ...data },
    });
  }

  async findRequiredActivities(videoId: string): Promise<readonly { id: string }[]> {
    return this.prisma.activity.findMany({
      where: { videoId, required: true },
      select: { id: true },
    });
  }

  async findRequiredActivitiesWithDetails(videoId: string): Promise<
    readonly { id: string; title: string; type: string; displayOrder: number }[]
  > {
    return this.prisma.activity.findMany({
      where: { videoId, required: true },
      select: { id: true, title: true, type: true, displayOrder: true },
    });
  }

  async countRequiredCompleted(userId: string, activityIds: string[]): Promise<number> {
    return this.prisma.activityProgress.count({
      where: { userId, activityId: { in: activityIds }, completed: true },
    });
  }

  async findCompletedActivityIds(userId: string, activityIds: string[]): Promise<readonly { activityId: string }[]> {
    return this.prisma.activityProgress.findMany({
      where: { userId, activityId: { in: activityIds }, completed: true },
      select: { activityId: true },
    });
  }

  async markComplete(userId: string, videoId: string, duration: number): Promise<unknown> {
    return this.prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: {
        completed: true,
        completedAt: new Date(),
        lastPosition: duration,
        watchedSeconds: duration,
      },
      create: {
        userId,
        videoId,
        completed: true,
        completedAt: new Date(),
        lastPosition: duration,
        watchedSeconds: duration,
      },
    });
  }

  async findTimelineEvent(eventId: string): Promise<{ videoId: string } | null> {
    return this.prisma.timelineEvent.findUnique({
      where: { id: eventId },
      select: { videoId: true },
    });
  }

  async findTimelineEvents(videoId: string, enabledOnly = false): Promise<readonly unknown[]> {
    return this.prisma.timelineEvent.findMany({
      where: { videoId, ...(enabledOnly ? { required: true } : {}) },
      orderBy: { timestamp: "asc" },
    });
  }

  async findLessonVideos(lessonId: string): Promise<readonly { id: string }[]> {
    return this.prisma.lessonVideo.findMany({
      where: { lessonId, enabled: true },
      select: { id: true },
    });
  }

  async countLessonActivities(lessonId: string): Promise<number> {
    return this.prisma.activity.count({
      where: { video: { lessonId, enabled: true } },
    });
  }

  async findLessonProgressRecords(userId: string, videoIds: string[]): Promise<readonly { completed: boolean }[]> {
    if (videoIds.length === 0) return [];
    return this.prisma.videoProgress.findMany({
      where: { userId, videoId: { in: videoIds } },
      select: { completed: true },
    });
  }

  async countLessonCompletedActivities(userId: string, videoIds: string[]): Promise<number> {
    if (videoIds.length === 0) return 0;
    return this.prisma.activityProgress.count({
      where: { userId, completed: true, activity: { videoId: { in: videoIds } } },
    });
  }

  async upsertLessonProgress(
    userId: string,
    lessonId: string,
    data: { progress: number; completed: boolean; completedAt?: Date },
  ): Promise<unknown> {
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: data,
      create: { userId, lessonId, ...data },
    });
  }
}

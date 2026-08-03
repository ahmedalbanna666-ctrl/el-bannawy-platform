import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AcademicContextService } from "../common/services/academic-context.service";
import { CacheService } from "../common/services/cache.service";
import { VideoRepository } from "./video.repository";

const MIN_WATCH_THRESHOLD = 0.85;

@Injectable()
export class VideoService {
  constructor(
    private readonly repo: VideoRepository,
    private readonly academicContext: AcademicContextService,
    private readonly cache: CacheService,
  ) {}

  private async verifyVideoAccess(userId: string, videoId: string): Promise<void> {
    const video = await this.repo.findLessonId(videoId);
    if (!video) throw new NotFoundException("Video not found");
    await this.academicContext.verifyStudentLessonAccess(userId, video.lessonId);
  }

  async getVideo(videoId: string, userId: string): Promise<unknown> {
    await this.verifyVideoAccess(userId, videoId);
    const video = await this.repo.findById(videoId);
    if (!video) throw new NotFoundException("Video not found");

    const sanitizedActivities = video.activities.map((activity) => ({
      ...activity,
      questions: activity.questions.map((q: { correctAnswer?: string | null }) => {
        const safe = { ...q };
        delete safe.correctAnswer;
        return safe;
      }),
    }));

    return { ...video, activities: sanitizedActivities };
  }

  async getVideoProgress(videoId: string, userId: string): Promise<unknown> {
    await this.verifyVideoAccess(userId, videoId);
    const video = await this.repo.findByIdBasic(videoId);
    if (!video) throw new NotFoundException("Video not found");

    const progress = await this.repo.findProgress(userId, videoId);
    return progress ?? { watchedSeconds: 0, completed: false, lastPosition: 0 };
  }

  async updateProgress(videoId: string, userId: string, currentPosition: number, watchedSeconds?: number): Promise<unknown> {
    await this.verifyVideoAccess(userId, videoId);
    const video = await this.repo.findByIdBasic(videoId);
    if (!video) throw new NotFoundException("Video not found");

    const existing = await this.repo.findProgress(userId, videoId);
    const newWatched = watchedSeconds !== undefined
      ? Math.max(existing?.watchedSeconds ?? 0, watchedSeconds)
      : existing?.watchedSeconds ?? 0;

    return this.repo.upsertProgress(userId, videoId, {
      lastPosition: currentPosition,
      watchedSeconds: newWatched,
    });
  }

  async completeVideo(videoId: string, userId: string): Promise<unknown> {
    await this.verifyVideoAccess(userId, videoId);
    const video = await this.repo.findByIdBasic(videoId);
    if (!video) throw new NotFoundException("Video not found");

    const progress = await this.repo.findProgress(userId, videoId);
    const watchedSeconds = progress?.watchedSeconds ?? 0;
    const lastPosition = progress?.lastPosition ?? 0;
    if (video.duration > 0 && watchedSeconds < video.duration * MIN_WATCH_THRESHOLD) {
      throw new ForbiddenException(
        `You must watch at least ${String(Math.round(MIN_WATCH_THRESHOLD * 100))}% of the video before marking it complete`,
      );
    }
    if (video.duration > 0 && lastPosition < video.duration * MIN_WATCH_THRESHOLD) {
      throw new ForbiddenException(
        "You must reach the end of the video before marking it complete",
      );
      }

    const requiredActivities = await this.repo.findRequiredActivities(videoId);
    if (requiredActivities.length > 0) {
      const requiredIds = requiredActivities.map((a) => a.id);
      const completedCount = await this.repo.countRequiredCompleted(userId, requiredIds);
      if (completedCount < requiredActivities.length) {
        throw new ForbiddenException("Complete all required lesson activities first");
      }
    }

    const updatedProgress = await this.repo.markComplete(userId, videoId, video.duration);
    await this.updateLessonProgress(video.lessonId, userId);
    await this.cache.del(this.cache.generateKey("dashboard", userId));

    return updatedProgress;
  }

  async getResumeData(videoId: string, userId: string): Promise<unknown> {
    await this.verifyVideoAccess(userId, videoId);
    const video = await this.repo.findByIdBasic(videoId);
    if (!video) throw new NotFoundException("Video not found");

    const progress = await this.repo.findProgress(userId, videoId);
    const allRequiredActivities = await this.repo.findRequiredActivitiesWithDetails(videoId);
    const requiredIds = allRequiredActivities.map((a) => a.id);

    const completedActivities = requiredIds.length > 0
      ? await this.repo.findCompletedActivityIds(userId, requiredIds)
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

  async getTimelineEvents(videoId: string, userId: string, filterEnabledOnly = false): Promise<unknown[]> {
    await this.verifyVideoAccess(userId, videoId);
    const video = await this.repo.findByIdBasic(videoId);
    if (!video) throw new NotFoundException("Video not found");
    const events = await this.repo.findTimelineEvents(videoId, filterEnabledOnly);
    return events as unknown[];
  }

  async completeTimelineEvent(eventId: string, userId: string): Promise<unknown> {
    const event = await this.repo.findTimelineEvent(eventId);
    if (!event) throw new NotFoundException("Timeline event not found");
    await this.verifyVideoAccess(userId, event.videoId);
    return { completed: true, eventId, resumeVideo: true };
  }

  private async updateLessonProgress(lessonId: string, userId: string): Promise<void> {
    const [videos, totalActivities] = await Promise.all([
      this.repo.findLessonVideos(lessonId),
      this.repo.countLessonActivities(lessonId),
    ]);

    const videoIds = videos.map((v) => v.id);
    const [progressRecords, completedActivities] = await Promise.all([
      this.repo.findLessonProgressRecords(userId, videoIds),
      this.repo.countLessonCompletedActivities(userId, videoIds),
    ]);

    const totalVideos = videos.length;
    const completedVideos = progressRecords.filter((p: { completed: boolean }) => p.completed).length;

    let progress = 0;
    if (totalVideos > 0) progress = Math.round((completedVideos / totalVideos) * 70);
    if (totalActivities > 0) progress += Math.round((completedActivities / totalActivities) * 30);

    const allDone = completedVideos === totalVideos && (totalActivities === 0 || completedActivities === totalActivities);
    const data: { progress: number; completed: boolean; completedAt?: Date } = { progress, completed: allDone };
    if (allDone) data.completedAt = new Date();

    await this.repo.upsertLessonProgress(userId, lessonId, data);
  }
}

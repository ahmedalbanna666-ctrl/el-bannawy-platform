"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  CheckCircle,
  Clock,
  BookOpen,
  GraduationCap,
  FileText,
  ClipboardList,
  HelpCircle,
  ChevronLeft,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonDetail {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  sequentialMode: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
  progress: { progress: number; completed: boolean } | null;
  unit: { id: string; title: string; grade: { id: string; name: string } };
  videos: LessonVideo[];
  vocabulary: LessonVocabulary[];
  settings: LessonSettings | null;
}

interface LessonVideo {
  id: string;
  title: string;
  url: string;
  duration: number;
  displayOrder: number;
  thumbnailUrl: string | null;
  timelineEvents: { id: string; timestamp: number; title: string; description: string }[];
  activities: LessonActivity[];
}

interface LessonActivity {
  id: string;
  type: string;
  title: string;
  config: string;
  displayOrder: number;
}

interface LessonVocabulary {
  id: string;
  word: string;
  translation: string;
  definition: string;
  example: string | null;
  phonetic: string | null;
  displayOrder: number;
}

interface LessonSettings {
  id: string;
  requiresCamera: boolean;
  requiresMicrophone: boolean;
  minScoreToPass: number;
  allowSkipping: boolean;
}

interface VideoProgressData {
  id?: string;
  watchedSeconds: number;
  completed: boolean;
  lastPosition: number;
  startedAt?: string;
  completedAt?: string | null;
}

export default function LessonDetailPage(): ReactNode {
  const params = useParams();
  const lessonId = params.id as string;
  const [data, setData] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<Partial<Record<string, VideoProgressData>>>({});
  const [completingVideo, setCompletingVideo] = useState<string | null>(null);

  const fetchLesson = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<LessonDetail>(`/lessons/${lessonId}`);
      if (response.data) {
        setData(response.data);
        if (response.data.videos.length > 0) {
          setActiveVideoId(response.data.videos[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void fetchLesson();
  }, [fetchLesson]);

  const fetchVideoProgress = useCallback(async (videoId: string): Promise<void> => {
    try {
      const response = await api.get<VideoProgressData>(`/videos/${videoId}/progress`);
      if (response.data) {
        setVideoProgress((prev) => ({ ...prev, [videoId]: response.data }));
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (data?.videos) {
      for (const video of data.videos) {
        void fetchVideoProgress(video.id);
      }
    }
  }, [data, fetchVideoProgress]);

  const handleSelectVideo = (videoId: string): void => {
    setActiveVideoId(videoId);
    const vp = videoProgress[videoId];
    void api.patch(`/videos/${videoId}/progress`, { currentPosition: vp !== undefined ? vp.lastPosition : 0 });
  };

  const handleCompleteVideo = async (videoId: string): Promise<void> => {
    setCompletingVideo(videoId);
    try {
      const response = await api.post<VideoProgressData>(`/videos/${videoId}/complete`);
      if (response.data) {
        setVideoProgress((prev) => ({ ...prev, [videoId]: response.data }));
        // Refresh lesson data to get updated progress
        void fetchLesson();
      }
    } catch {
      // Error handled by UI feedback
    } finally {
      setCompletingVideo(null);
    }
  };

  if (loading) {
    return <LessonSkeleton />;
  }

  if (error) {
    return <ErrorState title="Failed to load lesson" description={error} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Lesson not found"
        description="The lesson you are looking for does not exist."
        icon={<BookOpen className="h-16 w-16" />}
      />
    );
  }

  const activeVideo = data.videos.find((v) => v.id === activeVideoId);
  const activeProgress = activeVideoId ? videoProgress[activeVideoId] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <a
          href="/dashboard/units"
          className="mb-4 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Units
        </a>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              {data.unit.grade.name} — {data.unit.title}
            </p>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {data.displayOrder}. {data.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-400" />
            <span className="text-sm text-neutral-500">{data.estimatedDuration} min</span>
            {data.progress?.completed && (
              <Badge variant="success">
                <CheckCircle className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Progress Bar */}
      {(data.progress?.progress ?? 0) > 0 && !data.progress?.completed && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Lesson Progress</span>
            <span>{Math.round(data.progress?.progress ?? 0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${String(data.progress?.progress ?? 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Video Player Section */}
      {activeVideo && (
        <Card variant="elevated" padding="md">
          <CardContent>
            <div className="aspect-video w-full rounded-xl bg-neutral-900 flex items-center justify-center">
              <div className="text-center">
                <Play className="mx-auto h-16 w-16 text-white/60" />
                <p className="mt-2 text-sm text-white/60">{activeVideo.title}</p>
                <div className="mt-1 flex items-center justify-center gap-3 text-xs text-white/40">
                  <span>{activeVideo.duration} seconds</span>
                  {activeProgress?.completed ? (
                    <Badge variant="success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  ) : activeProgress !== null && activeProgress !== undefined && activeProgress.watchedSeconds > 0 ? (
                    <span>
                      {String(Math.round((activeProgress.watchedSeconds / activeVideo.duration) * 100))}% watched
                    </span>
                  ) : (
                    <span>Not started</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sidebar: Video List + Vocabulary */}
        <div className="md:col-span-1">
          <Card variant="outline" padding="sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-primary-500" />
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Lesson Videos</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.videos.map((video) => {
                  const vp = videoProgress[video.id];
                  return (
                    <button
                      key={video.id}
                      onClick={(): void => { handleSelectVideo(video.id); }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        activeVideoId === video.id
                          ? "border-primary-500 bg-primary-500/5"
                          : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{video.title}</p>
                        {vp !== undefined && vp.completed && <CheckCircle className="h-4 w-4 text-success-500" />}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                        <Clock className="h-3 w-3" />
                        <span>{video.duration}s</span>
                        {video.timelineEvents.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{video.timelineEvents.length} events</span>
                          </>
                        )}
                      </div>
                      {vp !== undefined && !vp.completed && vp.watchedSeconds > 0 && (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className="h-full rounded-full bg-primary-400"
                            style={{ width: String(Math.min(100, Math.round((vp.watchedSeconds / video.duration) * 100))) + "%" }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {data.vocabulary.length > 0 && (
            <Card variant="outline" padding="sm" className="mt-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Vocabulary</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.vocabulary.map((word) => (
                    <div key={word.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{word.word}</p>
                      {word.phonetic && <p className="text-xs text-neutral-400">{word.phonetic}</p>}
                      <p className="mt-1 text-sm text-neutral-500">{word.translation}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{word.definition}</p>
                      {word.example && (
                        <p className="mt-1 text-xs italic text-neutral-400">&ldquo;{word.example}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content: Timeline + Activities + Actions */}
        <div className="space-y-4 md:col-span-2">
          {/* Video Actions */}
          {activeVideo && (
            <Card variant="outline" padding="sm">
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {activeProgress?.completed ? (
                    <Badge variant="success" className="px-4 py-2">
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Video Completed
                    </Badge>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(): void => { void handleCompleteVideo(activeVideo.id); }}
                      loading={completingVideo === activeVideo.id}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Video Complete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(): void => {
                      void api.patch(`/videos/${activeVideo.id}/progress`, {
                        currentPosition: 0,
                        watchedSeconds: activeVideo.duration,
                      });
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Mark as Watched
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline Events */}
          {activeVideo && activeVideo.timelineEvents.length > 0 && (
            <Card variant="outline" padding="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Timeline</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeVideo.timelineEvents.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-xs font-medium text-primary-600 dark:text-primary-400">
                        {event.timestamp}s
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{event.title}</p>
                        {event.description && <p className="text-xs text-neutral-500">{event.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activities */}
          {activeVideo && activeVideo.activities.length > 0 && (
            <Card variant="outline" padding="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Activities</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeVideo.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="primary">{activity.type}</Badge>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {activity.title}
                        </p>
                      </div>
                      <p className="text-xs text-neutral-400">Activity #{activity.displayOrder}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lesson-level Actions */}
          <div className="flex flex-wrap gap-3">
            {data.homeworkEnabled && (
              <Button variant="outline" size="md">
                <ClipboardList className="mr-2 h-4 w-4" />
                View Homework
              </Button>
            )}
            {data.quizEnabled && (
              <Button variant="primary" size="md">
                <GraduationCap className="mr-2 h-4 w-4" />
                Take Quiz
              </Button>
            )}
          </div>

          {/* Settings */}
          {data.settings && (
            <Card variant="outline" padding="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-neutral-400" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Lesson Settings</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {data.settings.requiresCamera && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Camera:</span>
                      <Badge variant="warning">Required</Badge>
                    </div>
                  )}
                  {data.settings.requiresMicrophone && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Microphone:</span>
                      <Badge variant="warning">Required</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Pass score:</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{data.settings.minScoreToPass}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Skipping:</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {data.settings.allowSkipping ? "Allowed" : "Disabled"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <div className="space-y-4 md:col-span-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

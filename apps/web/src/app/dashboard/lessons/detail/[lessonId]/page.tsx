"use client";

import { useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { YouTubePlayer, VideoPlayerSkeleton } from "@/components/lesson-player/youtube-player";
import {
  Play,
  CheckCircle,
  Clock,
  BookOpen,
  GraduationCap,
  FileText,
  ClipboardList,
  Languages,
  Puzzle,
  ChevronRight,
  ChevronLeft,
  Lock,
  Trophy,
  MonitorPlay,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface LessonDetail {
  id: string;
  title: string;
  unitId: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  sequentialMode: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
  xpReward: number;
  passingScore: number;
  progress: { progress: number; completed: boolean } | null;
  unit: { id: string; title: string; displayOrder: number; grade: { id: string; name: string } };
  videos: LessonVideo[];
  vocabulary: LessonVocabulary[];
  settings: LessonSettings | null;
}

interface LessonVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  duration: number;
  displayOrder: number;
  timelineEvents: unknown[];
  activities: unknown[];
}

interface LessonVocabulary {
  id: string;
  word: string;
  translation: string;
  definition: string;
  example: string | null;
  displayOrder: number;
}

interface LessonSettings {
  id: string;
  allowRetry: boolean;
  showAnswers: boolean;
  unlockNextOnComplete: boolean;
}

interface VideoProgressData {
  watchedSeconds: number;
  completed: boolean;
  lastPosition: number;
}

interface QuizData {
  id: string;
  lessonId: string;
  title: string;
  instructions: string | null;
  passingScore: number;
  maxAttempts: number;
  xpReward: number;
  allowRetry: boolean;
  _count: { questions: number };
}

interface QuizResult {
  score: number | null;
  passed: boolean | null;
  attemptNum: number;
}

interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  grades: {
    id: string;
    name: string;
    displayOrder: number;
    units: UnitSummary[];
  }[];
}

interface UnitSummary {
  id: string;
  title: string;
  displayOrder: number;
  lessons: LessonSummary[];
}

interface LessonSummary {
  id: string;
  title: string;
  displayOrder: number;
}

// ── Query Hooks ──────────────────────────────────────────────────────

function useLesson(lessonId: string): UseQueryResult<LessonDetail> {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await api.get<LessonDetail>(`/lessons/${lessonId}`);
      if (!res.data) throw new Error("Lesson not found");
      return res.data;
    },
    staleTime: 30_000,
  });
}

function useVideoProgress(videoId: string | null): UseQueryResult<VideoProgressData> {
  return useQuery({
    queryKey: ["video-progress", videoId],
    queryFn: async () => {
      const res = await api.get<VideoProgressData>(`/videos/${String(videoId)}/progress`);
      return res.data ?? { watchedSeconds: 0, completed: false, lastPosition: 0 };
    },
    enabled: !!videoId,
    staleTime: 0,
    refetchInterval: 15_000,
  });
}

function useCurriculum(): UseQueryResult<Stage[]> {
  return useQuery({
    queryKey: ["curriculum"],
    queryFn: async () => {
      const res = await api.get<Stage[]>("/curriculum");
      return res.data ?? [];
    },
    staleTime: 300_000,
  });
}

function useQuizData(lessonId: string, enabled: boolean): UseQueryResult<QuizData | null> {
  return useQuery({
    queryKey: ["quiz-data", lessonId],
    queryFn: async () => {
      const res = await api.get<QuizData>(`/quizzes/${lessonId}`);
      return res.data ?? null;
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useQuizResult(lessonId: string, enabled: boolean): UseQueryResult<QuizResult | null> {
  return useQuery({
    queryKey: ["quiz-result", lessonId],
    queryFn: async () => {
      const res = await api.get<QuizResult>(`/quizzes/${lessonId}/result`);
      return res.data ?? null;
    },
    enabled,
    staleTime: 0,
    retry: false,
  });
}

type QuizStatus = "locked" | "available" | "completed";

function getQuizStatus(
  quizEnabled: boolean,
  quizData: QuizData | null | undefined,
  quizResult: QuizResult | null | undefined,
  quizLoading: boolean,
): QuizStatus {
  if (!quizEnabled) return "locked";
  if (quizLoading) return "locked";
  if (!quizData) return "locked";
  if (quizResult?.passed) return "completed";
  return "available";
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getResolutionBadge(durationSec: number): string {
  if (durationSec >= 3600) return "1080p";
  if (durationSec >= 1800) return "720p";
  return "HD";
}

// ── Sub-components ───────────────────────────────────────────────────

function Breadcrumb({
  gradeName,
  unitTitle,
}: {
  gradeName: string;
  unitTitle: string;
}): ReactNode {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <li>
          <Link href="/dashboard/units" className="hover:text-primary-500 transition-colors">
            {gradeName}
          </Link>
        </li>
        <li>
          <ChevronLeft className="h-3.5 w-3.5" />
        </li>
        <li className="font-medium text-neutral-700 dark:text-neutral-300">
          {unitTitle}
        </li>
      </ol>
    </nav>
  );
}

function LessonHeader({
  unitOrder,
  lessonOrder,
  title,
  estimatedDuration,
  isCompleted,
}: {
  unitOrder: number;
  lessonOrder: number;
  title: string;
  estimatedDuration: number;
  isCompleted: boolean;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-500/70">
        Unit {unitOrder}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-400">
            Lesson {lessonOrder}
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
            <Clock className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {estimatedDuration} min
            </span>
          </div>
          {isCompleted && (
            <Badge variant="success" className="gap-1 px-3 py-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>مكتمل</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoProgressBar({
  percentage,
  isCompleted,
}: {
  percentage: number;
  isCompleted: boolean;
}): ReactNode {
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success-500/10 px-4 py-2.5">
        <CheckCircle className="h-4 w-4 text-success-500" />
        <span className="text-sm font-medium text-success-600 dark:text-success-400">
          تمت مشاهدة الفيديو بالكامل
        </span>
      </div>
    );
  }

  if (percentage <= 0) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg font-bold text-primary-500 tabular-nums">
        {percentage}%
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-700"
          style={{ width: `${String(percentage)}%` }}
        />
      </div>
      <span className="text-sm text-neutral-400 whitespace-nowrap">
        تمت مشاهدة {percentage}%
      </span>
    </div>
  );
}

function LearningCards({
  lessonId,
  vocabulary,
  activityCount,
  homeworkEnabled,
}: {
  lessonId: string;
  vocabulary: LessonVocabulary[];
  activityCount: number;
  homeworkEnabled: boolean;
}): ReactNode {
  const cards = [
    {
      id: "vocabulary",
      label: "المفردات",
      icon: Languages,
      detail: vocabulary.length > 0 ? `${String(vocabulary.length)} كلمة` : "لا توجد مفردات",
      href: null,
      enabled: vocabulary.length > 0,
    },
    {
      id: "activities",
      label: "الأنشطة",
      icon: Puzzle,
      detail: activityCount > 0 ? `${String(activityCount)} أنشطة` : "لا توجد أنشطة",
      href: null,
      enabled: activityCount > 0,
    },
    {
      id: "homework",
      label: "الواجب",
      icon: ClipboardList,
      detail: homeworkEnabled ? "متاح" : "غير مطلوب",
      href: homeworkEnabled ? `/dashboard/homework/${lessonId}` : null,
      enabled: homeworkEnabled,
    },
    {
      id: "pdf",
      label: "ملف PDF",
      icon: FileText,
      detail: "غير متوفر حالياً",
      href: null,
      enabled: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {cards.map((card) => {
        const inner = (
          <Card
            key={card.id}
            variant={card.enabled ? "elevated" : "default"}
            padding="md"
            className={
              card.enabled
                ? "group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-full"
                : "opacity-60 h-full"
            }
          >
            <CardContent>
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                    card.enabled
                      ? "bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white"
                      : "bg-neutral-200 text-neutral-400 dark:bg-neutral-700"
                  }`}
                >
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {card.label}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">{card.detail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

        if (card.href) {
          return (
            <Link key={card.id} href={card.href} className="block">
              {inner}
            </Link>
          );
        }
        return <div key={card.id}>{inner}</div>;
      })}
    </div>
  );
}

function QuizCard({
  lessonId,
  quizEnabled,
  status,
  quizData,
  quizLoading,
}: {
  lessonId: string;
  quizEnabled: boolean;
  status: QuizStatus;
  quizData: QuizData | null | undefined;
  quizLoading: boolean;
}): ReactNode {
  if (!quizEnabled) {
    return (
      <Card variant="default" padding="md" className="opacity-60">
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700">
              <Lock className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                اختبار الدرس
              </h3>
              <p className="text-sm text-neutral-400">الاختبار غير متاح لهذا الدرس</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quizLoading) {
    return (
      <Card variant="default" padding="md">
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "locked") {
    return (
      <Card variant="default" padding="md" className="border-warning-500/30 bg-warning-500/5">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warning-500/10">
              <Lock className="h-5 w-5 text-warning-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {quizData?.title ?? "اختبار الدرس"}
              </h3>
              <p className="text-sm text-neutral-400">
                أكمل الدرس أولاً لفتح الاختبار
              </p>
            </div>
            <Button variant="outline" size="sm" disabled className="mt-2 sm:mt-0">
              <Lock className="mr-2 h-4 w-4" />
              مقفل
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "completed") {
    return (
      <Card variant="elevated" padding="md" className="border-success-500/30">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success-500/10">
              <Trophy className="h-5 w-5 text-success-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {quizData?.title ?? "اختبار الدرس"}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
                <span>{quizData?._count.questions ?? 0} سؤال</span>
                {quizData && <span>• +{quizData.xpReward} XP</span>}
              </div>
            </div>
            <Badge variant="success" className="gap-1 px-4 py-2 mt-2 sm:mt-0">
              <CheckCircle className="h-4 w-4" />
              تم الإكمال
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="md" className="border-primary-500/20">
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10">
            <GraduationCap className="h-5 w-5 text-primary-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {quizData?.title ?? "اختبار الدرس"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
              <span>{quizData?._count.questions ?? 0} سؤال</span>
              <span>• {quizData ? `${String(quizData.passingScore)}% للنجاح` : ""}</span>
              {quizData && <span>• +{quizData.xpReward} XP</span>}
            </div>
          </div>
          <Link href={`/dashboard/quiz/${lessonId}`}>
            <Button variant="primary" size="sm" className="mt-2 sm:mt-0">
              <Play className="mr-2 h-4 w-4" />
              بدء الاختبار
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function NavigationFooter({
  prevLesson,
  nextLesson,
}: {
  prevLesson: LessonSummary | null;
  nextLesson: LessonSummary | null;
}): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {prevLesson ? (
        <Link href={`/dashboard/lessons/detail/${prevLesson.id}`}>
          <Button variant="outline" size="sm" className="gap-1">
            <ChevronRight className="h-4 w-4" />
            <span className="hidden sm:inline">الدرس السابق</span>
            <span className="hidden sm:inline text-xs text-neutral-400 ml-1">
              {prevLesson.title}
            </span>
          </Button>
        </Link>
      ) : (
        <div />
      )}

      <Link href="/dashboard/units">
        <Button variant="ghost" size="sm">
          <BookOpen className="mr-2 h-4 w-4" />
          العودة للوحدات
        </Button>
      </Link>

      {nextLesson ? (
        <Link href={`/dashboard/lessons/detail/${nextLesson.id}`}>
          <Button variant="outline" size="sm" className="gap-1">
            <span className="hidden sm:inline text-xs text-neutral-400 mr-1">
              {nextLesson.title}
            </span>
            <span className="hidden sm:inline">الدرس التالي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function LessonDetailPage(): ReactNode {
  // ── All Hooks (Rules of Hooks — must be unconditional, at top, same order every render) ──
  const params = useParams();
  const queryClient = useQueryClient();
  const lessonId = params.lessonId as string;

  const {
    data: lesson,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErr,
  } = useLesson(lessonId);

  const firstVideoId: string | null =
    lesson && lesson.videos.length > 0 ? lesson.videos[0].id : null;
  const { data: videoProgress } = useVideoProgress(firstVideoId);

  const { data: stages } = useCurriculum();

  const quizEnabled = lesson?.quizEnabled ?? false;
  const { data: quizData, isLoading: quizLoading } = useQuizData(lessonId, quizEnabled);
  const { data: quizResult, isLoading: quizResultLoading } = useQuizResult(lessonId, quizEnabled);

  const handleVideoProgress = useCallback(
    (_currentTime: number, _duration: number) => {
      void queryClient.invalidateQueries({ queryKey: ["video-progress", firstVideoId] });
    },
    [firstVideoId, queryClient],
  );

  const handlePlayerReady = useCallback(() => {
    // Player initialized
  }, []);

  const handlePlayerError = useCallback(() => {
    // Error handled by UI fallback
  }, []);

  // ── Derived values (non-hooks — safe to compute from resolved hook data above) ──
  const quizStatus = getQuizStatus(
    quizEnabled,
    quizData,
    quizResult,
    quizLoading || quizResultLoading,
  );

  const navigation = findAdjacentLessons(stages ?? [], lessonId);

  // ── Guards — all hooks declared above this line ──
  if (lessonLoading) return <LessonSkeleton />;

  if (lessonError) {
    return (
      <ErrorState
        title="فشل تحميل الدرس"
        description={lessonErr instanceof Error ? lessonErr.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  if (!lesson) {
    return (
      <EmptyState
        title="الدرس غير موجود"
        description="الدرس الذي تبحث عنه غير متوفر"
        icon={<BookOpen className="h-16 w-16" />}
      />
    );
  }

  // ── Derived values requiring guaranteed non-null lesson ──
  const activeVideo: LessonVideo | null =
    lesson.videos.length > 0 ? lesson.videos[0] : null;

  const videoWatchedPct =
    activeVideo && videoProgress && activeVideo.duration > 0
      ? Math.min(100, Math.round((videoProgress.watchedSeconds / activeVideo.duration) * 100))
      : 0;

  const totalActivities = lesson.videos.reduce(
    (sum, v) => sum + v.activities.length,
    0,
  );

  // ── Render ──
  return (
    <div className="flex flex-col gap-6 pb-4">
      <Breadcrumb gradeName={lesson.unit.grade.name} unitTitle={lesson.unit.title} />

      <LessonHeader
        unitOrder={lesson.unit.displayOrder}
        lessonOrder={lesson.displayOrder}
        title={lesson.title}
        estimatedDuration={lesson.estimatedDuration}
        isCompleted={lesson.progress?.completed ?? false}
      />

      {/* Video Player */}
      <section aria-label="مشغل الفيديو">
        {activeVideo ? (
          <div className="space-y-1">
            <YouTubePlayer
              videoId={activeVideo.id}
              youtubeId={activeVideo.youtubeId}
              onProgress={handleVideoProgress}
              onReady={handlePlayerReady}
              onError={handlePlayerError}
              startAt={videoProgress?.lastPosition ?? 0}
            />
            <div className="flex items-center justify-between rounded-b-2xl bg-neutral-800/80 px-4 py-2 backdrop-blur">
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatSeconds(activeVideo.duration)}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {getResolutionBadge(activeVideo.duration)}
                </Badge>
              </div>
              <span className="text-xs text-neutral-400">
                {activeVideo.title}
              </span>
            </div>
          </div>
        ) : (
          <Card variant="default" padding="lg">
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-8">
                <MonitorPlay className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-500">لا يوجد فيديو متاح لهذا الدرس</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Video Progress */}
      <VideoProgressBar
        percentage={videoWatchedPct}
        isCompleted={videoProgress?.completed ?? false}
      />

      {/* Learning Cards */}
      <LearningCards
        lessonId={lessonId}
        vocabulary={lesson.vocabulary}
        activityCount={totalActivities}
        homeworkEnabled={lesson.homeworkEnabled}
      />

      {/* Quiz Card */}
      <QuizCard
        lessonId={lessonId}
        quizEnabled={quizEnabled}
        status={quizStatus}
        quizData={quizData}
        quizLoading={quizLoading}
      />

      {/* Navigation */}
      <NavigationFooter
        prevLesson={navigation.prev}
        nextLesson={navigation.next}
      />
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function LessonSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <VideoPlayerSkeleton />
      <Skeleton className="h-8 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

// ── Navigation helper ────────────────────────────────────────────────

function findAdjacentLessons(
  stages: Stage[],
  lessonId: string,
): { prev: LessonSummary | null; next: LessonSummary | null } {
  const allLessons: { id: string; title: string; displayOrder: number; unitId: string }[] = [];

  for (const stage of stages) {
    for (const grade of stage.grades) {
      for (const unit of grade.units) {
        for (const lesson of unit.lessons) {
          allLessons.push({
            id: lesson.id,
            title: lesson.title,
            displayOrder: lesson.displayOrder,
            unitId: unit.id,
          });
        }
      }
    }
  }

  const currentIdx = allLessons.findIndex((l) => l.id === lessonId);
  if (currentIdx === -1) return { prev: null, next: null };

  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return {
    prev: prevLesson !== null ? { id: prevLesson.id, title: prevLesson.title, displayOrder: prevLesson.displayOrder } : null,
    next: nextLesson !== null ? { id: nextLesson.id, title: nextLesson.title, displayOrder: nextLesson.displayOrder } : null,
  };
}

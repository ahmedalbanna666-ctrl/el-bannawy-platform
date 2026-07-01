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
import { YouTubePlayer, VideoPlayerSkeleton } from "@/components/lesson-player/youtube-player";
import {
  CheckCircle,
  Clock,
  BookMarked,
  FileText,
  Puzzle,
  ChevronRight,
  ChevronLeft,
  MonitorPlay,
  Library,
  Layers,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface LessonDetail {
  id: string;
  title: string;
  unitId: string;
  displayOrder: number;
  estimatedDuration: number;
  unit: { id: string; title: string; displayOrder: number; grade: { id: string; name: string } };
  videos: LessonVideo[];
  vocabulary: LessonVocabulary[];
}

interface LessonVideo {
  id: string;
  title: string;
  youtubeId: string;
  duration: number;
  activities: unknown[];
}

interface LessonVocabulary {
  id: string;
  word: string;
  translation: string;
  definition: string;
  example: string | null;
}

interface VideoProgressData {
  watchedSeconds: number;
  completed: boolean;
  lastPosition: number;
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
  lessons: { id: string; title: string; displayOrder: number }[];
}

interface ReviewInfo {
  index: number;
  label: string;
  coverage: string;
  units: { id: string; displayOrder: number }[];
  firstLessonId: string | null;
}

// ── Query Hooks ──────────────────────────────────────────────────────

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

function useLesson(lessonId: string | null): UseQueryResult<LessonDetail> {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await api.get<LessonDetail>(`/lessons/${String(lessonId)}`);
      if (!res.data) throw new Error("Lesson not found");
      return res.data;
    },
    enabled: !!lessonId,
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

function buildReviews(stages: Stage[]): ReviewInfo[] {
  const allUnits = stages.flatMap((stage) =>
    stage.grades.flatMap((grade) => grade.units),
  );

  if (allUnits.length === 0) return [];

  const reviews: ReviewInfo[] = [];
  for (let i = 0; i < allUnits.length; i += 2) {
    const unitA = allUnits[i];
    const unitB = i + 1 < allUnits.length ? allUnits[i + 1] : null;
    const coverage = unitB
      ? `Unit ${String(unitA.displayOrder)} + Unit ${String(unitB.displayOrder)}`
      : `Unit ${String(unitA.displayOrder)}`;

    reviews.push({
      index: i / 2,
      label: `مراجعة ${String(i / 2 + 1)}`,
      coverage,
      units: unitB
        ? [
            { id: unitA.id, displayOrder: unitA.displayOrder },
            { id: unitB.id, displayOrder: unitB.displayOrder },
          ]
        : [{ id: unitA.id, displayOrder: unitA.displayOrder }],
      firstLessonId: unitA.lessons.length > 0 ? unitA.lessons[0].id : null,
    });
  }

  reviews.push({
    index: reviews.length,
    label: "مراجعة شاملة",
    coverage: "كل المنهج",
    units: allUnits.map((u) => ({ id: u.id, displayOrder: u.displayOrder })),
    firstLessonId: allUnits[0]?.lessons[0]?.id ?? null,
  });

  return reviews;
}

// ── Sub-components ───────────────────────────────────────────────────

function Breadcrumb(): ReactNode {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <li>
          <Link href="/dashboard/final-review" className="hover:text-primary-500 transition-colors">
            المراجعة النهائية
          </Link>
        </li>
      </ol>
    </nav>
  );
}

function ReviewHeader({
  index,
  coverage,
}: {
  index: number;
  coverage: string;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500/80">
        Final Review
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-400">
            Review {index + 1}
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            {coverage}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5">
            <BookMarked className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              مراجعة
            </span>
          </div>
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
          تمت مشاهدة فيديو المراجعة بالكامل
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

function ReviewCards({
  reviewIndex,
  vocabulary,
  activityCount,
}: {
  reviewIndex: number;
  vocabulary: LessonVocabulary[];
  activityCount: number;
}): ReactNode {
  const cards = [
    {
      id: "summary",
      label: "ملخص المراجعة",
      icon: Layers,
      detail: vocabulary.length > 0
        ? `${String(vocabulary.length)} كلمة`
        : "ملاحظات مختصرة",
      enabled: true,
      href: null,
    },
    {
      id: "activities",
      label: "الأنشطة",
      icon: Puzzle,
      detail: activityCount > 0 ? `${String(activityCount)} أنشطة` : "أنشطة تفاعلية",
      enabled: activityCount > 0,
      href: null,
    },
    {
      id: "question-bank",
      label: "بنك الأسئلة",
      icon: Library,
      detail: "سهل · متوسط · صعب · مختلط",
      enabled: true,
      href: `/dashboard/final-review/${String(reviewIndex)}/questions`,
    },
    {
      id: "pdf",
      label: "PDF",
      icon: FileText,
      detail: "كراسة المراجعة",
      enabled: false,
      href: null,
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
                      ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white"
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

function NavigationFooter({
  reviewIndex,
  totalReviews,
}: {
  reviewIndex: number;
  totalReviews: number;
}): ReactNode {
  const prevIdx = reviewIndex > 0 ? reviewIndex - 1 : null;
  const nextIdx = reviewIndex < totalReviews - 1 ? reviewIndex + 1 : null;

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {prevIdx !== null ? (
        <Link href={`/dashboard/final-review/${String(prevIdx)}`}>
          <Button variant="outline" size="sm" className="gap-1">
            <ChevronRight className="h-4 w-4" />
            <span className="hidden sm:inline">المراجعة السابقة</span>
          </Button>
        </Link>
      ) : (
        <div />
      )}

      <Link href="/dashboard/final-review">
        <Button variant="ghost" size="sm">
          <BookMarked className="mr-2 h-4 w-4" />
          العودة للمراجعات
        </Button>
      </Link>

      {nextIdx !== null ? (
        <Link href={`/dashboard/final-review/${String(nextIdx)}`}>
          <Button variant="outline" size="sm" className="gap-1">
            <span className="hidden sm:inline">المراجعة التالية</span>
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

export default function FinalReviewPlayerPage(): ReactNode {
  const params = useParams();
  const queryClient = useQueryClient();
  const reviewId = Number(params.reviewId);

  // ── All Hooks ──
  const { data: stages, isLoading: curriculumLoading } = useCurriculum();

  const reviews = stages ? buildReviews(stages) : [];
  const review = reviews[reviewId];
  const totalReviews = reviews.length;

  const lessonId: string | null = review.firstLessonId;
  const { data: lesson } = useLesson(lessonId);

  const activeVideo: LessonVideo | null =
    lesson && lesson.videos.length > 0 ? lesson.videos[0] : null;
  const { data: videoProgress } = useVideoProgress(activeVideo?.id ?? null);

  const handleVideoProgress = useCallback(
    (_currentTime: number, _duration: number) => {
      void queryClient.invalidateQueries({
        queryKey: ["video-progress", activeVideo?.id ?? null],
      });
    },
    [activeVideo?.id, queryClient],
  );

  const handlePlayerReady = useCallback(() => {
    return undefined;
  }, []);

  const handlePlayerError = useCallback(() => {
    return undefined;
  }, []);

  // ── Derived non-hook values ──
  const videoWatchedPct =
    activeVideo && videoProgress && activeVideo.duration > 0
      ? Math.min(100, Math.round((videoProgress.watchedSeconds / activeVideo.duration) * 100))
      : 0;

  // ── Guards ──
  if (curriculumLoading) return <ReviewPlayerSkeleton />;

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="المراجعة غير متاحة"
        description="ستصبح المراجعة النهائية متاحة خلال فترة المراجعة الرسمية"
        icon={<BookMarked className="h-16 w-16" />}
      />
    );
  }

  if (reviewId < 0 || reviewId >= reviews.length) {
    return (
      <EmptyState
        title="المراجعة غير موجودة"
        description="رقم المراجعة غير صحيح"
        icon={<BookMarked className="h-16 w-16" />}
      />
    );
  }

  // ── Derived values requiring lesson ──
  const totalActivities = lesson
    ? lesson.videos.reduce((sum, v) => sum + v.activities.length, 0)
    : 0;

  // ── Render ──
  return (
    <div className="flex flex-col gap-6 pb-4">
      <Breadcrumb />

      <ReviewHeader index={review.index} coverage={review.coverage} />

      {/* Video Player */}
      <section aria-label="فيديو المراجعة">
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
              <span className="text-xs text-neutral-400">{activeVideo.title}</span>
            </div>
          </div>
        ) : (
          <Card variant="default" padding="lg">
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-8">
                <MonitorPlay className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-500">فيديو المراجعة غير متاح حالياً</p>
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

      {/* Review Cards */}
      <ReviewCards
        reviewIndex={reviewId}
        vocabulary={lesson?.vocabulary ?? []}
        activityCount={totalActivities}
      />

      {/* Navigation */}
      <NavigationFooter reviewIndex={reviewId} totalReviews={totalReviews} />
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function ReviewPlayerSkeleton(): ReactNode {
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
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Breadcrumb } from "@/components/units/breadcrumb";
import {
  LessonContentBlocks,
  type LessonVideo,
  type LessonVocabulary,
  type LessonDocument,
  type QuizData,
  type HomeworkData,
} from "@/app/dashboard/units/[unitId]/lessons/[lessonId]/_components/content-blocks";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import { LibraryBig } from "lucide-react";

interface LessonDetail {
  readonly id: string;
  readonly title: string;
  readonly unitId: string;
  readonly displayOrder: number;
  readonly estimatedDuration: number;
  readonly isPremium: boolean;
  readonly homeworkEnabled: boolean;
  readonly quizEnabled: boolean;
  readonly videos: readonly LessonVideo[];
  readonly vocabulary: { readonly groups: readonly LessonVocabulary[] };
  readonly document: LessonDocument | null;
  readonly unit: {
    readonly id: string;
    readonly title: string;
    readonly grade: { readonly id: string; readonly name: string };
  };
}

export default function FinalReviewLectureContentPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const reviewId = Array.isArray(params.reviewId) ? params.reviewId[0] : (params.reviewId ?? "");
  const lectureId = Array.isArray(params.lectureId) ? params.lectureId[0] : (params.lectureId ?? "");

  const hydrated = typeof rawRole === "string";

  useEffect(() => {
    if (hydrated && !isManagement) {
      router.replace(`/dashboard/lessons/detail/${lectureId}`);
    }
  }, [hydrated, isManagement, router, lectureId]);

  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["lesson", lectureId],
    queryFn: async () => {
      const res = await api.get<LessonDetail>(`/lessons/${lectureId}`);
      if (!res.data) throw new Error("Lesson not found");
      return res.data;
    },
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const { data: quiz } = useQuery({
    queryKey: ["quiz", lectureId],
    queryFn: async () => {
      const res = await api.get<QuizData | null>(`/lessons/${lectureId}/quiz`);
      return res.data ?? null;
    },
    retry: false,
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const { data: homework } = useQuery({
    queryKey: ["homework", lectureId],
    queryFn: async () => {
      const res = await api.get<HomeworkData | null>(
        `/lessons/${lectureId}/homework`,
      );
      return res.data ?? null;
    },
    retry: false,
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  if (!hydrated || !isManagement) {
    return null;
  }

  if (isLoading) return <LectureContentSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل المحاضرة"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  if (!lesson) {
    return (
      <EmptyState
        title="المحاضرة غير موجودة"
        description="المحاضرة التي تبحث عنها غير متوفرة"
        icon={<LibraryBig className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <TeacherContextBanner />
      <Breadcrumb
        items={[
          { label: "المراجعات النهائية", href: "/dashboard/final-reviews" },
          { label: lesson.unit.title, href: `/dashboard/final-reviews/${reviewId}` },
          { label: lesson.title },
        ]}
      />

      <div>
        <p className="text-xs font-semibold text-primary-500">
          محاضرة {String(lesson.displayOrder)}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {lesson.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {lesson.unit.grade.name} — إدارة محتوى المحاضرة
        </p>
      </div>

      <LessonContentBlocks
        lessonId={lectureId}
        videos={lesson.videos}
        vocabulary={lesson.vocabulary.groups}
        document={lesson.document}
        quiz={quiz ?? null}
        homework={homework ?? null}
      />
    </div>
  );
}

function LectureContentSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

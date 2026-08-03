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
import { ScrollText } from "lucide-react";

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

export default function StoryChapterContentPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const storyId = Array.isArray(params.storyId) ? params.storyId[0] : (params.storyId ?? "");
  const chapterId = Array.isArray(params.chapterId) ? params.chapterId[0] : (params.chapterId ?? "");

  const hydrated = typeof rawRole === "string";

  useEffect(() => {
    if (hydrated && !isManagement) {
      router.replace(`/dashboard/lessons/detail/${chapterId}`);
    }
  }, [hydrated, isManagement, router, chapterId]);

  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["lesson", chapterId],
    queryFn: async () => {
      const res = await api.get<LessonDetail>(`/lessons/${chapterId}`);
      if (!res.data) throw new Error("Lesson not found");
      return res.data;
    },
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const { data: quiz } = useQuery({
    queryKey: ["quiz", chapterId],
    queryFn: async () => {
      const res = await api.get<QuizData | null>(`/lessons/${chapterId}/quiz`);
      return res.data ?? null;
    },
    retry: false,
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const { data: homework } = useQuery({
    queryKey: ["homework", chapterId],
    queryFn: async () => {
      const res = await api.get<HomeworkData | null>(
        `/lessons/${chapterId}/homework`,
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

  if (isLoading) return <ChapterContentSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الفصل"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  if (!lesson) {
    return (
      <EmptyState
        title="الفصل غير موجود"
        description="الفصل الذي تبحث عنه غير متوفر"
        icon={<ScrollText className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <TeacherContextBanner />
      <Breadcrumb
        items={[
          { label: "القصص", href: "/dashboard/stories" },
          { label: lesson.unit.title, href: `/dashboard/stories/${storyId}` },
          { label: lesson.title },
        ]}
      />

      <div>
        <p className="text-xs font-semibold text-primary-500">
          فصل {String(lesson.displayOrder)}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {lesson.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {lesson.unit.grade.name} — إدارة محتوى الفصل
        </p>
      </div>

      <LessonContentBlocks
        lessonId={chapterId}
        videos={lesson.videos}
        vocabulary={lesson.vocabulary.groups}
        document={lesson.document}
        quiz={quiz ?? null}
        homework={homework ?? null}
      />
    </div>
  );
}

function ChapterContentSkeleton(): ReactNode {
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

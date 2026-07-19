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
} from "./_components/content-blocks";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import { BookOpen } from "lucide-react";

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

export default function LessonContentPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const unitId = Array.isArray(params.unitId) ? params.unitId[0] : (params.unitId ?? "");
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : (params.lessonId ?? "");

  const hydrated = typeof rawRole === "string";

  useEffect(() => {
    if (hydrated && !isManagement) {
      router.replace(`/dashboard/lessons/detail/${lessonId}`);
    }
  }, [hydrated, isManagement, router, lessonId]);

  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const res = await api.get<LessonDetail>(`/lessons/${lessonId}`);
      if (!res.data) throw new Error("Lesson not found");
      return res.data;
    },
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const { data: quiz } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: async () => {
      const res = await api.get<QuizData | null>(`/lessons/${lessonId}/quiz`);
      return res.data ?? null;
    },
    retry: false,
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const { data: homework } = useQuery({
    queryKey: ["homework", lessonId],
    queryFn: async () => {
      const res = await api.get<HomeworkData | null>(
        `/lessons/${lessonId}/homework`,
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

  if (isLoading) return <LessonContentSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الدرس"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
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

  return (
    <div className="flex flex-col gap-6 pb-4">
      <TeacherContextBanner />
      <Breadcrumb
        items={[
          { label: "الوحدات", href: "/dashboard/units" },
          { label: lesson.unit.title, href: `/dashboard/units/${unitId}` },
          { label: lesson.title },
        ]}
      />

      <div>
        <p className="text-xs font-semibold text-primary-500">
          Lesson {String(lesson.displayOrder)}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {lesson.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {lesson.unit.grade.name} — إدارة محتوى الدرس
        </p>
      </div>

      <LessonContentBlocks
        lessonId={lessonId}
        videos={lesson.videos}
        vocabulary={lesson.vocabulary.groups}
        document={lesson.document}
        quiz={quiz ?? null}
        homework={homework ?? null}
      />
    </div>
  );
}

function LessonContentSkeleton(): ReactNode {
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
      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
        <div className="flex items-center justify-center gap-3 py-1.5">
          <Skeleton className="h-px w-20" />
          <Skeleton className="h-8 w-52 rounded-full" />
          <Skeleton className="h-px w-20" />
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          {Array.from({ length: 6 }, (_, ri) => (
            <div
              key={ri}
              className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3.5 last:border-0 dark:border-neutral-800"
            >
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Breadcrumb } from "@/components/units/breadcrumb";
import { LessonFormDialog, type LessonEditData } from "./_components/lesson-form-dialog";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Copy,
  BookOpen,
  Layers,
  Clock,
} from "lucide-react";

interface LessonManagement {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly isPremium: boolean;
  readonly homeworkEnabled: boolean;
  readonly quizEnabled: boolean;
  readonly estimatedDuration: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly _count: { readonly videos: number; readonly vocabulary: number };
  readonly document: { readonly id: string; readonly fileName: string } | null;
  readonly homework: { readonly id: string } | null;
  readonly quiz: { readonly id: string } | null;
}

interface UnitDetailManagement {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly grade: {
    readonly id: string;
    readonly name: string;
    readonly stage: { readonly id: string; readonly name: string };
  };
  readonly lessons: readonly LessonManagement[];
}

const TOTAL_CONTENT_BLOCKS = 5;

function getLessonProgress(lesson: LessonManagement): {
  filled: number;
  progress: number;
} {
  const filled = [
    lesson._count.videos > 0,
    lesson._count.vocabulary > 0,
    lesson.document !== null,
    lesson.homework !== null,
    lesson.quiz !== null,
  ].filter(Boolean).length;

  return {
    filled,
    progress: Math.round((filled / TOTAL_CONTENT_BLOCKS) * 100),
  };
}

export default function UnitDetailPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const unitId = params.unitId as string;
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LessonEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LessonManagement | null>(null);

  useEffect(() => {
    if (!can(PERMISSIONS.UNITS_CREATE)) {
      router.replace(`/dashboard/lessons/${unitId}`);
    }
  }, [can, router, unitId]);

  const { data: unit, isLoading, isError, error } = useQuery({
    queryKey: ["management-unit", unitId],
    queryFn: async () => {
      const res = await api.get<UnitDetailManagement>(
        `/curriculum/units/${unitId}`,
      );
      return res.data ?? null;
    },
    staleTime: 30_000,
    enabled: can(PERMISSIONS.UNITS_CREATE),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/curriculum/lessons/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-unit", unitId],
      });
      setDeleteTarget(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (lesson: LessonManagement) =>
      api.post("/curriculum/lessons", {
        title: `${lesson.title} (نسخة)`,
        unitId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-unit", unitId],
      });
    },
  });

  const sortedLessons = useMemo(
    () =>
      [...(unit?.lessons ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [unit],
  );

  if (!can(PERMISSIONS.UNITS_CREATE)) {
    return null;
  }

  if (isLoading) return <UnitDetailSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الوحدة"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  if (!unit) {
    return (
      <EmptyState
        title="الوحدة غير موجودة"
        description="الوحدة التي تبحث عنها غير متوفرة"
        icon={<BookOpen className="h-16 w-16" />}
      />
    );
  }

  const handleEditClick = (lesson: LessonManagement): void => {
    setEditTarget({
      id: lesson.id,
      title: lesson.title,
      displayOrder: lesson.displayOrder,
      published: lesson.published,
      homeworkEnabled: lesson.homeworkEnabled,
      quizEnabled: lesson.quizEnabled,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <TeacherContextBanner />
      <Breadcrumb
        items={[
          { label: "الوحدات", href: "/dashboard/units" },
          { label: unit.title },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary-500">
              Unit {String(unit.displayOrder)}
            </span>
            <Badge
              variant={unit.published ? "success" : "warning"}
              className="text-[10px]"
            >
              {unit.published ? "منشور" : "مسودة"}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {unit.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {unit.grade.stage.name} — {unit.grade.name}
          </p>
          {unit.description && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {unit.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          الدروس ({String(sortedLessons.length)})
        </h2>
      </div>

      {sortedLessons.length === 0 ? (
        <EmptyState
          title="لا توجد دروس"
          description="ابدأ بإنشاء درس جديد في هذه الوحدة"
          icon={<BookOpen className="h-16 w-16" />}
          actionLabel="إنشاء درس"
          onAction={(): void => { setCreateDialogOpen(true); }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedLessons.map((lesson) => {
            const { filled, progress } = getLessonProgress(lesson);
            return (
              <Card key={lesson.id} variant="elevated" padding="none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
                      <span className="text-sm font-bold text-primary-500">
                        {String(lesson.displayOrder).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {lesson.title}
                        </h3>
                        <Badge
                          variant={lesson.published ? "success" : "warning"}
                          className="shrink-0 text-[10px]"
                        >
                          {lesson.published ? "منشور" : "مسودة"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {String(filled)}/{String(TOTAL_CONTENT_BLOCKS)} محتوى
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {String(lesson.estimatedDuration)} دقيقة
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{ width: `${String(progress)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] text-neutral-400">
                          {String(progress)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(): void => {
                          router.push(
                            `/dashboard/units/${unitId}/lessons/${lesson.id}`,
                          );
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                        فتح
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="تعديل"
                        onClick={(): void => { handleEditClick(lesson); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="نسخ"
                        loading={duplicateMutation.isPending}
                        onClick={(): void => { duplicateMutation.mutate(lesson); }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        className="text-danger-500 hover:bg-danger-500/10"
                        onClick={(): void => { setDeleteTarget(lesson); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Button
        variant="primary"
        className="fixed bottom-20 left-4 z-20 shadow-lg lg:bottom-6 lg:left-6"
        onClick={(): void => { setCreateDialogOpen(true); }}
      >
        <Plus className="h-5 w-5" />
        درس جديد
      </Button>

      <LessonFormDialog
        open={createDialogOpen}
        onClose={(): void => { setCreateDialogOpen(false); }}
        unitId={unitId}
      />

      <LessonFormDialog
        open={editTarget !== null}
        onClose={(): void => { setEditTarget(null); }}
        unitId={unitId}
        lesson={editTarget}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={(): void => { setDeleteTarget(null); }}
        title="تأكيد الحذف"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            هل أنت متأكد من حذف الدرس{" "}
            <span className="font-bold">{deleteTarget?.title ?? ""}</span>؟
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "فشل حذف الدرس"}
            </p>
          )}
        </DialogContent>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={(): void => { setDeleteTarget(null); }}
          >
            إلغاء
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={(): void => {
              if (deleteTarget) {
                deleteMutation.mutate(deleteTarget.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            حذف
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function UnitDetailSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

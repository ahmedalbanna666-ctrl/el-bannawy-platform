"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
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
import { ChapterFormDialog, type ChapterEditData } from "./_components/chapter-form-dialog";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import {
  Plus,
  Pencil,
  Trash2,
  ScrollText,
  Clock,
} from "lucide-react";

interface ChapterManagement {
  readonly id: string;
  readonly title: string;
  readonly content: unknown;
  readonly imageUrl: string | null;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly createdAt: string;
}

interface StoryDetailManagement {
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
  readonly chapters: readonly ChapterManagement[];
}

export default function StoryDetailPage(): ReactNode {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, can } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const storyId = params.storyId as string;
  const queryClient = useQueryClient();

  const canEdit = can(PERMISSIONS.STORY_EDIT);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChapterEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChapterManagement | null>(null);

  const hydrated = typeof rawRole === "string";

  const { data: story, isLoading, isError, error } = useQuery({
    queryKey: ["management-story", storyId],
    queryFn: async () => {
      const res = await api.get<StoryDetailManagement>(
        `/stories/management/${storyId}`,
      );
      return res.data ?? null;
    },
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      api.delete(`/stories/${storyId}/chapters/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-story", storyId],
      });
      setDeleteTarget(null);
    },
  });

  const sortedChapters = useMemo(
    () =>
      [...(story?.chapters ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [story],
  );

  if (!hydrated || !isManagement) {
    return null;
  }

  if (isLoading) return <StoryDetailSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل القصة"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  if (!story) {
    return (
      <EmptyState
        title="القصة غير موجودة"
        description="القصة التي تبحث عنها غير متوفرة"
        icon={<ScrollText className="h-16 w-16" />}
      />
    );
  }

  const handleEditClick = (chapter: ChapterManagement): void => {
    setEditTarget({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content as Record<string, unknown> | null,
      imageUrl: chapter.imageUrl,
      displayOrder: chapter.displayOrder,
      published: chapter.published,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <TeacherContextBanner />
      <Breadcrumb
        items={[
          { label: "القصص", href: "/dashboard/stories" },
          { label: story.title },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary-500">
              Story #{String(story.displayOrder)}
            </span>
            <Badge
              variant={story.published ? "success" : "warning"}
              className="text-[10px]"
            >
              {story.published ? "منشور" : "مسودة"}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {story.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {story.grade.stage.name} — {story.grade.name}
          </p>
          {story.description && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {story.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          الفصول ({String(sortedChapters.length)})
        </h2>
      </div>

      {sortedChapters.length === 0 ? (
        <EmptyState
          title="لا توجد فصول"
          description="ابدأ بإنشاء فصل جديد في هذه القصة"
          icon={<ScrollText className="h-16 w-16" />}
          actionLabel={canEdit ? "إنشاء فصل" : undefined}
          onAction={canEdit ? ((): void => { setCreateDialogOpen(true); }) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedChapters.map((chapter) => (
            <Card key={chapter.id} variant="elevated" padding="none">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
                    <span className="text-sm font-bold text-primary-500">
                      {String(chapter.displayOrder).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {chapter.title}
                      </h3>
                      <Badge
                        variant={chapter.published ? "success" : "warning"}
                        className="shrink-0 text-[10px]"
                      >
                        {chapter.published ? "منشور" : "مسودة"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                      {chapter.imageUrl && (
                        <span className="flex items-center gap-1">
                          🖼️ مع صورة
                        </span>
                      )}
                      {!!chapter.content && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          مع محتوى
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="تعديل"
                        onClick={(): void => { handleEditClick(chapter); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        className="text-danger-500 hover:bg-danger-500/10"
                        onClick={(): void => { setDeleteTarget(chapter); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canEdit && (
        <Button
          variant="primary"
          className="fixed bottom-20 left-4 z-20 shadow-lg lg:bottom-6 lg:left-6"
          onClick={(): void => { setCreateDialogOpen(true); }}
        >
          <Plus className="h-5 w-5" />
          فصل جديد
        </Button>
      )}

      {canEdit && (
        <ChapterFormDialog
          open={createDialogOpen}
          onClose={(): void => { setCreateDialogOpen(false); }}
          storyId={storyId}
        />
      )}

      {canEdit && (
        <ChapterFormDialog
          open={editTarget !== null}
          onClose={(): void => { setEditTarget(null); }}
          storyId={storyId}
          chapter={editTarget}
        />
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={(): void => { setDeleteTarget(null); }}
        title="تأكيد الحذف"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            هل أنت متأكد من حذف الفصل{" "}
            <span className="font-bold">{deleteTarget?.title ?? ""}</span>؟
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "فشل حذف الفصل"}
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

function StoryDetailSkeleton(): ReactNode {
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
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

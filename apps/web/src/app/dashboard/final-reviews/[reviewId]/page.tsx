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
import { SectionFormDialog, type SectionEditData } from "./_components/section-form-dialog";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import {
  Plus,
  Pencil,
  Trash2,
  BookMarked,
  HelpCircle,
  Clock,
} from "lucide-react";

interface SectionManagement {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly questionCount: number;
  readonly durationMinutes: number;
  readonly displayOrder: number;
  readonly published: boolean;
}

interface FinalReviewDetailManagement {
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
  readonly sections: readonly SectionManagement[];
}

export default function FinalReviewDetailPage(): ReactNode {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, can } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const reviewId = params.reviewId as string;
  const queryClient = useQueryClient();

  const canEdit = can(PERMISSIONS.FINAL_REVIEW_EDIT);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SectionEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SectionManagement | null>(null);

  const hydrated = typeof rawRole === "string";

  const { data: review, isLoading, isError, error } = useQuery({
    queryKey: ["management-final-review", reviewId],
    queryFn: async () => {
      const res = await api.get<FinalReviewDetailManagement>(
        `/final-reviews/management/${reviewId}`,
      );
      return res.data ?? null;
    },
    staleTime: 30_000,
    enabled: hydrated && isManagement,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      api.delete(`/final-reviews/${reviewId}/sections/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-final-review", reviewId],
      });
      setDeleteTarget(null);
    },
  });

  const sortedSections = useMemo(
    () =>
      [...(review?.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [review],
  );

  if (!hydrated || !isManagement) {
    return null;
  }

  if (isLoading) return <FinalReviewDetailSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل المراجعة"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  if (!review) {
    return (
      <EmptyState
        title="المراجعة غير موجودة"
        description="المراجعة النهائية التي تبحث عنها غير متوفرة"
        icon={<BookMarked className="h-16 w-16" />}
      />
    );
  }

  const handleEditClick = (section: SectionManagement): void => {
    setEditTarget({
      id: section.id,
      title: section.title,
      description: section.description,
      questionCount: section.questionCount,
      durationMinutes: section.durationMinutes,
      displayOrder: section.displayOrder,
      published: section.published,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <TeacherContextBanner />
      <Breadcrumb
        items={[
          { label: "المراجعات النهائية", href: "/dashboard/final-reviews" },
          { label: review.title },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary-500">
              Review #{String(review.displayOrder)}
            </span>
            <Badge
              variant={review.published ? "success" : "warning"}
              className="text-[10px]"
            >
              {review.published ? "منشور" : "مسودة"}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {review.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {review.grade.stage.name} — {review.grade.name}
          </p>
          {review.description && (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {review.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          الأقسام ({String(sortedSections.length)})
        </h2>
      </div>

      {sortedSections.length === 0 ? (
        <EmptyState
          title="لا توجد أقسام"
          description="ابدأ بإنشاء قسم جديد في هذه المراجعة"
          icon={<BookMarked className="h-16 w-16" />}
          actionLabel={canEdit ? "إنشاء قسم" : undefined}
          onAction={canEdit ? ((): void => { setCreateDialogOpen(true); }) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedSections.map((section) => (
            <Card key={section.id} variant="elevated" padding="none">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
                    <span className="text-sm font-bold text-primary-500">
                      {String(section.displayOrder).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {section.title}
                      </h3>
                      <Badge
                        variant={section.published ? "success" : "warning"}
                        className="shrink-0 text-[10px]"
                      >
                        {section.published ? "منشور" : "مسودة"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {String(section.questionCount)} سؤال
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {String(section.durationMinutes)} دقيقة
                      </span>
                    </div>
                    {section.description && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-1">
                        {section.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="تعديل"
                        onClick={(): void => { handleEditClick(section); }}
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
                        onClick={(): void => { setDeleteTarget(section); }}
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
          قسم جديد
        </Button>
      )}

      {canEdit && (
        <SectionFormDialog
          open={createDialogOpen}
          onClose={(): void => { setCreateDialogOpen(false); }}
          reviewId={reviewId}
        />
      )}

      {canEdit && (
        <SectionFormDialog
          open={editTarget !== null}
          onClose={(): void => { setEditTarget(null); }}
          reviewId={reviewId}
          section={editTarget}
        />
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={(): void => { setDeleteTarget(null); }}
        title="تأكيد الحذف"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            هل أنت متأكد من حذف القسم{" "}
            <span className="font-bold">{deleteTarget?.title ?? ""}</span>؟
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "فشل حذف القسم"}
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

function FinalReviewDetailSkeleton(): ReactNode {
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

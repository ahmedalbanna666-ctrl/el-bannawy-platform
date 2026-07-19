"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { useAcademicContext } from "@/lib/academic-context-store";
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
import { FinalReviewFormDialog, type FinalReviewEditData } from "./final-review-form-dialog";
import {
  BookMarked,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  GripVertical,
  Clock,
  Layers,
} from "lucide-react";

interface FinalReviewManagement {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly grade: {
    readonly id: string;
    readonly name: string;
    readonly stage: { readonly id: string; readonly name: string };
  };
  readonly _count: { readonly sections: number };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminFinalReviewsView(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FinalReviewEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinalReviewManagement | null>(null);

  const canEdit = can(PERMISSIONS.FINAL_REVIEW_EDIT);
  const canManage = canEdit;

  const academicContext = useAcademicContext();

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (academicContext.gradeId) params.set("gradeId", academicContext.gradeId);
    if (academicContext.academicYearId) params.set("academicYearId", academicContext.academicYearId);
    if (academicContext.termId) params.set("termId", academicContext.termId);
    if (academicContext.educationalSystem) params.set("educationalSystem", academicContext.educationalSystem);
    return params.toString();
  }, [academicContext]);

  const { data: reviews, isLoading, isError, error } = useQuery({
    queryKey: ["management-final-reviews", filterParams],
    queryFn: async () => {
      const endpoint = `/final-reviews/management${filterParams ? `?${filterParams}` : ""}`;
      const res = await api.get<FinalReviewManagement[]>(endpoint);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/final-reviews/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["management-final-reviews"] });
      setDeleteTarget(null);
    },
  });

  const sortedReviews = useMemo(
    () => [...(reviews ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [reviews],
  );

  const openReview = (reviewId: string): void => {
    router.push(`/dashboard/final-reviews/${reviewId}`);
  };

  const handleEditClick = (review: FinalReviewManagement): void => {
    setEditTarget({
      id: review.id,
      title: review.title,
      description: review.description,
      coverImageUrl: null,
      gradeId: review.grade.id,
      displayOrder: review.displayOrder,
      published: review.published,
    });
  };

  if (isLoading) return <FinalReviewsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل المراجعات النهائية"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            إدارة المراجعات النهائية
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            إدارة محتوى المراجعة النهائية لكل صف دراسي
          </p>
        </div>
      </div>

      {sortedReviews.length === 0 ? (
        <EmptyState
          title="لا توجد مراجعات"
          description="ابدأ بإنشاء مراجعة نهائية جديدة"
          icon={<BookMarked className="h-16 w-16" />}
          actionLabel={canManage ? "إنشاء مراجعة" : undefined}
          onAction={canManage ? ((): void => { setCreateDialogOpen(true); }) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedReviews.map((review) => (
            <Card
              key={review.id}
              variant="elevated"
              padding="none"
              className="flex flex-col"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        #{String(review.displayOrder)}
                      </span>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {review.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {review.grade.stage.name} — {review.grade.name}
                    </p>
                  </div>
                  <Badge
                    variant={review.published ? "success" : "warning"}
                    className="shrink-0 text-[10px]"
                  >
                    {review.published ? "منشور" : "مسودة"}
                  </Badge>
                </div>

                {review.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {review.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-4 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {String(review._count.sections)} أقسام
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeDate(review.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={(): void => { openReview(review.id); }}
                  >
                    <ArrowRight className="h-4 w-4" />
                    فتح
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="تعديل"
                      onClick={(): void => { handleEditClick(review); }}
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
                      onClick={(): void => { setDeleteTarget(review); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="إعادة ترتيب"
                    disabled
                    className="text-neutral-400"
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <Button
          variant="primary"
          className="fixed bottom-20 left-4 z-20 shadow-lg lg:bottom-6 lg:left-6"
          onClick={(): void => { setCreateDialogOpen(true); }}
        >
          <Plus className="h-5 w-5" />
          مراجعة جديدة
        </Button>
      )}

      {canManage && (
        <FinalReviewFormDialog
          open={createDialogOpen}
          onClose={(): void => { setCreateDialogOpen(false); }}
        />
      )}

      {canEdit && (
        <FinalReviewFormDialog
          open={editTarget !== null}
          onClose={(): void => { setEditTarget(null); }}
          review={editTarget}
        />
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={(): void => { setDeleteTarget(null); }}
        title="تأكيد الحذف"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            هل أنت متأكد من حذف المراجعة{" "}
            <span className="font-bold">
              {deleteTarget?.title ?? ""}
            </span>
            ؟ سيتم حذف جميع الأقسام المرتبطة بها.
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "فشل حذف المراجعة"}
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

function FinalReviewsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

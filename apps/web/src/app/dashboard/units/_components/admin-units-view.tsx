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
import { UnitFormDialog, type UnitEditData } from "./unit-form-dialog";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  GripVertical,
  Clock,
  Layers,
} from "lucide-react";

interface UnitManagement {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly isPremium: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly grade: {
    readonly id: string;
    readonly name: string;
    readonly stage: { readonly id: string; readonly name: string };
  };
  readonly _count: { readonly lessons: number };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminUnitsView(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UnitEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitManagement | null>(null);

  const canCreate = can(PERMISSIONS.UNITS_CREATE);
  const canEdit = can(PERMISSIONS.UNITS_EDIT);
  const canDelete = can(PERMISSIONS.UNITS_DELETE);

  const academicContext = useAcademicContext();

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (academicContext.academicYearId) params.set("academicYearId", academicContext.academicYearId);
    if (academicContext.termId) params.set("termId", academicContext.termId);
    if (academicContext.educationalSystem) params.set("educationalSystem", academicContext.educationalSystem);
    return params.toString();
  }, [academicContext]);

  const { data: units, isLoading, isError, error } = useQuery({
    queryKey: ["management-units", filterParams],
    queryFn: async () => {
      const endpoint = `/curriculum/units${filterParams ? `?${filterParams}` : ""}`;
      const res = await api.get<UnitManagement[]>(endpoint);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/curriculum/units/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["management-units"] });
      setDeleteTarget(null);
    },
  });

  const sortedUnits = useMemo(
    () => [...(units ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [units],
  );

  const openUnit = (unitId: string): void => {
    router.push(`/dashboard/units/${unitId}`);
  };

  const handleEditClick = (unit: UnitManagement): void => {
    setEditTarget({
      id: unit.id,
      title: unit.title,
      description: unit.description,
      gradeId: unit.grade.id,
      displayOrder: unit.displayOrder,
      published: unit.published,
    });
  };

  if (isLoading) return <UnitsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الوحدات"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            إدارة الوحدات
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            إدارة جميع الوحدات التعليمية على المنصة
          </p>
        </div>
      </div>

      {sortedUnits.length === 0 ? (
        <EmptyState
          title="لا توجد وحدات"
          description="ابدأ بإنشاء وحدة تعليمية جديدة"
          icon={<BookOpen className="h-16 w-16" />}
          actionLabel={canCreate ? "إنشاء وحدة" : undefined}
          onAction={canCreate ? ((): void => { setCreateDialogOpen(true); }) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedUnits.map((unit) => (
            <Card
              key={unit.id}
              variant="elevated"
              padding="none"
              className="flex flex-col"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        #{String(unit.displayOrder)}
                      </span>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {unit.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {unit.grade.stage.name} — {unit.grade.name}
                    </p>
                  </div>
                  <Badge
                    variant={unit.published ? "success" : "warning"}
                    className="shrink-0 text-[10px]"
                  >
                    {unit.published ? "منشور" : "مسودة"}
                  </Badge>
                </div>

                {unit.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {unit.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-4 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {String(unit._count.lessons)} دروس
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeDate(unit.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={(): void => { openUnit(unit.id); }}
                  >
                    <ArrowRight className="h-4 w-4" />
                    فتح
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="تعديل"
                      onClick={(): void => { handleEditClick(unit); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="حذف"
                      className="text-danger-500 hover:bg-danger-500/10"
                      onClick={(): void => { setDeleteTarget(unit); }}
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

      {canCreate && (
        <Button
          variant="primary"
          className="fixed bottom-20 left-4 z-20 shadow-lg lg:bottom-6 lg:left-6"
          onClick={(): void => { setCreateDialogOpen(true); }}
        >
          <Plus className="h-5 w-5" />
          وحدة جديدة
        </Button>
      )}

      {canCreate && (
        <UnitFormDialog
          open={createDialogOpen}
          onClose={(): void => { setCreateDialogOpen(false); }}
        />
      )}

      {canEdit && (
        <UnitFormDialog
          open={editTarget !== null}
          onClose={(): void => { setEditTarget(null); }}
          unit={editTarget}
        />
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={(): void => { setDeleteTarget(null); }}
        title="تأكيد الحذف"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            هل أنت متأكد من حذف الوحدة{" "}
            <span className="font-bold">
              {deleteTarget?.title ?? ""}
            </span>
            ؟ سيتم حذف جميع الدروس والمحتوى المرتبط بها.
          </p>
          {deleteMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "فشل حذف الوحدة"}
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

function UnitsSkeleton(): ReactNode {
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

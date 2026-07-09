"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContext } from "@/lib/academic-context-store";
import { useAuthStore } from "@/lib/auth-store";
import { EDUCATIONAL_STAGES, ACADEMIC_TERMS } from "@/lib/education-options";
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
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  GripVertical,
  Clock,
  Layers,
  GraduationCap,
} from "lucide-react";

interface StageItem {
  id: string;
  name: string;
  displayOrder: number;
  grades: { id: string; name: string; displayOrder: number }[];
}

interface TermItem {
  id: string;
  name: string;
  displayOrder: number;
}

interface AcademicYearItem {
  id: string;
  name: string;
  isActive: boolean;
  terms: TermItem[];
}

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

function useStages(): UseQueryResult<StageItem[]> {
  return useQuery<StageItem[]>({
    queryKey: ["admin-stages"],
    queryFn: async () => {
      const res = await api.get<StageItem[]>("/admin/stages");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

function useAcademicYears(): UseQueryResult<AcademicYearItem[]> {
  return useQuery<AcademicYearItem[]>({
    queryKey: ["admin-academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYearItem[]>("/admin/academic-years");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

interface MyGradesResponse {
  gradeIds: string[];
  grades: { id: string; name: string; stage: { id: string; name: string } }[];
}

export function TeacherUnitsView(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UnitEditData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitManagement | null>(null);

  const { data: myGrades } = useQuery({
    queryKey: ["my-grades", userId],
    queryFn: async () => {
      const res = await api.get<MyGradesResponse>("/teachers/my-grades");
      return res.data ?? null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const hasAssignedGrades = (myGrades?.grades.length ?? 0) > 0;

  const academicContext = useAcademicContext();
  const { data: stages } = useStages();
  const { data: academicYears } = useAcademicYears();

  const academicFilterIds = useMemo(() => {
    if (!stages || !academicYears) return {};

    const stageLabel = EDUCATIONAL_STAGES.find((s) => s.id === academicContext.stage)?.label;
    const stage = stageLabel ? stages.find((s) => s.name === stageLabel) : undefined;

    const allGrades = stages.flatMap((s) => s.grades);
    const grade = academicContext.grade ? allGrades.find((g) => g.name === academicContext.grade) : undefined;

    const year = academicContext.academicYear ? academicYears.find((y) => y.name === academicContext.academicYear) : undefined;

    const termLabel = ACADEMIC_TERMS.find((t) => t.id === academicContext.term)?.label;
    const allTerms = academicYears.flatMap((y) => y.terms);
    const term = termLabel ? allTerms.find((t) => t.name === termLabel) : undefined;

    return {
      gradeId: grade?.id,
      academicYearId: year?.id,
      termId: term?.id,
      educationalSystem: academicContext.educationalSystem,
    };
  }, [stages, academicYears, academicContext]);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (academicFilterIds.gradeId) params.set("gradeId", academicFilterIds.gradeId);
    if (academicFilterIds.academicYearId) params.set("academicYearId", academicFilterIds.academicYearId);
    if (academicFilterIds.termId) params.set("termId", academicFilterIds.termId);
    if (academicFilterIds.educationalSystem) params.set("educationalSystem", academicFilterIds.educationalSystem);
    return params.toString();
  }, [academicFilterIds]);

  const { data: units, isLoading, isError, error } = useQuery({
    queryKey: ["management-units", academicFilterIds],
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
      <TeacherContextBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            إدارة الوحدات
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            إنشاء وإدارة الوحدات التعليمية والدروس
          </p>
        </div>
      </div>

      {!hasAssignedGrades ? (
        <EmptyState
          title="لم يتم إسناد أي صف دراسي لك حتى الآن."
          description="يرجى التواصل مع الإدارة لتحديد الصفوف الدراسية الخاصة بك."
          icon={<GraduationCap className="h-16 w-16" />}
        />
      ) : sortedUnits.length === 0 ? (
        <EmptyState
          title="لا توجد وحدات"
          description="ابدأ بإنشاء وحدة تعليمية جديدة"
          icon={<BookOpen className="h-16 w-16" />}
          actionLabel="إنشاء وحدة"
          onAction={(): void => { setCreateDialogOpen(true); }}
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="تعديل"
                    onClick={(): void => { handleEditClick(unit); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="حذف"
                    className="text-danger-500 hover:bg-danger-500/10"
                    onClick={(): void => { setDeleteTarget(unit); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {hasAssignedGrades && (
        <Button
          variant="primary"
          className="fixed bottom-20 left-4 z-20 shadow-lg lg:bottom-6 lg:left-6"
          onClick={(): void => { setCreateDialogOpen(true); }}
        >
          <Plus className="h-5 w-5" />
          وحدة جديدة
        </Button>
      )}

      <UnitFormDialog
        open={createDialogOpen}
        onClose={(): void => { setCreateDialogOpen(false); }}
      />

      <UnitFormDialog
        open={editTarget !== null}
        onClose={(): void => { setEditTarget(null); }}
        unit={editTarget}
      />

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

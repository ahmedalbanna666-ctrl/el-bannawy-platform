"use client";

import { useState, useEffect, useMemo, type SyntheticEvent, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContextStore, useAcademicContext } from "@/lib/academic-context-store";
import { useAuthStore } from "@/lib/auth-store";
import { ACADEMIC_TERMS } from "@/lib/education-options";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";

interface AcademicYearLookup {
  readonly id: string;
  readonly name: string;
  readonly terms: { readonly id: string; readonly name: string }[];
}

interface StageLookup {
  readonly id: string;
  readonly name: string;
  readonly grades: { readonly id: string; readonly name: string }[];
}

interface UnitEditData {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly gradeId: string;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly isPremium: boolean;
  readonly lockedOverride: boolean | null;
}

interface UnitFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly unit?: UnitEditData | null;
}

interface UnitFormData {
  title: string;
  description: string;
  displayOrder: string;
  published: boolean;
  isPremium: boolean;
  lockedOverride: string;
}

const EMPTY_FORM: UnitFormData = {
  title: "",
  description: "",
  displayOrder: "",
  published: true,
  isPremium: false,
  lockedOverride: "auto",
};

function toLockedOverride(value: string): boolean | null {
  if (value === "locked") return true;
  if (value === "open") return false;
  return null;
}

export function UnitFormDialog({
  open,
  onClose,
  unit,
}: UnitFormDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const isEdit = unit !== null && unit !== undefined;

  const [formData, setFormData] = useState<UnitFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setFormData({
        title: unit?.title ?? "",
        description: unit?.description ?? "",
        displayOrder:
          unit !== null && unit !== undefined
            ? String(unit.displayOrder)
            : "",
        published: unit?.published ?? true,
        isPremium: unit?.isPremium ?? false,
        lockedOverride:
          unit?.lockedOverride === null || unit?.lockedOverride === undefined
            ? "auto"
            : unit.lockedOverride
              ? "locked"
              : "open",
      });
    }
  }, [open, unit]);

  const academicYearFromStore = useAcademicContextStore((s) => s.academicYear);
  const termFromStore = useAcademicContextStore((s) => s.term);
  const gradeFromStore = useAcademicContextStore((s) => s.grade);
  const academicYearIdFromStore = useAcademicContextStore((s) => s.academicYearId);
  const termIdFromStore = useAcademicContextStore((s) => s.termId);
  const ctx = useAcademicContext();
  const educationalSystem = ctx.educationalSystem;
  const userId = useAuthStore((s) => s.user?.id);
  const userRole = useAuthStore((s) => s.user?.role);
  const isAdmin = userRole === "ADMINISTRATOR";

  const { data: academicYears, isLoading: academicYearsLoading } = useQuery({
    queryKey: ["admin-academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYearLookup[]>("/admin/academic-years");
      return res.data ?? [];
    },
    enabled: open && !isEdit,
    staleTime: 300_000,
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["admin-stages"],
    queryFn: async () => {
      const res = await api.get<StageLookup[]>("/admin/stages");
      return res.data ?? [];
    },
    enabled: open && !isEdit && isAdmin,
    staleTime: 300_000,
  });

  const { data: myGrades } = useQuery({
    queryKey: ["my-grades", userId],
    queryFn: async () => {
      const res = await api.get<{ gradeIds: string[]; grades: { id: string; name: string; stage: { id: string; name: string } }[] }>("/teachers/my-grades");
      return res.data ?? null;
    },
    enabled: open && !isEdit && !isAdmin && !!userId,
    staleTime: 30_000,
  });

  const resolvedAcademicYearId = useMemo(() => {
    if (academicYearIdFromStore) return academicYearIdFromStore;
    if (!academicYears || !academicYearFromStore) return null;
    const year = academicYears.find((y) => y.name === academicYearFromStore);
    return year?.id ?? null;
  }, [academicYears, academicYearFromStore, academicYearIdFromStore]);

  const resolvedTermId = useMemo(() => {
    if (termIdFromStore) return termIdFromStore;
    if (!academicYears || !academicYearFromStore || !termFromStore) return null;
    const year = academicYears.find((y) => y.name === academicYearFromStore);
    if (!year) return null;
    const termLabel = ACADEMIC_TERMS.find((t) => t.id === termFromStore)?.label;
    const term = termLabel ? year.terms.find((t) => t.name === termLabel) : undefined;
    return term?.id ?? null;
  }, [academicYears, academicYearFromStore, termFromStore, termIdFromStore]);

  const resolvedGradeId = useMemo(() => {
    if (!gradeFromStore) return null;
    if (stages && stages.length > 0) {
      for (const stage of stages) {
        const grade = stage.grades.find((g) => g.name === gradeFromStore);
        if (grade) return grade.id;
      }
    }
    if (myGrades?.grades) {
      const grade = myGrades.grades.find((g) => g.name === gradeFromStore);
      if (grade) return grade.id;
    }
    return null;
  }, [stages, myGrades, gradeFromStore]);

  const academicContextResolved =
    isEdit ||
    (resolvedAcademicYearId !== null &&
     resolvedTermId !== null &&
     resolvedGradeId !== null);

  const contextLoading = academicYearsLoading || stagesLoading;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        displayOrder: formData.displayOrder
          ? Number(formData.displayOrder)
          : undefined,
      };

      if (!unit) {
        payload.gradeId = resolvedGradeId;
        payload.academicYearId = resolvedAcademicYearId;
        payload.termId = resolvedTermId;
        payload.educationalSystem = educationalSystem;
        payload.published = formData.published;
        payload.isPremium = formData.isPremium;
        payload.lockedOverride = toLockedOverride(formData.lockedOverride);
      } else {
        payload.gradeId = unit.gradeId;
      }

      if (unit) {
        payload.published = formData.published;
        payload.isPremium = formData.isPremium;
        payload.lockedOverride = toLockedOverride(formData.lockedOverride);
        return api.patch(`/curriculum/units/${unit.id}`, payload);
      }
      return api.post("/curriculum/units", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["management-units"] });
      onClose();
    },
  });

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (!isEdit && !academicContextResolved) return;
    if (isEdit && !unit.gradeId) return;
    mutation.mutate();
  };

  const update = <K extends keyof UnitFormData>(
    key: K,
    value: UnitFormData[K],
  ): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "تعديل الوحدة" : "إنشاء وحدة جديدة"}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent className="flex flex-col gap-4">
          <Input
            label="عنوان الوحدة"
            placeholder="مثال: Unit 1 - Greetings"
            value={formData.title}
            onChange={(e): void => { update("title", e.target.value); }}
          />
          <Textarea
            label="الوصف"
            placeholder="وصف مختصر للوحدة"
            value={formData.description}
            onChange={(e): void => { update("description", e.target.value); }}
          />
          <Input
            label="ترتيب العرض"
            type="number"
            placeholder="0"
            value={formData.displayOrder}
            onChange={(e): void => { update("displayOrder", e.target.value); }}
          />
          {isEdit && (
            <Switch
              label="منشور"
              checked={formData.published}
              onChange={(e): void => { update("published", e.target.checked); }}
            />
          )}
          <Switch
            label="مدفوع (مقفل للطلاب)"
            checked={formData.isPremium}
            onChange={(e): void => { update("isPremium", e.target.checked); }}
          />
          <Select
            label="القفل التتابعي"
            value={formData.lockedOverride}
            onChange={(e): void => { update("lockedOverride", e.target.value); }}
            options={[
              { value: "auto", label: "تلقائي (حسب اجتياز امتحان الوحدة السابقة)" },
              { value: "open", label: "مفتوح دائماً" },
              { value: "locked", label: "مقفل دائماً" },
            ]}
          />
          {!isEdit && contextLoading && (
            <p className="text-sm text-neutral-500">جاري تحميل السياق الأكاديمي...</p>
          )}
          {!isEdit && !contextLoading && !academicContextResolved && (
            <p className="text-sm text-danger-500" role="alert">
              تعذر تحميل السياق الأكاديمي. يرجى التأكد من اختيار السنة الدراسية والترم والصف من الشريط العلوي.
            </p>
          )}
          {mutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "فشل حفظ الوحدة"}
            </p>
          )}
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={mutation.isPending}
            disabled={
              !formData.title.trim()
              || (!isEdit && contextLoading)
              || (!isEdit && !academicContextResolved)
              || (isEdit && !unit.gradeId)
            }
          >
            {isEdit ? "حفظ التغييرات" : "إنشاء"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export type { UnitFormDialogProps, UnitEditData };

"use client";

import { useState, useEffect, useMemo, type SyntheticEvent, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContextStore, useAcademicContext } from "@/lib/academic-context-store";
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

interface AcademicYearLookup {
  readonly id: string;
  readonly name: string;
  readonly terms: { readonly id: string; readonly name: string }[];
}

interface AdminGrade {
  readonly id: string;
  readonly name: string;
  readonly stage: { readonly id: string; readonly name: string };
}

interface GradeApiResponse {
  readonly gradeIds: string[];
  readonly grades: AdminGrade[];
}

interface UnitEditData {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly gradeId: string;
  readonly displayOrder: number;
  readonly published: boolean;
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
}

const EMPTY_FORM: UnitFormData = {
  title: "",
  description: "",
  displayOrder: "",
  published: true,
};

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
      });
    }
  }, [open, unit]);

  const academicYearFromStore = useAcademicContextStore((s) => s.academicYear);
  const termFromStore = useAcademicContextStore((s) => s.term);
  const ctx = useAcademicContext();
  const educationalSystem = ctx.educationalSystem;

  const { data: academicYears, isLoading: academicYearsLoading } = useQuery({
    queryKey: ["admin-academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYearLookup[]>("/admin/academic-years");
      return res.data ?? [];
    },
    enabled: open && !isEdit,
    staleTime: 300_000,
  });

  const resolvedAcademicYearId = useMemo(() => {
    if (!academicYears || !academicYearFromStore) return null;
    const year = academicYears.find((y) => y.name === academicYearFromStore);
    return year?.id ?? null;
  }, [academicYears, academicYearFromStore]);

  const resolvedTermId = useMemo(() => {
    if (!academicYears || !academicYearFromStore || !termFromStore) return null;
    const year = academicYears.find((y) => y.name === academicYearFromStore);
    if (!year) return null;
    const termLabel = ACADEMIC_TERMS.find((t) => t.id === termFromStore)?.label;
    const term = termLabel ? year.terms.find((t) => t.name === termLabel) : undefined;
    return term?.id ?? null;
  }, [academicYears, academicYearFromStore, termFromStore]);

  const resolvedGradeId = useMemo(() => {
    if (!ctx.grade) return null;
    return ctx.grade;
  }, [ctx.grade]);

  const academicContextResolved =
    isEdit ||
    (resolvedAcademicYearId !== null &&
     resolvedTermId !== null &&
     resolvedGradeId !== null);

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
      } else {
        payload.gradeId = unit.gradeId;
      }

      if (unit) {
        payload.published = formData.published;
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
    if (isEdit && !unit?.gradeId) return;
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
          {!isEdit && academicYearsLoading && (
            <p className="text-sm text-neutral-500">جاري تحميل السياق الأكاديمي...</p>
          )}
          {!isEdit && !academicYearsLoading && !academicContextResolved && (
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
              || (!isEdit && academicYearsLoading)
              || (!isEdit && !academicContextResolved)
              || (isEdit && !unit?.gradeId)
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

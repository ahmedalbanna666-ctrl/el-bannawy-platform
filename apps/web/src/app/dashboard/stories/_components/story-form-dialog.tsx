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

interface AcademicYearLookup {
  readonly id: string;
  readonly name: string;
  readonly terms: { readonly id: string; readonly name: string }[];
}

interface StoryEditData {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly coverImageUrl: string | null;
  readonly gradeId: string;
  readonly displayOrder: number;
  readonly published: boolean;
}

interface StoryFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly story?: StoryEditData | null;
}

interface StoryFormData {
  title: string;
  description: string;
  coverImageUrl: string;
  displayOrder: string;
  published: boolean;
}

const EMPTY_FORM: StoryFormData = {
  title: "",
  description: "",
  coverImageUrl: "",
  displayOrder: "",
  published: true,
};

export function StoryFormDialog({
  open,
  onClose,
  story,
}: StoryFormDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const isEdit = story !== null && story !== undefined;

  const [formData, setFormData] = useState<StoryFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setFormData({
        title: story?.title ?? "",
        description: story?.description ?? "",
        coverImageUrl: story?.coverImageUrl ?? "",
        displayOrder:
          story !== null && story !== undefined
            ? String(story.displayOrder)
            : "",
        published: story?.published ?? true,
      });
    }
  }, [open, story]);

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
      const res = await api.get<{ id: string; name: string; grades: { id: string; name: string }[] }[]>("/admin/stages");
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
    if (ctx.gradeId) return ctx.gradeId;
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
  }, [stages, myGrades, gradeFromStore, ctx.gradeId]);

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
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        displayOrder: formData.displayOrder
          ? Number(formData.displayOrder)
          : undefined,
      };

      if (!story) {
        payload.gradeId = resolvedGradeId;
        payload.academicYearId = resolvedAcademicYearId;
        payload.termId = resolvedTermId;
        payload.educationalSystem = educationalSystem;
        payload.published = formData.published;
      }

      if (story) {
        payload.published = formData.published;
        return api.patch(`/stories/${story.id}`, payload);
      }
      return api.post("/stories", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["management-stories"] });
      onClose();
    },
  });

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (!isEdit && !academicContextResolved) return;
    mutation.mutate();
  };

  const update = <K extends keyof StoryFormData>(
    key: K,
    value: StoryFormData[K],
  ): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "تعديل القصة" : "إنشاء قصة جديدة"}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent className="flex flex-col gap-4">
          <Input
            label="عنوان القصة"
            placeholder="مثال: Story 1 - My Journey"
            value={formData.title}
            onChange={(e): void => { update("title", e.target.value); }}
          />
          <Textarea
            label="الوصف"
            placeholder="وصف مختصر للقصة"
            value={formData.description}
            onChange={(e): void => { update("description", e.target.value); }}
          />
          <Input
            label="رابط صورة الغلاف"
            placeholder="https://example.com/cover.jpg"
            value={formData.coverImageUrl}
            onChange={(e): void => { update("coverImageUrl", e.target.value); }}
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
                : "فشل حفظ القصة"}
            </p>
          )}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
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
            }
          >
            {isEdit ? "حفظ التغييرات" : "إنشاء"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export type { StoryFormDialogProps, StoryEditData };

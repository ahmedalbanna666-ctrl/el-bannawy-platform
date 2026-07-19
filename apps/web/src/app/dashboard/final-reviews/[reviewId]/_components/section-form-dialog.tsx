"use client";

import { useState, useEffect, type SyntheticEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface SectionEditData {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly questionCount: number;
  readonly durationMinutes: number;
  readonly displayOrder: number;
  readonly published: boolean;
}

interface SectionFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly reviewId: string;
  readonly section?: SectionEditData | null;
}

interface SectionFormData {
  title: string;
  description: string;
  questionCount: string;
  durationMinutes: string;
  displayOrder: string;
  published: boolean;
}

const EMPTY_FORM: SectionFormData = {
  title: "",
  description: "",
  questionCount: "",
  durationMinutes: "",
  displayOrder: "",
  published: true,
};

export function SectionFormDialog({
  open,
  onClose,
  reviewId,
  section,
}: SectionFormDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const isEdit = section !== null && section !== undefined;

  const [formData, setFormData] = useState<SectionFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setFormData({
        title: section?.title ?? "",
        description: section?.description ?? "",
        questionCount:
          section !== null && section !== undefined
            ? String(section.questionCount)
            : "",
        durationMinutes:
          section !== null && section !== undefined
            ? String(section.durationMinutes)
            : "",
        displayOrder:
          section !== null && section !== undefined
            ? String(section.displayOrder)
            : "",
        published: section?.published ?? true,
      });
    }
  }, [open, section]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        displayOrder: formData.displayOrder
          ? Number(formData.displayOrder)
          : undefined,
        questionCount: formData.questionCount
          ? Number(formData.questionCount)
          : undefined,
        durationMinutes: formData.durationMinutes
          ? Number(formData.durationMinutes)
          : undefined,
      };

      if (section) {
        payload.published = formData.published;
        return api.patch(
          `/final-reviews/${reviewId}/sections/${section.id}`,
          payload,
        );
      }
      return api.post(`/final-reviews/${reviewId}/sections`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-final-review", reviewId],
      });
      onClose();
    },
  });

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    mutation.mutate();
  };

  const update = <K extends keyof SectionFormData>(
    key: K,
    value: SectionFormData[K],
  ): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "تعديل القسم" : "إنشاء قسم جديد"}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent className="flex flex-col gap-4">
          <Input
            label="عنوان القسم"
            placeholder="مثال: Section 1 - Grammar Review"
            value={formData.title}
            onChange={(e): void => { update("title", e.target.value); }}
          />
          <Textarea
            label="الوصف"
            placeholder="وصف مختصر للقسم"
            value={formData.description}
            onChange={(e): void => { update("description", e.target.value); }}
          />
          <Input
            label="عدد الأسئلة"
            type="number"
            placeholder="0"
            value={formData.questionCount}
            onChange={(e): void => { update("questionCount", e.target.value); }}
          />
          <Input
            label="المدة (دقائق)"
            type="number"
            placeholder="0"
            value={formData.durationMinutes}
            onChange={(e): void => { update("durationMinutes", e.target.value); }}
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
          {mutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "فشل حفظ القسم"}
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
            disabled={!formData.title.trim()}
          >
            {isEdit ? "حفظ التغييرات" : "إنشاء"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export type { SectionFormDialogProps, SectionEditData };

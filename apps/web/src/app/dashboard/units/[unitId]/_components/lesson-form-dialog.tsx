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
import { Switch } from "@/components/ui/switch";

interface LessonEditData {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly homeworkEnabled: boolean;
  readonly quizEnabled: boolean;
}

interface LessonFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly unitId: string;
  readonly lesson?: LessonEditData | null;
}

interface LessonFormData {
  title: string;
  displayOrder: string;
  published: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
}

const EMPTY_FORM: LessonFormData = {
  title: "",
  displayOrder: "",
  published: true,
  homeworkEnabled: false,
  quizEnabled: false,
};

export function LessonFormDialog({
  open,
  onClose,
  unitId,
  lesson,
}: LessonFormDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const isEdit = lesson !== null && lesson !== undefined;

  const [formData, setFormData] = useState<LessonFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setFormData({
        title: lesson?.title ?? "",
        displayOrder:
          lesson !== null && lesson !== undefined
            ? String(lesson.displayOrder)
            : "",
        published: lesson?.published ?? true,
        homeworkEnabled: lesson?.homeworkEnabled ?? false,
        quizEnabled: lesson?.quizEnabled ?? false,
      });
    }
  }, [open, lesson]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        displayOrder: formData.displayOrder
          ? Number(formData.displayOrder)
          : undefined,
      };
      if (lesson) {
        payload.published = formData.published;
        payload.homeworkEnabled = formData.homeworkEnabled;
        payload.quizEnabled = formData.quizEnabled;
        return api.patch(`/curriculum/lessons/${lesson.id}`, payload);
      }
      return api.post("/curriculum/lessons", {
        ...payload,
        unitId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-unit", unitId],
      });
      onClose();
    },
  });

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    mutation.mutate();
  };

  const update = <K extends keyof LessonFormData>(
    key: K,
    value: LessonFormData[K],
  ): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "تعديل الدرس" : "إنشاء درس جديد"}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent className="flex flex-col gap-4">
          <Input
            label="عنوان الدرس"
            placeholder="مثال: Lesson 1 - Introduction"
            value={formData.title}
            onChange={(e): void => { update("title", e.target.value); }}
          />
          <Input
            label="ترتيب العرض"
            type="number"
            placeholder="0"
            value={formData.displayOrder}
            onChange={(e): void => { update("displayOrder", e.target.value); }}
          />
          {isEdit && (
            <>
              <Switch
                label="منشور"
                checked={formData.published}
                onChange={(e): void => { update("published", e.target.checked); }}
              />
              <Switch
                label="تفعيل الواجب"
                checked={formData.homeworkEnabled}
                onChange={(e): void => {
                  update("homeworkEnabled", e.target.checked);
                }}
              />
              <Switch
                label="تفعيل الاختبار"
                checked={formData.quizEnabled}
                onChange={(e): void => { update("quizEnabled", e.target.checked); }}
              />
            </>
          )}
          {mutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "فشل حفظ الدرس"}
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

export type { LessonFormDialogProps, LessonEditData };

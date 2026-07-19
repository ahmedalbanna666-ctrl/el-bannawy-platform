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

interface ChapterEditData {
  readonly id: string;
  readonly title: string;
  readonly content: Record<string, unknown> | null;
  readonly imageUrl: string | null;
  readonly displayOrder: number;
  readonly published: boolean;
}

interface ChapterFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly storyId: string;
  readonly chapter?: ChapterEditData | null;
}

interface ChapterFormData {
  title: string;
  content: string;
  imageUrl: string;
  displayOrder: string;
  published: boolean;
}

const EMPTY_FORM: ChapterFormData = {
  title: "",
  content: "",
  imageUrl: "",
  displayOrder: "",
  published: true,
};

export function ChapterFormDialog({
  open,
  onClose,
  storyId,
  chapter,
}: ChapterFormDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const isEdit = chapter !== null && chapter !== undefined;

  const [formData, setFormData] = useState<ChapterFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setFormData({
        title: chapter?.title ?? "",
        content: chapter?.content ? JSON.stringify(chapter.content, null, 2) : "",
        imageUrl: chapter?.imageUrl ?? "",
        displayOrder:
          chapter !== null && chapter !== undefined
            ? String(chapter.displayOrder)
            : "",
        published: chapter?.published ?? true,
      });
    }
  }, [open, chapter]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        displayOrder: formData.displayOrder
          ? Number(formData.displayOrder)
          : undefined,
      };

      if (formData.content.trim()) {
        try {
          payload.content = JSON.parse(formData.content);
        } catch {
          payload.content = formData.content;
        }
      }
      if (formData.imageUrl.trim()) {
        payload.imageUrl = formData.imageUrl.trim();
      }

      if (chapter) {
        payload.published = formData.published;
        return api.patch(`/stories/${storyId}/chapters/${chapter.id}`, payload);
      }
      return api.post(`/stories/${storyId}/chapters`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["management-story", storyId],
      });
      onClose();
    },
  });

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    mutation.mutate();
  };

  const update = <K extends keyof ChapterFormData>(
    key: K,
    value: ChapterFormData[K],
  ): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "تعديل الفصل" : "إنشاء فصل جديد"}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent className="flex flex-col gap-4">
          <Input
            label="عنوان الفصل"
            placeholder="مثال: Chapter 1 - The Beginning"
            value={formData.title}
            onChange={(e): void => { update("title", e.target.value); }}
          />
          <Textarea
            label="المحتوى (JSON)"
            placeholder='{"text": "...", "type": "paragraph"}'
            value={formData.content}
            onChange={(e): void => { update("content", e.target.value); }}
          />
          <Input
            label="رابط الصورة"
            placeholder="https://example.com/image.jpg"
            value={formData.imageUrl}
            onChange={(e): void => { update("imageUrl", e.target.value); }}
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
                : "فشل حفظ الفصل"}
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

export type { ChapterFormDialogProps, ChapterEditData };

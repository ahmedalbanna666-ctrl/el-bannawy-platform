"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ContentBlock } from "@/components/units/content-block";
import { UploadCard } from "@/components/units/upload-card";
import {
  MonitorPlay,
  Languages,
  FileText,
  GraduationCap,
  ClipboardList,
  Plus,
  Trash2,
  Film,
  Pencil,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function uploadFile(endpoint: string, file: File): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    throw new Error("فشل رفع الملف");
  }
}

// ── Types ────────────────────────────────────────────────────────────

interface LessonVideo {
  readonly id: string;
  readonly title: string;
  readonly youtubeUrl: string;
  readonly youtubeId: string;
  readonly duration: number;
  readonly displayOrder: number;
}

interface LessonVocabulary {
  readonly id: string;
  readonly word: string;
  readonly translation: string;
  readonly definition: string | null;
  readonly example: string | null;
  readonly displayOrder: number;
}

interface LessonDocument {
  readonly id: string;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly fileSize: number;
}

interface QuizData {
  readonly id: string;
  readonly title: string;
  readonly _count?: { readonly questions: number };
}

interface HomeworkData {
  readonly id: string;
  readonly title: string;
}

// ── Content Block Registry (Future Ready) ────────────────────────────

export interface ContentBlockDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
}

export const CONTENT_BLOCKS: readonly ContentBlockDefinition[] = [
  {
    id: "video",
    title: "فيديو الدرس",
    description: "إدارة فيديوهات الدرس (YouTube)",
    icon: MonitorPlay,
  },
  {
    id: "vocabulary",
    title: "مفردات الدرس",
    description: "إضافة وتعديل وحذف المفردات",
    icon: Languages,
  },
  {
    id: "pdf",
    title: "ملف PDF",
    description: "رفع واستبدال وحذف ملف PDF",
    icon: FileText,
  },
  {
    id: "quiz",
    title: "اختبار الدرس",
    description: "رفع ملف Word لإنشاء الاختبار تلقائياً",
    icon: GraduationCap,
  },
  {
    id: "homework",
    title: "الواجب",
    description: "رفع ملف Word لإنشاء الواجب تلقائياً",
    icon: ClipboardList,
  },
] as const;

// ── Video Block ──────────────────────────────────────────────────────

function VideoBlock({
  lessonId,
  videos,
}: {
  lessonId: string;
  videos: readonly LessonVideo[];
}): ReactNode {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");

  const addMutation = useMutation({
    mutationFn: async () =>
      api.post(`/lessons/${lessonId}/videos`, {
        youtubeUrl: url.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) =>
      api.delete(`/lessons/${lessonId}/videos/${videoId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  return (
    <ContentBlock
      icon={MonitorPlay}
      title="فيديو الدرس"
      description="إدارة فيديوهات الدرس (YouTube)"
      statusBadge={
        videos.length > 0 ? (
          <Badge variant="primary" className="text-[10px]">
            {String(videos.length)} فيديو
          </Badge>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {videos.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">
            لا يوجد فيديو لهذا الدرس
          </p>
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50"
            >
              <Film className="h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {video.title}
                </p>
                <p className="truncate text-xs text-neutral-400">
                  {video.youtubeUrl}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="حذف الفيديو"
                className="text-danger-500 hover:bg-danger-500/10"
                loading={deleteMutation.isPending}
                onClick={(): void => { deleteMutation.mutate(video.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}

        <div className="flex items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e): void => { setUrl(e.target.value); }}
            className="flex-1"
          />
          <Button
            variant="primary"
            size="sm"
            loading={addMutation.isPending}
            disabled={!url.trim()}
            onClick={(): void => { addMutation.mutate(); }}
          >
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
        {addMutation.isError && (
          <p className="text-sm text-danger-500" role="alert">
            {addMutation.error instanceof Error
              ? addMutation.error.message
              : "فشل إضافة الفيديو"}
          </p>
        )}
      </div>
    </ContentBlock>
  );
}

// ── Vocabulary Block ─────────────────────────────────────────────────

function VocabularyBlock({
  lessonId,
  vocabulary,
}: {
  lessonId: string;
  vocabulary: readonly LessonVocabulary[];
}): ReactNode {
  const queryClient = useQueryClient();
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [editExample, setEditExample] = useState("");

  const addMutation = useMutation({
    mutationFn: async () =>
      api.post(`/lessons/${lessonId}/vocabulary`, {
        word: word.trim(),
        translation: translation.trim(),
        definition: definition.trim() || undefined,
        example: example.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setWord("");
      setTranslation("");
      setDefinition("");
      setExample("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/lessons/${lessonId}/vocabulary/${editingId ?? ""}`, {
        word: editWord.trim(),
        translation: editTranslation.trim(),
        definition: editDefinition.trim() || undefined,
        example: editExample.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (vocabId: string) =>
      api.delete(`/lessons/${lessonId}/vocabulary/${vocabId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const startEdit = (vocab: LessonVocabulary): void => {
    setEditingId(vocab.id);
    setEditWord(vocab.word);
    setEditTranslation(vocab.translation);
    setEditDefinition(vocab.definition ?? "");
    setEditExample(vocab.example ?? "");
  };

  const cancelEdit = (): void => {
    setEditingId(null);
  };

  return (
    <ContentBlock
      icon={Languages}
      title="مفردات الدرس"
      description="إضافة وتعديل وحذف المفردات"
      statusBadge={
        vocabulary.length > 0 ? (
          <Badge variant="primary" className="text-[10px]">
            {String(vocabulary.length)} كلمة
          </Badge>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-2">
        {vocabulary.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">
            لا توجد مفردات لهذا الدرس
          </p>
        ) : (
          vocabulary.map((vocab) => (
            <div
              key={vocab.id}
              className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50"
            >
              {editingId === vocab.id ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={editWord}
                      onChange={(e): void => { setEditWord(e.target.value); }}
                      className="flex-1"
                      placeholder="كلمة"
                    />
                    <Input
                      value={editTranslation}
                      onChange={(e): void => { setEditTranslation(e.target.value); }}
                      className="flex-1"
                      placeholder="ترجمة"
                    />
                  </div>
                  <Input
                    value={editDefinition}
                    onChange={(e): void => { setEditDefinition(e.target.value); }}
                    placeholder="تعريف (اختياري)"
                    className="text-xs"
                  />
                  <Input
                    value={editExample}
                    onChange={(e): void => { setEditExample(e.target.value); }}
                    placeholder="مثال (اختياري)"
                    className="text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="primary"
                      size="icon-sm"
                      aria-label="حفظ"
                      loading={updateMutation.isPending}
                      disabled={!editWord.trim() || !editTranslation.trim()}
                      onClick={(): void => { updateMutation.mutate(); }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="إلغاء"
                      onClick={cancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary-500">
                        {vocab.word}
                      </span>
                      <span className="text-sm text-neutral-500">—</span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {vocab.translation}
                      </span>
                    </div>
                    {vocab.definition && (
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {vocab.definition}
                      </p>
                    )}
                    {vocab.example && (
                      <p className="mt-0.5 text-xs italic text-neutral-400">
                        &quot;{vocab.example}&quot;
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="تعديل الكلمة"
                    className="text-neutral-400 hover:text-primary-500"
                    disabled={editingId !== null}
                    onClick={(): void => { startEdit(vocab); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="حذف الكلمة"
                    className="text-danger-500 hover:bg-danger-500/10"
                    loading={deleteMutation.isPending}
                    disabled={editingId !== null}
                    onClick={(): void => { deleteMutation.mutate(vocab.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}

        {editingId === null && (
          <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Input
                placeholder="كلمة"
                value={word}
                onChange={(e): void => { setWord(e.target.value); }}
                className="flex-1"
              />
              <Input
                placeholder="ترجمة"
                value={translation}
                onChange={(e): void => { setTranslation(e.target.value); }}
                className="flex-1"
              />
            </div>
            <Input
              placeholder="تعريف (اختياري)"
              value={definition}
              onChange={(e): void => { setDefinition(e.target.value); }}
              className="text-xs"
            />
            <Input
              placeholder="مثال (اختياري)"
              value={example}
              onChange={(e): void => { setExample(e.target.value); }}
              className="text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={addMutation.isPending}
                disabled={!word.trim() || !translation.trim()}
                onClick={(): void => { addMutation.mutate(); }}
              >
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </div>
        )}
        {addMutation.isError && (
          <p className="text-sm text-danger-500" role="alert">
            {addMutation.error instanceof Error
              ? addMutation.error.message
              : "فشل إضافة المفردة"}
          </p>
        )}
        {updateMutation.isError && (
          <p className="text-sm text-danger-500" role="alert">
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : "فشل تعديل المفردة"}
          </p>
        )}
        {deleteMutation.isError && (
          <p className="text-sm text-danger-500" role="alert">
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "فشل حذف المفردة"}
          </p>
        )}
      </div>
    </ContentBlock>
  );
}

// ── PDF Block ────────────────────────────────────────────────────────

function PdfBlock({
  lessonId,
  document,
}: {
  lessonId: string;
  document: LessonDocument | null;
}): ReactNode {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadFile(`/lessons/${lessonId}/upload/document`, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/lessons/${lessonId}/document`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <UploadCard
      title="ملف PDF"
      description="رفع واستبدال وحذف ملف PDF"
      icon={FileText}
      accept=".pdf"
      state={document ? "uploaded" : "empty"}
      fileInfo={
        document
          ? { name: document.fileName, size: formatFileSize(document.fileSize) }
          : null
      }
      onFileSelect={(file): void => { uploadMutation.mutate(file); }}
      onDelete={(): void => { deleteMutation.mutate(); }}
    />
  );
}

// ── Quiz Block ───────────────────────────────────────────────────────

function QuizBlock({
  lessonId,
  quiz,
}: {
  lessonId: string;
  quiz: QuizData | null;
}): ReactNode {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadFile(`/lessons/${lessonId}/quiz/upload`, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/lessons/${lessonId}/quiz`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
    },
  });

  return (
    <UploadCard
      title="اختبار الدرس"
      description="رفع ملف Word لإنشاء الاختبار تلقائياً"
      icon={GraduationCap}
      accept=".docx,.doc"
      state={quiz ? "uploaded" : "empty"}
      fileInfo={
        quiz
          ? {
              name: quiz.title,
              size: quiz._count
                ? `${String(quiz._count.questions)} سؤال`
                : "—",
            }
          : null
      }
      onFileSelect={(file): void => { uploadMutation.mutate(file); }}
      onDelete={(): void => { deleteMutation.mutate(); }}
    />
  );
}

// ── Homework Block ───────────────────────────────────────────────────

function HomeworkBlock({
  lessonId,
  homework,
}: {
  lessonId: string;
  homework: HomeworkData | null;
}): ReactNode {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadFile(`/lessons/${lessonId}/homework/upload`, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homework", lessonId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      api.delete(`/lessons/${lessonId}/homework`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homework", lessonId] });
    },
  });

  return (
    <UploadCard
      title="الواجب"
      description="رفع ملف Word لإنشاء الواجب تلقائياً"
      icon={ClipboardList}
      accept=".docx,.doc"
      state={homework ? "uploaded" : "empty"}
      fileInfo={
        homework ? { name: homework.title, size: "—" } : null
      }
      onFileSelect={(file): void => { uploadMutation.mutate(file); }}
      onDelete={(): void => { deleteMutation.mutate(); }}
    />
  );
}

// ── Lesson Content Blocks (Future Ready) ─────────────────────────────

interface LessonContentData {
  readonly lessonId: string;
  readonly videos: readonly LessonVideo[];
  readonly vocabulary: readonly LessonVocabulary[];
  readonly document: LessonDocument | null;
  readonly quiz: QuizData | null;
  readonly homework: HomeworkData | null;
}

export function LessonContentBlocks({
  lessonId,
  videos,
  vocabulary,
  document,
  quiz,
  homework,
}: LessonContentData): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <VideoBlock lessonId={lessonId} videos={videos} />
      <VocabularyBlock lessonId={lessonId} vocabulary={vocabulary} />
      <PdfBlock lessonId={lessonId} document={document} />
      <QuizBlock lessonId={lessonId} quiz={quiz} />
      <HomeworkBlock lessonId={lessonId} homework={homework} />
    </div>
  );
}

export type { LessonContentData, LessonVideo, LessonVocabulary, LessonDocument, QuizData, HomeworkData };

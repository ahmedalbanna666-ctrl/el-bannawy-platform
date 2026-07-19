"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentBlock } from "@/components/units/content-block";
import { UploadCard } from "@/components/units/upload-card";
import { VocabularyImportDialog } from "./vocabulary-import-dialog";
import { QuestionImportPreviewDialog } from "./question-import-preview-dialog";
import { VocabCell } from "@/components/vocabulary/vocabulary-cell";
import { VocabularyGroupHeader } from "@/components/vocabulary/vocabulary-group-header";
import { VocabularyStats } from "@/components/vocabulary/vocabulary-stats";
import { RelationVocabularyTable } from "@/components/vocabulary/relation-vocabulary-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { usePronunciation } from "@/lib/use-pronunciation";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
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
  Upload,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Clock,
  HelpCircle,
  Eye,
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
  readonly providerName: string;
  readonly providerVideoId: string;
  readonly providerUrl: string;
  readonly duration: number;
  readonly displayOrder: number;
}

interface LessonVocabularyItem {
  readonly id: string;
  readonly word: string;
  readonly translation: string;
  readonly definition: string | null;
  readonly example: string | null;
  readonly partOfSpeech: string | null;
  readonly synonym?: string | null;
  readonly synonymTranslation?: string | null;
  readonly antonym?: string | null;
  readonly antonymTranslation?: string | null;
  readonly displayOrder: number;
}

interface LessonVocabulary {
  readonly id: string | null;
  readonly kind?: string;
  readonly title: string | null;
  readonly displayOrder: number;
  readonly items: readonly LessonVocabularyItem[];
}

interface LessonDocument {
  readonly id: string;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly fileSize: number;
  readonly downloadable: boolean;
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
  {
    id: "questions",
    title: "أسئلة الدرس",
    description: "رفع ملف Word لاستيراد الأسئلة معاينةً قبل الحفظ",
    icon: FileQuestion,
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
                  {video.providerName} • {video.providerVideoId}
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

function StandardVocabularyTable({
  items,
  canManage,
  editingId,
  editWord,
  setEditWord,
  editTranslation,
  setEditTranslation,
  editDefinition,
  setEditDefinition,
  editExample,
  setEditExample,
  editPartOfSpeech,
  setEditPartOfSpeech,
  updateMutation,
  startEdit,
  cancelEdit,
  setDeleteTargetId,
  deleteMutation,
  deleteTargetId,
  editingIdLock,
  expandedId,
  toggleExpandRow,
  isSpeaking,
  speak,
  isSupported,
}: {
  items: readonly LessonVocabularyItem[];
  canManage: boolean;
  editingId: string | null;
  editWord: string;
  setEditWord: (v: string) => void;
  editTranslation: string;
  setEditTranslation: (v: string) => void;
  editDefinition: string;
  setEditDefinition: (v: string) => void;
  editExample: string;
  setEditExample: (v: string) => void;
  editPartOfSpeech: string;
  setEditPartOfSpeech: (v: string) => void;
  updateMutation: { isPending: boolean; mutate: () => void };
  startEdit: (item: LessonVocabularyItem) => void;
  cancelEdit: () => void;
  setDeleteTargetId: (id: string | null) => void;
  deleteMutation: { isPending: boolean };
  deleteTargetId: string | null;
  editingIdLock: string | null;
  expandedId: string | null;
  toggleExpandRow: (id: string) => void;
  isSpeaking: (id: string) => boolean;
  speak: (text: string, id: string) => void;
  isSupported: boolean;
}): ReactNode {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
      <Table dir="ltr">
        <TableHeader>
          <TableRow className="h-11 border-b border-neutral-200 bg-primary-50/60 dark:border-neutral-700 dark:bg-primary-500/5">
            <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              الكلمة (English)
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              المعنى (العربية)
            </TableHead>
            {canManage && (
              <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500 text-end">
                إجراءات
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((vocab) =>
            editingId === vocab.id ? (
              <TableRow key={vocab.id}>
                <TableCell colSpan={canManage ? 3 : 2} className="py-3">
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
                    <Input
                      value={editPartOfSpeech}
                      onChange={(e): void => { setEditPartOfSpeech(e.target.value); }}
                      placeholder="نوع الكلمة n, v, adj (اختياري)"
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
                      <Button variant="ghost" size="icon-sm" aria-label="إلغاء" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={vocab.id} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-primary-50/40 dark:border-neutral-800 dark:hover:bg-primary-500/5">
                <VocabCell
                  vocab={vocab}
                  isSpeaking={isSpeaking}
                  speak={speak}
                  isSupported={isSupported}
                  expanded={expandedId === vocab.id}
                  onToggleExpand={(): void => { toggleExpandRow(vocab.id); }}
                />
                <TableCell
                  className="text-sm text-neutral-900 dark:text-neutral-100"
                  dir="rtl"
                >
                  {vocab.translation}
                </TableCell>
                {canManage && (
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="تعديل الكلمة"
                        className="text-neutral-400 hover:text-primary-500"
                        disabled={editingIdLock !== null}
                        onClick={(): void => { startEdit(vocab); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف الكلمة"
                        className="text-danger-500 hover:bg-danger-500/10"
                        loading={deleteMutation.isPending && deleteTargetId === vocab.id}
                        disabled={editingIdLock !== null}
                        onClick={(): void => { setDeleteTargetId(vocab.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function VocabularyBlock({
  lessonId,
  vocabulary = [],
}: {
  lessonId: string;
  vocabulary?: readonly LessonVocabulary[];
}): ReactNode {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can("vocabulary.manage");
  const { speak, isSpeaking, isSupported } = usePronunciation();

  const [expanded, setExpanded] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [editExample, setEditExample] = useState("");
  const [editPartOfSpeech, setEditPartOfSpeech] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(true);

  const addMutation = useMutation({
    mutationFn: async () =>
      api.post(`/lessons/${lessonId}/vocabulary`, {
        word: word.trim(),
        translation: translation.trim(),
        definition: definition.trim() || undefined,
        example: example.trim() || undefined,
        partOfSpeech: partOfSpeech.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setWord("");
      setTranslation("");
      setDefinition("");
      setExample("");
      setPartOfSpeech("");
    },
    onError: (err) => {
      console.error("Vocabulary add error:", err);
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("el-bannawy-auth");
        const parsed = token ? (JSON.parse(token) as { accessToken?: string } | null) : null;
        const preview = parsed?.accessToken ? parsed.accessToken.substring(0, 20) : "null";
        console.warn("Auth store:", preview + "...");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/lessons/${lessonId}/vocabulary/${editingId ?? ""}`, {
        word: editWord.trim(),
        translation: editTranslation.trim(),
        definition: editDefinition.trim() || undefined,
        example: editExample.trim() || undefined,
        partOfSpeech: editPartOfSpeech.trim() || undefined,
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

  const deleteAllMutation = useMutation({
    mutationFn: async () => api.delete(`/lessons/${lessonId}/vocabulary`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const startEdit = (vocab: LessonVocabularyItem): void => {
    setEditingId(vocab.id);
    setEditWord(vocab.word);
    setEditTranslation(vocab.translation);
    setEditDefinition(vocab.definition ?? "");
    setEditExample(vocab.example ?? "");
    setEditPartOfSpeech(vocab.partOfSpeech ?? "");
  };

  const cancelEdit = (): void => {
    setEditingId(null);
  };

  const toggleExpandRow = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const confirmSingleDelete = (): void => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  const allVocab = vocabulary.flatMap((g) => g.items);
  const relationGroups = vocabulary.filter(
    (g) => g.kind === "SYNONYM_ANTONYM" || g.items.some((i) => i.synonym ?? i.antonym),
  );
  const relationCount = relationGroups.reduce((acc, g) => acc + g.items.length, 0);
  const isVocabularyPopulated =
    vocabulary.length > 0 || allVocab.length > 0 || relationGroups.length > 0;
  const deleteTargetWord = allVocab.find((v) => v.id === deleteTargetId)?.word ?? "";

  return (
    <ContentBlock
      icon={Languages}
      title="مفردات الدرس"
      description="إضافة وتعديل وحذف المفردات"
      statusBadge={
        isVocabularyPopulated ? (
          <Badge variant="primary" className="text-[10px]">
            {String(allVocab.length)} كلمة
          </Badge>
        ) : undefined
      }
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                aria-label="استيراد مفردات من ملف"
                onClick={(): void => { setShowImportDialog(true); }}
              >
                <Upload className="h-4 w-4" />
                استيراد
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="إضافة كلمة جديدة"
                onClick={(): void => { setShowAddForm((prev) => !prev); }}
              >
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
              {allVocab.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-danger-500 hover:bg-danger-500/10"
                  aria-label="حذف كل المفردات"
                  onClick={(): void => { setShowDeleteAllConfirm(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف الكل
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={expanded ? "طي قسم المفردات" : "توسيع قسم المفردات"}
            aria-expanded={expanded}
            onClick={(): void => { setExpanded((prev) => !prev); }}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      }
    >
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4">
            {showImportDialog && (
              <VocabularyImportDialog
                lessonId={lessonId}
                existingVocab={allVocab}
                onClose={(): void => { setShowImportDialog(false); }}
              />
            )}

            {allVocab.length === 0 ? (
              <EmptyState
                title="لا توجد مفردات مستوردة بعد"
                description="استورد ملف Word أو أضف الكلمات يدوياً لبناء قائمة المفردات."
                icon={<FileQuestion className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />}
                actionLabel="استيراد مفردات"
                onAction={(): void => { setShowImportDialog(true); }}
              />
            ) : (
              <>
                <VocabularyStats
                  words={allVocab.length}
                  groups={vocabulary.length}
                  relations={relationCount}
                />
                <div className="flex flex-col gap-4">
                  {vocabulary.map((group) => (
                    <div
                      key={group.id ?? "__ungrouped__"}
                      className="flex animate-[vocab-fade-slide-up_220ms_ease-out] flex-col gap-2"
                    >
                      {group.title !== null && (
                        <VocabularyGroupHeader
                          title={group.title}
                          count={group.items.length}
                          kind={group.kind}
                        />
                      )}
                      {group.kind === "SYNONYM_ANTONYM" || group.items.some((i) => i.synonym ?? i.antonym) ? (
                        <RelationVocabularyTable
                          items={group.items}
                          canManage={canManage}
                        />
                      ) : (
                        <StandardVocabularyTable
                          items={group.items}
                          canManage={canManage}
                          editingId={editingId}
                          editWord={editWord}
                          setEditWord={setEditWord}
                          editTranslation={editTranslation}
                          setEditTranslation={setEditTranslation}
                          editDefinition={editDefinition}
                          setEditDefinition={setEditDefinition}
                          editExample={editExample}
                          setEditExample={setEditExample}
                          editPartOfSpeech={editPartOfSpeech}
                          setEditPartOfSpeech={setEditPartOfSpeech}
                          updateMutation={updateMutation}
                          startEdit={startEdit}
                          cancelEdit={cancelEdit}
                          setDeleteTargetId={setDeleteTargetId}
                          deleteMutation={deleteMutation}
                          deleteTargetId={deleteTargetId}
                          editingIdLock={editingId}
                          expandedId={expandedId}
                          toggleExpandRow={toggleExpandRow}
                          isSpeaking={isSpeaking}
                          speak={speak}
                          isSupported={isSupported}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {editingId === null && canManage && showAddForm && (
              <div className="flex animate-[vocab-fade-slide-up_200ms_ease-out] flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
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
                <Input
                  placeholder="نوع الكلمة n, v, adj (اختياري)"
                  value={partOfSpeech}
                  onChange={(e): void => { setPartOfSpeech(e.target.value); }}
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
          {deleteAllMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {deleteAllMutation.error instanceof Error
                ? deleteAllMutation.error.message
                : "فشل حذف كل المفردات"}
            </p>
          )}
          </div>
        </div>
      </div>

      <Dialog
        open={deleteTargetId !== null}
        onClose={(): void => { setDeleteTargetId(null); }}
        title="حذف الكلمة"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            هل أنت متأكد من حذف كلمة &quot;{deleteTargetWord}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={(): void => { setDeleteTargetId(null); }}>
            إلغاء
          </Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={confirmSingleDelete}>
            حذف
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showDeleteAllConfirm}
        onClose={(): void => { setShowDeleteAllConfirm(false); }}
        title="حذف كل المفردات"
      >
        <DialogContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            سيتم حذف جميع المفردات ({String(allVocab.length)}) لهذا الدرس. لا يمكن التراجع عن هذا الإجراء.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={(): void => { setShowDeleteAllConfirm(false); }}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            loading={deleteAllMutation.isPending}
            onClick={(): void => { setShowDeleteAllConfirm(false); deleteAllMutation.mutate(); }}
          >
            حذف الكل
          </Button>
        </DialogFooter>
      </Dialog>
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

  const toggleDownloadableMutation = useMutation({
    mutationFn: async (value: boolean) =>
      api.patch(`/lessons/${lessonId}/document/downloadable`, { downloadable: value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const { isTeacher, isAdmin } = usePermissions();
  const isStaff = isTeacher || isAdmin;

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
      footer={
        document ? (
          <div className="flex items-center justify-between gap-3">
            <a
              href={`${API_BASE_URL}/lessons/${lessonId}/document`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-500 hover:underline"
            >
              <Eye className="h-4 w-4" />
              معاينة الملف
            </a>
            {isStaff && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <Switch
                  checked={document.downloadable}
                  onChange={(e): void => { toggleDownloadableMutation.mutate(e.target.checked); }}
                  aria-label="السماح للطالب بتحميل الملف"
                />
                السماح للطالب بالتحميل
              </label>
            )}
          </div>
        ) : undefined
      }
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

// ── Video Question Block (Teacher) ───────────────────────────────────

interface VideoQuestionItem {
  readonly id: string;
  readonly eventId: string;
  readonly videoId: string;
  readonly timestamp: number;
  readonly title: string;
  readonly type: string;
  readonly options: { readonly id: string; readonly text: string; readonly isCorrect: boolean }[];
}

function parseTimestamp(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  return null;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function VideoQuestionBlock({
  lessonId,
  videos,
}: {
  lessonId: string;
  videos: readonly LessonVideo[];
}): ReactNode {
  const queryClient = useQueryClient();

  const [selectedVideoId, setSelectedVideoId] = useState<string>(videos[0]?.id ?? "");
  const [timestampStr, setTimestampStr] = useState("00:30");
  const [questionTitle, setQuestionTitle] = useState("");
  const [optionsText, setOptionsText] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: allQuestions } = useQuery({
    queryKey: ["video-questions", lessonId],
    queryFn: async (): Promise<VideoQuestionItem[]> => {
      const results: VideoQuestionItem[] = [];
      for (const video of videos) {
        const res = await api.get<{
          id: string;
          videoId: string;
          timestamp: number;
          type: string;
          title: string;
        }[]>(`/video-events?videoId=${encodeURIComponent(video.id)}`);
        const events = res.data ?? [];
        for (const evt of events) {
          if (evt.type === "QUESTION") {
            try {
              const qRes = await api.get<{
                id: string;
                title: string;
                type: string;
                options: { id: string; text: string; isCorrect: boolean }[];
              }>(`/video-questions/by-video-event/${evt.id}`);
              if (!qRes.data) continue;
              const question = qRes.data;
              results.push({
                id: question.id,
                eventId: evt.id,
                videoId: evt.videoId,
                timestamp: evt.timestamp,
                title: question.title,
                type: question.type,
                options: question.options,
              });
            } catch {
              continue;
            }
          }
        }
      }
      return results.sort((a, b) => a.timestamp - b.timestamp);
    },
    enabled: videos.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const timestamp = parseTimestamp(timestampStr);
      if (timestamp === null) throw new Error("Invalid timestamp");
      return api.post("/video-questions/with-event", {
        videoId: selectedVideoId,
        timestamp,
        title: questionTitle,
        description: "",
        required: true,
        type: "MULTIPLE_CHOICE",
        options: optionsText.map((text, idx) => ({
          text,
          isCorrect: idx === correctIndex,
          displayOrder: idx,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["video-questions", lessonId] });
      setQuestionTitle("");
      setOptionsText(["", ""]);
      setCorrectIndex(0);
      setTimestampStr("00:30");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (questionId: string) =>
      api.delete(`/video-questions/${questionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["video-questions", lessonId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("No editing id");
      const timestamp = parseTimestamp(timestampStr);
      if (timestamp === null) throw new Error("Invalid timestamp");
      return api.put(`/video-questions/${editingId}`, {
        title: questionTitle,
        type: "MULTIPLE_CHOICE",
        options: optionsText.map((text, idx) => ({
          text,
          isCorrect: idx === correctIndex,
          displayOrder: idx,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["video-questions", lessonId] });
      setEditingId(null);
      setQuestionTitle("");
      setOptionsText(["", ""]);
      setCorrectIndex(0);
      setTimestampStr("00:30");
    },
  });

  const startEdit = (q: VideoQuestionItem): void => {
    setEditingId(q.id);
    setQuestionTitle(q.title);
    const vid = videos.find((v) => v.id === q.videoId);
    setSelectedVideoId(vid ? vid.id : "");
    setTimestampStr(formatTimestamp(q.timestamp));
    setCorrectIndex(q.options.findIndex((o) => o.isCorrect));
    setOptionsText(q.options.map((o) => o.text));
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setQuestionTitle("");
    setOptionsText(["", ""]);
    setCorrectIndex(0);
    setTimestampStr("00:30");
  };

  const addOption = (): void => {
    setOptionsText((prev) => [...prev, ""]);
  };

  const removeOption = (idx: number): void => {
    if (optionsText.length <= 2) return;
    setOptionsText((prev) => prev.filter((_, i) => i !== idx));
    if (correctIndex >= idx) {
      setCorrectIndex((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <ContentBlock
      icon={HelpCircle}
      title="أسئلة الفيديو التفاعلية"
      description="إضافة أسئلة تظهر أثناء تشغيل الفيديو"
      statusBadge={
        allQuestions && allQuestions.length > 0 ? (
          <Badge variant="primary" className="text-[10px]">
            {String(allQuestions.length)} سؤال
          </Badge>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {allQuestions && allQuestions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {allQuestions.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50"
              >
                <Clock className="h-4 w-4 shrink-0 text-primary-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {q.title}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatTimestamp(q.timestamp)} • {String(q.options.length)} خيارات
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="تعديل السؤال"
                    className="text-neutral-400 hover:text-primary-500"
                    onClick={(): void => { startEdit(q); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="حذف السؤال"
                    className="text-danger-500 hover:bg-danger-500/10"
                    loading={deleteMutation.isPending}
                    onClick={(): void => { deleteMutation.mutate(q.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-neutral-400">
            لا توجد أسئلة تفاعلية بعد
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
          {videos.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                الفيديو
              </label>
              <select
                value={selectedVideoId}
                onChange={(e): void => { setSelectedVideoId(e.target.value); }}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              التوقيت (MM:SS أو ثوانٍ)
            </label>
            <Input
              placeholder="00:30"
              value={timestampStr}
              onChange={(e): void => { setTimestampStr(e.target.value); }}
              className="w-32"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              نص السؤال
            </label>
            <Input
              placeholder="أدخل نص السؤال"
              value={questionTitle}
              onChange={(e): void => { setQuestionTitle(e.target.value); }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-500">
              الخيارات (اختر الإجابة الصحيحة)
            </label>
            {optionsText.map((text, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-option"
                  checked={correctIndex === idx}
                  onChange={(): void => { setCorrectIndex(idx); }}
                  className="h-4 w-4 shrink-0 accent-primary-500"
                />
                <Input
                  placeholder={`خيار ${String(idx + 1)}`}
                  value={text}
                  onChange={(e): void => {
                    setOptionsText((prev) =>
                      prev.map((t, i) => (i === idx ? e.target.value : t)),
                    );
                  }}
                  className="flex-1"
                />
                {optionsText.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="حذف الخيار"
                    className="text-danger-500 hover:bg-danger-500/10"
                    onClick={(): void => { removeOption(idx); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption} className="self-start">
              <Plus className="h-4 w-4" />
              إضافة خيار
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {editingId ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  loading={updateMutation.isPending}
                  disabled={!questionTitle.trim() || optionsText.some((t) => !t.trim()) || parseTimestamp(timestampStr) === null}
                  onClick={(): void => { updateMutation.mutate(); }}
                >
                  <Check className="h-4 w-4" />
                  حفظ التعديل
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  إلغاء
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                loading={createMutation.isPending}
                disabled={!questionTitle.trim() || optionsText.some((t) => !t.trim()) || parseTimestamp(timestampStr) === null}
                onClick={(): void => { createMutation.mutate(); }}
              >
                <Plus className="h-4 w-4" />
                إضافة سؤال
                {!editingId && allQuestions && allQuestions.length > 0 ? " آخر" : ""}
              </Button>
            )}
          </div>

          {createMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "فشل إضافة السؤال"}
            </p>
          )}
          {updateMutation.isError && (
            <p className="text-sm text-danger-500" role="alert">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : "فشل تعديل السؤال"}
            </p>
          )}
        </div>
      </div>
    </ContentBlock>
  );
}

// ── Question Block ────────────────────────────────────────────────────

function QuestionBlock({
  lessonId,
}: {
  lessonId: string;
}): ReactNode {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <UploadCard
        title="أسئلة الدرس"
        description="رفع ملف Word لعرض الأسئلة المستخرجة وتعديلها قبل الحفظ"
        icon={FileQuestion}
        accept=".docx,.doc"
        state="empty"
        onFileSelect={(): void => { setDialogOpen(true); }}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onDelete={(): void => {}}
      />
      {dialogOpen && (
        <QuestionImportPreviewDialog
          lessonId={lessonId}
          onClose={(): void => { setDialogOpen(false); }}
        />
      )}
    </>
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
      <VideoQuestionBlock lessonId={lessonId} videos={videos} />
      <VocabularyBlock lessonId={lessonId} vocabulary={vocabulary} />
      <PdfBlock lessonId={lessonId} document={document} />
      <QuizBlock lessonId={lessonId} quiz={quiz} />
      <HomeworkBlock lessonId={lessonId} homework={homework} />
      <QuestionBlock lessonId={lessonId} />
    </div>
  );
}

export type { LessonContentData, LessonVideo, LessonVocabulary, LessonDocument, QuizData, HomeworkData };

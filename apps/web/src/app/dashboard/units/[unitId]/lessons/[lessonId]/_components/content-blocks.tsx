"use client";

import { useState, useRef, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentBlock } from "@/components/units/content-block";
import { UploadCard } from "@/components/units/upload-card";
import { VocabularyImportDialog } from "./vocabulary-import-dialog";
import { Switch } from "@/components/ui/switch";
import { AssessmentQuestionManager } from "./assessment-question-manager";
import { VocabCell } from "@/components/vocabulary/vocabulary-cell";
import { VocabularyGroupHeader } from "@/components/vocabulary/vocabulary-group-header";
import { VocabularyStats } from "@/components/vocabulary/vocabulary-stats";
import { RelationVocabularyTable } from "@/components/vocabulary/relation-vocabulary-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { usePronunciation } from "@/lib/use-pronunciation";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";
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
  Sparkles,
  Clock,
  HelpCircle,
  Eye,
  Loader2,
  type LucideIcon,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function uploadFile(endpoint: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    credentials: "include",
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
  readonly maxAttempts: number;
  readonly questionCount: number | null;
  readonly durationMinutes: number | null;
  readonly _count?: { readonly questions: number };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface QuizTeacherData {
  readonly id: string;
  readonly title: string;
  readonly questions: readonly {
    readonly id: string;
    readonly type: string;
    readonly question: string;
    readonly options: string | null;
    readonly correctAnswer: string | null;
    readonly explanation: string | null;
    readonly displayOrder: number;
  }[];
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
    id: "games",
    title: "أنشطة تعليمية",
    description: "تفعيل الألعاب التعليمية للدرس (تستخدم كلمات الدرس تلقائياً)",
    icon: Sparkles,
  },
] as const;

// ── Video Block ──────────────────────────────────────────────────────

function VideoBlock({
  lessonId,
  videos,
  expanded,
  onToggle,
}: {
  lessonId: string;
  videos: readonly LessonVideo[];
  expanded?: boolean;
  onToggle?: () => void;
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
      expanded={expanded}
      onToggle={onToggle}
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

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 sm:flex-row sm:items-center sm:gap-2 dark:border-neutral-700">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e): void => { setUrl(e.target.value); }}
            className="w-full sm:flex-1"
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
  expanded,
  onToggle,
}: {
  lessonId: string;
  vocabulary?: readonly LessonVocabulary[];
  expanded?: boolean;
  onToggle?: () => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can("vocabulary.manage");
  const { speak, isSpeaking, isSupported } = usePronunciation();

  const [vocabExpanded, setVocabExpanded] = useState(true);
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
      expanded={expanded}
      onToggle={onToggle}
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
            aria-label={vocabExpanded ? "طي قسم المفردات" : "توسيع قسم المفردات"}
            aria-expanded={vocabExpanded}
            onClick={(): void => { setVocabExpanded((prev) => !prev); }}
          >
            {vocabExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      }
    >
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          vocabExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
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
                icon={<Languages className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                  <Input
                    placeholder="كلمة"
                    value={word}
                    onChange={(e): void => { setWord(e.target.value); }}
                    className="w-full sm:flex-1"
                  />
                  <Input
                    placeholder="ترجمة"
                    value={translation}
                    onChange={(e): void => { setTranslation(e.target.value); }}
                    className="w-full sm:flex-1"
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
  expanded,
  onToggle,
}: {
  lessonId: string;
  document: LessonDocument | null;
  expanded?: boolean;
  onToggle?: () => void;
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
      expanded={expanded}
      onToggle={onToggle}
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
  expanded,
  onToggle,
}: {
  lessonId: string;
  quiz: QuizData | null;
  expanded?: boolean;
  onToggle?: () => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Initialize settings inputs whenever the quiz data is (re)loaded.
  const quizId = quiz?.id;
  const initialMaxAttempts = quiz?.maxAttempts ?? null;
  const initialCount = quiz?.questionCount ?? null;
  const initialDuration = quiz?.durationMinutes ?? null;
  const settingsInitRef = useRef(false);
  if (quizId && !settingsInitRef.current) {
    setMaxAttempts(initialMaxAttempts !== null ? String(initialMaxAttempts) : "");
    setQuestionCount(initialCount !== null ? String(initialCount) : "");
    setDurationMinutes(initialDuration !== null ? String(initialDuration) : "");
    settingsInitRef.current = true;
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadFile(`/lessons/${lessonId}/quiz/upload`, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["/quizzes", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setUploadError(null);
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : "فشل رفع الملف");
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async () => {
      if (!quizId) return;
      const payload: Record<string, number> = {};
      const ma = Number(maxAttempts);
      if (maxAttempts.trim() !== "" && Number.isFinite(ma) && ma >= 1) {
        payload.maxAttempts = ma;
      }
      const qc = Number(questionCount);
      if (questionCount.trim() !== "" && Number.isFinite(qc) && qc > 0) {
        payload.questionCount = qc;
      }
      const dm = Number(durationMinutes);
      if (durationMinutes.trim() !== "" && Number.isFinite(dm) && dm > 0) {
        payload.durationMinutes = dm;
      }
      await api.patch(`/quizzes/${quizId}`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["/quizzes", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setSettingsError(null);
    },
    onError: (err) => {
      setSettingsError(err instanceof Error ? err.message : "فشل حفظ إعدادات الاختبار");
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      setUploadError(null);
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <ContentBlock
        title="اختبار الدرس"
        description="رفع ملف Word لإنشاء الاختبار تلقائياً"
        icon={GraduationCap}
        expanded={expanded}
        onToggle={onToggle}
        statusBadge={quiz ? <Badge variant="primary" className="text-[10px]">{quiz.title}</Badge> : undefined}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={(): void => { fileInputRef.current?.click(); }}>
              <Upload className="h-4 w-4" />
              {quiz ? "استبدال" : "رفع وورد"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {uploadError && (
            <p className="text-sm text-danger-500" role="alert">{uploadError}</p>
          )}

          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span>جاري الرفع...</span>
            </div>
          )}

          {quiz && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-700 dark:bg-neutral-900/40 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  عدد مرات إعادة الاختبار
                </span>
                <Input
                  type="number"
                  min={1}
                  placeholder={initialMaxAttempts !== null ? String(initialMaxAttempts) : "3"}
                  value={maxAttempts}
                  onChange={(e): void => { setMaxAttempts(e.target.value); }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  عدد الأسئلة في كل محاولة (فارغ = كل الأسئلة)
                </span>
                <Input
                  type="number"
                  min={1}
                  placeholder={initialCount !== null ? String(initialCount) : "كل الأسئلة"}
                  value={questionCount}
                  onChange={(e): void => { setQuestionCount(e.target.value); }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  مدة الاختبار بالدقائق (فارغ = بدون مؤقت)
                </span>
                <Input
                  type="number"
                  min={1}
                  placeholder={initialDuration !== null ? String(initialDuration) : "بدون مؤقت"}
                  value={durationMinutes}
                  onChange={(e): void => { setDurationMinutes(e.target.value); }}
                />
              </label>
              {settingsError && (
                <p className="text-sm text-danger-500 sm:col-span-2" role="alert">{settingsError}</p>
              )}
              {settingsMutation.isSuccess && (
                <p className="text-sm text-success-600 sm:col-span-2">تم حفظ إعدادات الاختبار</p>
              )}
              <div className="flex justify-end sm:col-span-2">
                <Button
                  variant="outline"
                  size="sm"
                  loading={settingsMutation.isPending}
                  disabled={settingsMutation.isPending}
                  onClick={(): void => { settingsMutation.mutate(); }}
                >
                  حفظ إعدادات الاختبار
                </Button>
              </div>
            </div>
          )}

          {quiz && (
            <AssessmentQuestionManager
              lessonId={lessonId}
              assessmentId={quiz.id}
              fetchEndpoint="/quizzes"
              updateEndpoint="/quizzes/:id"
              queryKey={["quiz", lessonId] as readonly string[]}
              title="أسئلة الاختبار"
              embedded
              uploadEndpoint="/lessons/:id/quiz/upload"
            />
          )}
        </div>
      </ContentBlock>
    </>
  );
}

// ── Homework Block ───────────────────────────────────────────────────

function HomeworkBlock({
  lessonId,
  homework,
  expanded,
  onToggle,
}: {
  lessonId: string;
  homework: HomeworkData | null;
  expanded?: boolean;
  onToggle?: () => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadFile(`/lessons/${lessonId}/homework/upload`, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homework", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["/homework", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setUploadError(null);
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : "فشل رفع الملف");
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      setUploadError(null);
    }
    e.target.value = "";
  };

  const uploadState = uploadMutation.isPending ? "uploading" : homework ? "uploaded" : "empty";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <ContentBlock
        title="الواجب"
        description="رفع ملف Word لإنشاء الواجب تلقائياً"
        icon={ClipboardList}
        expanded={expanded}
        onToggle={onToggle}
        statusBadge={homework ? <Badge variant="primary" className="text-[10px]">{homework.title}</Badge> : undefined}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={(): void => { fileInputRef.current?.click(); }}>
              <Upload className="h-4 w-4" />
              {homework ? "استبدال" : "رفع وورد"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {uploadError && (
            <p className="text-sm text-danger-500" role="alert">{uploadError}</p>
          )}

          {uploadState === "uploading" && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span>جاري الرفع...</span>
            </div>
          )}

          {homework && (
            <AssessmentQuestionManager
              lessonId={lessonId}
              assessmentId={homework.id}
              fetchEndpoint="/homework"
              updateEndpoint="/homework/:id"
              uploadEndpoint="/lessons/:id/homework/upload"
              queryKey={["homework", lessonId] as readonly string[]}
              title="أسئلة الواجب"
              embedded
            />
          )}
        </div>
      </ContentBlock>
    </>
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
  let seconds: number | null = null;
  if (/^\d+$/.test(trimmed)) {
    seconds = parseInt(trimmed, 10);
  } else {
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (!isNaN(m) && !isNaN(s)) seconds = m * 60 + s;
    }
  }
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0 || seconds > 86400) {
    return null;
  }
  return seconds;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function VideoQuestionBlock({
  lessonId,
  videos,
  expanded,
  onToggle,
}: {
  lessonId: string;
  videos: readonly LessonVideo[];
  expanded?: boolean;
  onToggle?: () => void;
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
              }>(`/video-questions/by-video-event/${evt.id}/manage`);
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

  const missingField: string | null = editingId
    ? null
    : !selectedVideoId
      ? "اختر الفيديو أولًا"
      : !questionTitle.trim()
        ? "أدخل نص السؤال"
        : optionsText.some((t) => !t.trim())
          ? "أكمل جميع الخيارات"
          : parseTimestamp(timestampStr) === null
            ? "أدخل توقيتًا صحيحًا (MM:SS أو ثوانٍ)"
            : null;

  return (
    <ContentBlock
      icon={HelpCircle}
      title="أسئلة الفيديو التفاعلية"
      description="إضافة أسئلة تظهر أثناء تشغيل الفيديو"
      expanded={expanded}
      onToggle={onToggle}
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

          <div className="flex flex-wrap items-center gap-2">
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
              <>
                <Button
                  variant="primary"
                  size="sm"
                  loading={createMutation.isPending}
                  disabled={!questionTitle.trim() || optionsText.some((t) => !t.trim()) || parseTimestamp(timestampStr) === null || !selectedVideoId}
                  onClick={(): void => { createMutation.mutate(); }}
                >
                  <Plus className="h-4 w-4" />
                  إضافة سؤال
                  {!editingId && allQuestions && allQuestions.length > 0 ? " آخر" : ""}
                </Button>
                {missingField && (
                  <p className="w-full text-xs text-neutral-400">
                    لتفعيل الزر: {missingField}
                  </p>
                )}
              </>
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

// ── Games Block ───────────────────────────────────────────────────────

const GAME_TYPES: { id: string; label: string; description: string }[] = [
  { id: "listening-challenge", label: "تحدي الاستماع", description: "استمع للكلمة واختر الترجمة الصحيحة" },
  { id: "pronunciation-challenge", label: "تحدي النطق", description: "تدرب على نطق الكلمات باستخدام الميكروفون" },
  { id: "matching", label: "المطابقة", description: "قم بمطابقة الكلمة مع ترجمتها" },
  { id: "memory", label: "اختبار الذاكرة", description: "بطاقات الذاكرة: ابحث عن أزواج الكلمة والترجمة" },
];

function GamesBlock({
  lessonId,
  expanded,
  onToggle,
}: {
  lessonId: string;
  expanded?: boolean;
  onToggle?: () => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const DEFAULT_WORDS = 10;

  const { data: games } = useQuery({
    queryKey: ["lesson-games", lessonId],
    queryFn: async () => {
      const res = await api.get<Record<string, { enabled: boolean; wordsPerGame?: number }>>(`/lessons/${lessonId}/games`);
      return res.data ?? {};
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (newGames: Record<string, { enabled: boolean; wordsPerGame?: number }>) => {
      await api.patch(`/lessons/${lessonId}/games`, newGames);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson-games", lessonId] });
    },
  });

  const toggleGame = (gameId: string): void => {
    const current = { ...games };
    if (!(gameId in current)) {
      current[gameId] = { enabled: false, wordsPerGame: DEFAULT_WORDS };
    }
    const prev = current[gameId];
    const wasEnabled = prev.enabled;
    current[gameId] = { enabled: !wasEnabled, wordsPerGame: prev.wordsPerGame ?? DEFAULT_WORDS };
    mutation.mutate(current);
  };

  const setWordsPerGame = (gameId: string, words: number): void => {
    const current = { ...games };
    const capped = Math.max(5, Math.min(50, words));
    if (!(gameId in current)) {
      current[gameId] = { enabled: false, wordsPerGame: DEFAULT_WORDS };
    }
    const prev = current[gameId];
    current[gameId] = { enabled: prev.enabled, wordsPerGame: capped };
    mutation.mutate(current);
  };

  return (
    <ContentBlock
      title="أنشطة تعليمية"
      description="اختر أنواع الألعاب التي تظهر للطالب في هذا الدرس"
      icon={Sparkles}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-neutral-500">
          الألعاب التالية تستخدم كلمات الدرس الحالي تلقائياً. فعّل ما يناسب طلابك.
        </p>
        <div className="flex flex-col gap-2">
          {GAME_TYPES.map((game) => {
            const enabled = games?.[game.id]?.enabled ?? false;
            const wordsCount = games?.[game.id]?.wordsPerGame ?? DEFAULT_WORDS;
            return (
              <div
                key={game.id}
                className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
                  enabled
                    ? "border-primary-500/30 bg-primary-500/5"
                    : "border-neutral-700/50 bg-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-neutral-200">{game.label}</span>
                    <span className="text-[11px] text-neutral-500">{game.description}</span>
                  </div>
                  <Switch
                    checked={enabled}
                    onChange={(): void => { toggleGame(game.id); }}
                    disabled={mutation.isPending}
                  />
                </div>
                {enabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">عدد الكلمات:</span>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={wordsCount}
                      onChange={(e): void => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setWordsPerGame(game.id, val);
                      }}
                      className="w-20 rounded-lg border border-neutral-600 bg-transparent px-2 py-1 text-xs text-neutral-200 focus:border-primary-500 focus:outline-none"
                      disabled={mutation.isPending}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ContentBlock>
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
  const [expandedBlock, setExpandedBlock] = useState<string | null>("video");

  const toggleBlock = (id: string): void => {
    setExpandedBlock((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-4">
      <VideoBlock
        lessonId={lessonId}
        videos={videos}
        expanded={expandedBlock === "video"}
        onToggle={(): void => { toggleBlock("video"); }}
      />
      <VideoQuestionBlock
        lessonId={lessonId}
        videos={videos}
        expanded={expandedBlock === "video-questions"}
        onToggle={(): void => { toggleBlock("video-questions"); }}
      />
      <VocabularyBlock
        lessonId={lessonId}
        vocabulary={vocabulary}
        expanded={expandedBlock === "vocabulary"}
        onToggle={(): void => { toggleBlock("vocabulary"); }}
      />
      <PdfBlock
        lessonId={lessonId}
        document={document}
        expanded={expandedBlock === "pdf"}
        onToggle={(): void => { toggleBlock("pdf"); }}
      />
      <HomeworkBlock
        lessonId={lessonId}
        homework={homework}
        expanded={expandedBlock === "homework"}
        onToggle={(): void => { toggleBlock("homework"); }}
      />
      <GamesBlock
        lessonId={lessonId}
        expanded={expandedBlock === "games"}
        onToggle={(): void => { toggleBlock("games"); }}
      />
      <QuizBlock
        lessonId={lessonId}
        quiz={quiz}
        expanded={expandedBlock === "quiz"}
        onToggle={(): void => { toggleBlock("quiz"); }}
      />
    </div>
  );
}

export type { LessonContentData, LessonVideo, LessonVocabulary, LessonDocument, QuizData, HomeworkData };

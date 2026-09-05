"use client";

import { useState, useRef, useEffect, type ReactNode, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { parseUploadError } from "@/lib/upload-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { QuestionEditorDialog, type QuestionFormData } from "./question-editor-dialog";
import {
  FileQuestion, Plus, Pencil, Trash2, Save, ArrowUp, ArrowDown, CheckCircle2, Loader2, AlertTriangle, FileText,
} from "lucide-react";

const TYPE_META: Record<string, { label: string; color: string }> = {
  MULTIPLE_CHOICE: { label: "اختيار من متعدد", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  TRUE_FALSE: { label: "صح/خطأ", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  FILL_IN_BLANKS: { label: "املأ الفراغ", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  SHORT_ANSWER: { label: "إجابة قصيرة", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  ESSAY: { label: "مقالي", color: "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300" },
  MATCHING: { label: "توصيل", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  ORDERING: { label: "ترتيب", color: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300" },
  DIALOGUE: { label: "حوار", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  DRAG_DROP: { label: "سحب وإفلات", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
};

interface QuestionItem {
  id?: string;
  type: string;
  question: string;
  options: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  correctionMode?: string;
  displayOrder: number;
}

interface Props {
  readonly lessonId: string;
  readonly assessmentId: string | undefined;
  readonly fetchEndpoint: string;
  readonly updateEndpoint: string;
  readonly queryKey: readonly string[];
  readonly title: string;
  readonly embedded?: boolean;
  readonly uploadEndpoint?: string;
}

async function uploadFile(endpoint: string, file: File): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${base}${endpoint}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) throw new Error(await parseUploadError(response));
}

export function AssessmentQuestionManager({
  lessonId, assessmentId, fetchEndpoint, updateEndpoint, queryKey, title, embedded = false, uploadEndpoint,
}: Props): ReactNode {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const syncAfterUploadRef = useRef(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!uploadEndpoint) throw new Error("Upload not available");
      await uploadFile(uploadEndpoint.replace(":id", lessonId), file);
    },
    onSuccess: () => {
      syncAfterUploadRef.current = true;
      void queryClient.invalidateQueries({ queryKey: [fetchEndpoint, lessonId] });
      void queryClient.invalidateQueries({ queryKey });
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

  const queryResult = useQuery({
    queryKey: [fetchEndpoint, lessonId],
    queryFn: async (): Promise<{ questions: QuestionItem[] }> => {
      const res = await api.get<{ questions: QuestionItem[] }>(`${fetchEndpoint}/${lessonId}/teacher`);
      return res.data ?? { questions: [] };
    },
    enabled: !!assessmentId,
  });

  const fetchedQuestions = queryResult.data?.questions;

  useEffect(() => {
    if (!fetchedQuestions) return;
    if (!initialLoaded || syncAfterUploadRef.current) {
      setQuestions(fetchedQuestions);
      setInitialLoaded(true);
      syncAfterUploadRef.current = false;
    }
  }, [fetchedQuestions, initialLoaded]);

  const saveMutation = useMutation({
    mutationFn: async (qs: QuestionItem[]) => {
      if (!assessmentId) return;
      await api.patch(updateEndpoint.replace(":id", assessmentId), {
        questions: qs.map((q) => ({
          type: q.type, question: q.question,
          ...(q.options !== null && { options: q.options }),
          ...(q.correctAnswer !== null && { correctAnswer: q.correctAnswer }),
          ...(q.explanation !== null && { explanation: q.explanation }),
          correctionMode: q.correctionMode,
          displayOrder: q.displayOrder,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  const openAdd = (): void => { setEditingIndex(null); setEditorOpen(true); };
  const openEdit = (idx: number): void => { setEditingIndex(idx); setEditorOpen(true); };

  const handleSaveQuestion = (formData: QuestionFormData): void => {
    const item: QuestionItem = {
      type: formData.type, question: formData.question,
      options: formData.options || null, correctAnswer: formData.correctAnswer || null,
      explanation: formData.explanation || null, correctionMode: formData.correctionMode,
      displayOrder: 0,
    };
    setQuestions((prev) => {
      if (editingIndex !== null) {
        return prev.map((q, i) => (i === editingIndex ? { ...item, id: q.id, displayOrder: q.displayOrder } : q));
      }
      item.displayOrder = prev.length;
      return [...prev, item];
    });
    setEditorOpen(false);
    setEditingIndex(null);
  };

  const deleteQuestion = (idx: number): void => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: "up" | "down"): void => {
    setQuestions((prev) => {
      const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= prev.length) return prev;
      const u = [...prev];
      u[idx] = prev[t];
      u[t] = prev[idx];
      return u.map((q, i) => ({ ...q, displayOrder: i }));
    });
  };

  const initialFormData = editingIndex !== null && questions[editingIndex]
    ? {
        type: questions[editingIndex].type,
        question: questions[editingIndex].question,
        options: questions[editingIndex].options ?? "",
        correctAnswer: questions[editingIndex].correctAnswer ?? "",
        explanation: questions[editingIndex].explanation ?? "",
        correctionMode: questions[editingIndex].correctionMode,
      }
    : null;

  const hasChanges = initialLoaded && JSON.stringify(questions) !== JSON.stringify(fetchedQuestions);

  const content = (
    <div className="flex flex-col gap-4">
      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* ── Header: Actions always on top ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!embedded && (
            <>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {title}
              </h4>
              {queryResult.isLoading && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
              {questions.length > 0 && (
                <span className="text-xs text-neutral-500">({questions.length} سؤال)</span>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {uploadEndpoint && (
            <Button variant="outline" size="sm"
              leftIcon={<FileText className="h-4 w-4" />}
              loading={uploadMutation.isPending}
              onClick={(): void => { fileInputRef.current?.click(); }}>
              رفع وورد
            </Button>
          )}
          {assessmentId && (
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
              إضافة سؤال
            </Button>
          )}
          {assessmentId && questions.length > 0 && (
            <Button variant="outline" size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={(): void => { setDeleteAllOpen(true); }}>
              حذف كل الأسئلة
            </Button>
          )}
          {hasChanges && (
            <Button variant="outline" size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              loading={saveMutation.isPending}
              onClick={(): void => { saveMutation.mutate(questions); }}>
              حفظ التغييرات
            </Button>
          )}
        </div>
      </div>

      {uploadError && (
        <p className="text-sm text-danger-500" role="alert">{uploadError}</p>
      )}

      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          <span>جاري رفع الملف...</span>
        </div>
      )}

      {/* ── Questions list ── */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <FileQuestion className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">لا توجد أسئلة</p>
            <p className="text-xs text-neutral-400 mt-1">ارفع ملف Word أو أضف سؤال يدوي</p>
          </div>
          {assessmentId && (
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
              إضافة أول سؤال
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q, idx) => {
            const meta = TYPE_META[q.type] ?? { label: q.type, color: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" };
            return (
              <div key={q.id ?? idx}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex flex-col gap-px">
                  <button type="button" disabled={idx === 0}
                    onClick={(): void => { moveQuestion(idx, "up"); }}
                    className="flex h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 disabled:opacity-20 dark:hover:bg-neutral-700">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button type="button" disabled={idx === questions.length - 1}
                    onClick={(): void => { moveQuestion(idx, "down"); }}
                    className="flex h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 disabled:opacity-20 dark:hover:bg-neutral-700">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  {idx + 1}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>
                  {meta.label}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200" dir="auto">
                  {q.question || "(بدون نص)"}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" aria-label="تعديل"
                    onClick={(): void => { openEdit(idx); }}
                    className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-neutral-700">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="حذف"
                    onClick={(): void => { deleteQuestion(idx); }}
                    className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-neutral-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Question Editor Dialog ── */}
      <QuestionEditorDialog
        key={editingIndex !== null ? `edit-${String(editingIndex)}` : "add"}
        open={editorOpen}
        onClose={(): void => { setEditorOpen(false); setEditingIndex(null); }}
        onSave={handleSaveQuestion}
        initial={initialFormData}
      />

      {/* ── Status Messages ── */}
      {saveMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> تم حفظ التغييرات بنجاح
        </div>
      )}
      {saveMutation.isError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          فشل حفظ التغييرات. حاول مرة أخرى.
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? content : (
        <Card variant="outline" padding="sm" className="mt-4">
          <CardContent>{content}</CardContent>
        </Card>
      )}

      {/* ── Delete All Confirmation Dialog ── */}
      <Dialog open={deleteAllOpen} onClose={(): void => { setDeleteAllOpen(false); }}>
        <DialogContent>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/10">
              <AlertTriangle className="h-7 w-7 text-danger-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">حذف كل الأسئلة</h3>
              <p className="mt-1 text-sm text-neutral-500">
                هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع الأسئلة ({questions.length} سؤال).
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={(): void => { setDeleteAllOpen(false); }}>إلغاء</Button>
          <Button variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            loading={saveMutation.isPending}
            onClick={(): void => {
              setQuestions([]);
              setDeleteAllOpen(false);
              saveMutation.mutate([]);
            }}>
            نعم، حذف الكل
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useRef, type ReactNode, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface PreviewItem {
  readonly clientDraftId: string;
  readonly kind: "STANDARD_ITEM" | "SYNONYM_ANTONYM_RELATION";
  readonly word: string;
  readonly translation: string;
  readonly partOfSpeech: string | null;
  readonly synonym: string | null;
  readonly synonymTranslation: string | null;
  readonly antonym: string | null;
  readonly antonymTranslation: string | null;
  readonly status: "VALID" | "WARNING" | "INVALID";
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly sectionClientDraftId: string | null;
}

interface PreviewGroupMeta {
  readonly clientDraftId: string;
  readonly title: string | null;
  readonly displayOrder: number;
}

interface PreviewResult {
  readonly parserProfile: string;
  readonly counts: { readonly total: number; readonly valid: number; readonly warning: number; readonly invalid: number };
  readonly sections: readonly PreviewGroupMeta[];
  readonly items: readonly PreviewItem[];
}

interface EditableItem {
  clientDraftId: string;
  kind: "STANDARD_ITEM" | "SYNONYM_ANTONYM_RELATION";
  word: string;
  translation: string;
  definition: string;
  example: string;
  status: "VALID" | "WARNING" | "INVALID";
  isManual: boolean;
  partOfSpeech: string | null;
  synonym: string | null;
  synonymTranslation: string | null;
  antonym: string | null;
  antonymTranslation: string | null;
  sectionClientDraftId: string | null;
  warnings: readonly string[];
  errors: readonly string[];
}

interface LessonVocabularyItem {
  readonly id: string;
  readonly word: string;
  readonly translation: string;
  readonly definition?: string | null;
  readonly example?: string | null;
  readonly displayOrder: number;
}

interface VocabularyImportDialogProps {
  lessonId: string;
  existingVocab: readonly LessonVocabularyItem[];
  onClose: () => void;
}

export function VocabularyImportDialog({
  lessonId,
  existingVocab,
  onClose,
}: VocabularyImportDialogProps): ReactNode {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewItems, setPreviewItems] = useState<EditableItem[]>([]);
  const [previewGroups, setPreviewGroups] = useState<PreviewGroupMeta[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [editExample, setEditExample] = useState("");
  const [editPartOfSpeech, setEditPartOfSpeech] = useState("");
  const [editSynonym, setEditSynonym] = useState("");
  const [editSynonymTranslation, setEditSynonymTranslation] = useState("");
  const [editAntonym, setEditAntonym] = useState("");
  const [editAntonymTranslation, setEditAntonymTranslation] = useState("");
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newPartOfSpeech, setNewPartOfSpeech] = useState("");
  const [newGroupId, setNewGroupId] = useState<string>("");

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsLoading(true);
    setUploadError(null);

    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/lessons/${lessonId}/vocabulary/import/preview`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );

      if (!response.ok) {
        let errMsg: string | null = null;
        try {
          const errBody: unknown = await response.json();
          if (typeof errBody === "object" && errBody !== null && "message" in errBody) {
            errMsg = String((errBody as Record<string, unknown>).message);
          }
        } catch {
          // ignore parse failures
        }
        const statusMessages: Partial<Record<number, string>> = {
          401: "Authentication failed. Please log in again.",
          403: "You don't have access to this lesson.",
          413: "File is too large. Maximum size is 10MB.",
        };
        const statusBase = response.status >= 500 ? "Server error. Please try again later." : null;
        throw new Error(errMsg ?? statusMessages[response.status] ?? statusBase ?? "Upload failed");
      }

      const result = (await response.json()) as { data: PreviewResult };
      const preview = result.data;

      const items: EditableItem[] = preview.items.map((item) => ({
        clientDraftId: item.clientDraftId,
        kind: item.kind,
        word: "word" in item ? item.word : (item as { primaryWord: string }).primaryWord,
        translation: "translation" in item ? item.translation : (item as { primaryTranslation: string }).primaryTranslation,
        definition: "",
        example: "",
        status: item.status,
        isManual: false,
        partOfSpeech: item.partOfSpeech,
        synonym: "synonym" in item ? (item.synonym ?? null) : null,
        synonymTranslation: "synonymTranslation" in item ? (item.synonymTranslation ?? null) : null,
        antonym: "antonym" in item ? (item.antonym ?? null) : null,
        antonymTranslation: "antonymTranslation" in item ? (item.antonymTranslation ?? null) : null,
        sectionClientDraftId: item.sectionClientDraftId,
        warnings: item.warnings,
        errors: item.errors,
      }));

      const groups: PreviewGroupMeta[] = preview.sections.map((g) => ({
        clientDraftId: g.clientDraftId,
        title: g.title,
        displayOrder: g.displayOrder,
      }));

      setPreviewItems(items);
      setPreviewGroups(groups);
      setNewGroupId(groups[0]?.clientDraftId ?? "");
      setPreviewWarnings(preview.counts.total > 0 ? [] : ["No vocabulary items found in document"]);
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setUploadError("Cannot reach the server. Check your connection and try again.");
      } else {
        setUploadError(err instanceof Error ? err.message : "Failed to parse document");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (item: EditableItem): void => {
    setEditingId(item.clientDraftId);
    setEditWord(item.word);
    setEditTranslation(item.translation);
    setEditDefinition(item.definition);
    setEditExample(item.example);
    setEditPartOfSpeech(item.partOfSpeech ?? "");
    setEditSynonym(item.synonym ?? "");
    setEditSynonymTranslation(item.synonymTranslation ?? "");
    setEditAntonym(item.antonym ?? "");
    setEditAntonymTranslation(item.antonymTranslation ?? "");
  };

  const saveEdit = (): void => {
    if (!editingId) return;
    const posValue = editPartOfSpeech.trim();
    const synValue = editSynonym.trim();
    const synTransValue = editSynonymTranslation.trim();
    const antValue = editAntonym.trim();
    const antTransValue = editAntonymTranslation.trim();
    setPreviewItems((prev) =>
      prev.map((item) =>
        item.clientDraftId === editingId
          ? {
              ...item,
              word: editWord.trim(),
              translation: editTranslation.trim(),
              definition: editDefinition.trim(),
              example: editExample.trim(),
              partOfSpeech: posValue.length > 0 ? posValue : null,
              synonym: synValue.length > 0 ? synValue : null,
              synonymTranslation: synTransValue.length > 0 ? synTransValue : null,
              antonym: antValue.length > 0 ? antValue : null,
              antonymTranslation: antTransValue.length > 0 ? antTransValue : null,
              status: "VALID" as const,
            }
          : item,
      ),
    );
    setEditingId(null);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
  };

  const deleteItem = (clientDraftId: string): void => {
    setPreviewItems((prev) => prev.filter((i) => i.clientDraftId !== clientDraftId));
  };

  const addManualItem = (): void => {
    if (!newWord.trim() || !newTranslation.trim()) return;
    const posValue = newPartOfSpeech.trim();
    const groupId = newGroupId === "" ? null : newGroupId;
    setPreviewItems((prev) => [
      ...prev,
      {
        clientDraftId: `manual-${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        kind: "STANDARD_ITEM",
        word: newWord.trim(),
        translation: newTranslation.trim(),
        definition: newDefinition.trim(),
        example: newExample.trim(),
        status: "VALID",
        isManual: true,
        partOfSpeech: posValue.length > 0 ? posValue : null,
        synonym: null,
        synonymTranslation: null,
        antonym: null,
        antonymTranslation: null,
        sectionClientDraftId: groupId,
        warnings: [],
        errors: [],
      },
    ]);
    setNewWord("");
    setNewTranslation("");
    setNewDefinition("");
    setNewExample("");
    setNewPartOfSpeech("");
  };

      const commitMutation = useMutation({
    mutationFn: async () => {
      const incomingWords = new Set(
        previewItems.map((i) => i.word.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ")),
      );

      const removeVocabIds = existingVocab
        .filter((ev) => {
          const evKey = ev.word.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
          return incomingWords.has(evKey);
        })
        .map((ev) => ev.id);

      const groupRelationKinds = new Map<string, boolean>();
      for (const item of previewItems) {
        if (item.sectionClientDraftId && item.kind === "SYNONYM_ANTONYM_RELATION") {
          groupRelationKinds.set(item.sectionClientDraftId, true);
        }
      }

      const items = previewItems.map((item, idx) => ({
        word: item.word,
        translation: item.translation,
        definition: item.definition,
        example: item.example,
        partOfSpeech: item.partOfSpeech ?? undefined,
        kind: item.kind,
        synonym: item.synonym ?? undefined,
        synonymTranslation: item.synonymTranslation ?? undefined,
        antonym: item.antonym ?? undefined,
        antonymTranslation: item.antonymTranslation ?? undefined,
        displayOrder: existingVocab.length + idx,
        sectionClientDraftId: item.sectionClientDraftId,
      }));

      const sections = previewGroups.map((g) => ({
        clientDraftId: g.clientDraftId,
        title: g.title,
        displayOrder: g.displayOrder,
        kind: groupRelationKinds.has(g.clientDraftId) ? "SYNONYM_ANTONYM" : "STANDARD_VOCABULARY",
      }));

      return api.post(`/lessons/${lessonId}/vocabulary/import/commit`, {
        items,
        sections,
        removeVocabIds,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      onClose();
    },
  });

  const groupSections: { readonly key: string; readonly title: string | null; readonly items: readonly EditableItem[] }[] = ((): { readonly key: string; readonly title: string | null; readonly items: readonly EditableItem[] }[] => {
    const sorted = [...previewGroups].sort((a, b) => a.displayOrder - b.displayOrder);
    const sections = sorted
      .map((g) => ({
        key: g.clientDraftId,
        title: g.title,
        items: previewItems.filter((i) => i.sectionClientDraftId === g.clientDraftId),
      }))
      .filter((s) => s.items.length > 0);
    const ungrouped = previewItems.filter(
      (i) => i.sectionClientDraftId === null || i.sectionClientDraftId === "",
    );
    if (ungrouped.length > 0) {
      sections.push({ key: "__ungrouped__", title: null, items: ungrouped });
    }
    return sections;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
              <FileText className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                استيراد المفردات من ملف Word
              </h2>
              <p className="text-xs text-neutral-500">
                {previewItems.length > 0
                  ? `${String(previewItems.length)} كلمة جاهزة للمراجعة`
                  : "رفع ملف Word (.docx) لاستيراد المفردات"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {previewItems.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                loading={commitMutation.isPending}
                onClick={(): void => { commitMutation.mutate(); }}
              >
                حفظ المفردات
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="إغلاق">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              <p className="text-sm text-neutral-500">جاري تحليل الملف...</p>
            </div>
          )}

          {uploadError && (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-danger-500/10 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-danger-500" />
              <p className="text-sm font-medium text-danger-700 dark:text-danger-400">
                {uploadError}
              </p>
              <Button variant="outline" size="sm" onClick={(): void => { fileInputRef.current?.click(); }}>
                حاول مرة أخرى
              </Button>
            </div>
          )}

          {!isLoading && !uploadError && previewItems.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <Upload className="h-8 w-8 text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  رفع ملف Word لاستيراد المفردات
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  يجب أن يحتوي الملف على جدول مفردات (Word | Meaning)
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={(): void => { fileInputRef.current?.click(); }}>
                <Upload className="h-4 w-4" />
                رفع ملف
              </Button>
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="flex flex-col gap-3">
              {previewWarnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{previewWarnings[0]}</span>
                </div>
              )}

              {groupSections.map((section) => (
                <div key={section.key} className="flex flex-col gap-2">
                  {section.title !== null && (
                    <h3 className="border-b border-neutral-200 pb-1 text-sm font-bold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                      {section.title}
                    </h3>
                  )}
                  <div className="flex flex-col gap-2">
                    {section.items.map((item) => (
                  <div
                    key={item.clientDraftId}
                    className={`flex items-center gap-3 rounded-xl p-3 ${
                      item.status === "INVALID"
                        ? "bg-danger-500/5 ring-1 ring-danger-500/20"
                        : item.status === "WARNING"
                          ? "bg-amber-500/5 ring-1 ring-amber-500/20"
                          : "bg-neutral-50 dark:bg-neutral-800/50"
                    }`}
                  >
                    {editingId === item.clientDraftId ? (
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
                        {item.kind === "SYNONYM_ANTONYM_RELATION" && (
                          <>
                            <div className="flex items-center gap-2">
                              <Input
                                value={editSynonym}
                                onChange={(e): void => { setEditSynonym(e.target.value); }}
                                className="flex-1"
                                placeholder="مرادف (اختياري)"
                              />
                              <Input
                                value={editSynonymTranslation}
                                onChange={(e): void => { setEditSynonymTranslation(e.target.value); }}
                                className="flex-1"
                                placeholder="ترجمة المرادف (اختياري)"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={editAntonym}
                                onChange={(e): void => { setEditAntonym(e.target.value); }}
                                className="flex-1"
                                placeholder="مضاد (اختياري)"
                              />
                              <Input
                                value={editAntonymTranslation}
                                onChange={(e): void => { setEditAntonymTranslation(e.target.value); }}
                                className="flex-1"
                                placeholder="ترجمة المضاد (اختياري)"
                              />
                            </div>
                          </>
                        )}
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
                            disabled={!editWord.trim() || !editTranslation.trim()}
                            onClick={saveEdit}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="إلغاء" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary-500">
                              {item.word}
                              {item.partOfSpeech && (
                                <span className="ml-1 text-xs font-normal text-neutral-400">
                                  ({item.partOfSpeech})
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-neutral-500">—</span>
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {item.translation}
                            </span>
                          </div>
                          {item.kind === "SYNONYM_ANTONYM_RELATION" && (
                            <div className="mt-1 flex flex-wrap gap-3 text-xs">
                              {item.synonym && (
                                <span className="text-primary-600 dark:text-primary-400">
                                  <span className="text-neutral-500">مرادف: </span>
                                  {item.synonym}
                                  {item.synonymTranslation && (
                                    <span className="text-neutral-400"> ({item.synonymTranslation})</span>
                                  )}
                                </span>
                              )}
                              {item.antonym && (
                                <span className="text-danger-600 dark:text-danger-400">
                                  <span className="text-neutral-500">مضاد: </span>
                                  {item.antonym}
                                  {item.antonymTranslation && (
                                    <span className="text-neutral-400"> ({item.antonymTranslation})</span>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          {item.definition && (
                            <p className="mt-0.5 text-xs text-neutral-400">{item.definition}</p>
                          )}
                          {item.example && (
                            <p className="mt-0.5 text-xs italic text-neutral-400">
                              &quot;{item.example}&quot;
                            </p>
                          )}
                          {item.status === "INVALID" && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.errors.map((err, i) => (
                                <Badge key={i} variant="danger" className="text-[10px]">
                                  {err === "MISSING_WORD" ? "الكلمة مفقودة" : err === "MISSING_TRANSLATION" ? "الترجمة مفقودة" : err}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {item.status !== "INVALID" && item.warnings.includes("DUPLICATE_IN_DOCUMENT") && (
                            <div className="mt-1">
                              <Badge variant="warning" className="text-[10px]">
                                كلمة مكررة
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="تعديل"
                          className="text-neutral-400 hover:text-primary-500"
                          disabled={editingId !== null}
                          onClick={(): void => { startEdit(item); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="حذف"
                          className="text-danger-500 hover:bg-danger-500/10"
                          disabled={editingId !== null}
                          onClick={(): void => { deleteItem(item.clientDraftId); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                    ))}
                  </div>
                </div>
              ))}

              {editingId === null && (
                <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-500">إضافة كلمة يدوياً</p>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="كلمة"
                      value={newWord}
                      onChange={(e): void => { setNewWord(e.target.value); }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="ترجمة"
                      value={newTranslation}
                      onChange={(e): void => { setNewTranslation(e.target.value); }}
                      className="flex-1"
                    />
                  </div>
                  <Input
                    placeholder="تعريف (اختياري)"
                    value={newDefinition}
                    onChange={(e): void => { setNewDefinition(e.target.value); }}
                    className="text-xs"
                  />
                  <Input
                    placeholder="مثال (اختياري)"
                    value={newExample}
                    onChange={(e): void => { setNewExample(e.target.value); }}
                    className="text-xs"
                  />
                  <Input
                    placeholder="نوع الكلمة n, v, adj (اختياري)"
                    value={newPartOfSpeech}
                    onChange={(e): void => { setNewPartOfSpeech(e.target.value); }}
                    className="text-xs"
                  />
                  {previewGroups.length > 0 && (
                    <select
                      value={newGroupId}
                      onChange={(e): void => { setNewGroupId(e.target.value); }}
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      {previewGroups.map((g) => (
                        <option key={g.clientDraftId} value={g.clientDraftId}>
                          {g.title ?? "بدون مجموعة"}
                        </option>
                      ))}
                      <option value="">بدون مجموعة</option>
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!newWord.trim() || !newTranslation.trim()}
                    onClick={addManualItem}
                  >
                    <Plus className="h-4 w-4" />
                    إضافة يدوية
                  </Button>
                </div>
              )}
            </div>
          )}

          {commitMutation.isError && (
            <div className="mt-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-600 dark:text-danger-400">
              {commitMutation.error instanceof Error ? commitMutation.error.message : "فشل حفظ المفردات"}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={(e): void => { void handleFileChange(e); }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

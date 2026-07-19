"use client";

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Loader2,
  AlertCircle,
  X,
  Search,
  Trash2,
  FileQuestion,
  Expand,
  Minimize2,
  ListChecks,
  RotateCcw,
  FileText,
} from "lucide-react";
import type {
  QuestionImportPreview,
  QuestionPreviewGroup,
  EditableQuestionItem,
  EditableQuestionGroup,
  QuestionPreviewType,
} from "./question-preview.types";
import { QuestionImportSummary } from "./question-import-summary";
import { QuestionImportGroup } from "./question-import-group";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function generateId(): string {
  return "q_" + Math.random().toString(36).substring(2, 11);
}

function mapPreviewToEditable(preview: QuestionImportPreview): EditableQuestionGroup[] {
  return preview.groups.map((g: QuestionPreviewGroup) => ({
    id: g.id,
    title: g.title,
    displayOrder: g.displayOrder,
    isExpanded: true,
    items: g.items.map((item) => ({
      clientDraftId: item.clientDraftId,
      questionType: item.questionType,
      prompt: item.prompt,
      instruction: item.instruction,
      explanation: item.explanation,
      options: item.options.map((o) => ({ ...o })),
      correctAnswer: item.correctAnswer,
      acceptableAnswers: [...item.acceptableAnswers],
      passageText: item.passageText,
      status: item.status,
      warnings: [...item.warnings],
      errors: [...item.errors],
      groupId: item.groupId,
      displayOrder: item.displayOrder,
      isSelected: false,
    })),
  }));
}

interface QuestionImportPreviewDialogProps {
  readonly lessonId: string;
  readonly onClose: () => void;
}

export function QuestionImportPreviewDialog({
  lessonId,
  onClose,
}: QuestionImportPreviewDialogProps): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<QuestionImportPreview | null>(null);
  const [editableGroups, setEditableGroups] = useState<EditableQuestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionPreviewType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WARNING" | "INVALID">("ALL");

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsLoading(true);
    setUploadError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `${API_BASE_URL}/lessons/${lessonId}/questions/import/preview`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload file");
      }

      const json = (await response.json()) as { data: QuestionImportPreview };
      setPreviewData(json.data);
      setEditableGroups(mapPreviewToEditable(json.data));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = useCallback((groupId: string, itemId: string, updates: Partial<EditableQuestionItem>): void => {
    setEditableGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((item) =>
            item.clientDraftId === itemId ? { ...item, ...updates } : item,
          ),
        };
      }),
    );
  }, []);

  const deleteItem = useCallback((groupId: string, itemId: string): void => {
    setEditableGroups((prev) =>
      prev
        .map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, items: g.items.filter((i) => i.clientDraftId !== itemId) };
        })
        .filter((g) => g.items.length > 0),
    );
  }, []);

  const duplicateItem = useCallback((groupId: string, item: EditableQuestionItem): void => {
    const newItem: EditableQuestionItem = {
      ...item,
      clientDraftId: generateId(),
      displayOrder: item.displayOrder + 0.5,
      isSelected: false,
    };
    setEditableGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const idx = g.items.findIndex((i) => i.clientDraftId === item.clientDraftId);
        const items = [...g.items];
        items.splice(idx + 1, 0, newItem);
        return { ...g, items };
      }),
    );
  }, []);

  const moveItem = useCallback((groupId: string, itemId: string, direction: "up" | "down"): void => {
    setEditableGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const idx = g.items.findIndex((i) => i.clientDraftId === itemId);
        if (idx === -1) return g;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= g.items.length) return g;
        const items = [...g.items];
        const temp = items[idx];
        items[idx] = items[targetIdx];
        items[targetIdx] = temp;
        return { ...g, items };
      }),
    );
  }, []);

  const toggleGroupExpanded = useCallback((groupId: string): void => {
    setEditableGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g)),
    );
  }, []);

  const expandAll = useCallback((): void => {
    setEditableGroups((prev) => prev.map((g) => ({ ...g, isExpanded: true })));
  }, []);

  const collapseAll = useCallback((): void => {
    setEditableGroups((prev) => prev.map((g) => ({ ...g, isExpanded: false })));
  }, []);

  const toggleSelectItem = useCallback((itemId: string): void => {
    setEditableGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.clientDraftId === itemId ? { ...i, isSelected: !i.isSelected } : i,
        ),
      })),
    );
  }, []);

  const selectAll = useCallback((): void => {
    const allSelected = editableGroups.every((g) => g.items.every((i) => i.isSelected));
    setEditableGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) => ({ ...i, isSelected: !allSelected })),
      })),
    );
  }, [editableGroups]);

  const deleteSelected = useCallback((): void => {
    setEditableGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => !i.isSelected),
        }))
        .filter((g) => g.items.length > 0),
    );
  }, []);

  const deleteInvalid = useCallback((): void => {
    setEditableGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => i.status !== "INVALID"),
        }))
        .filter((g) => g.items.length > 0),
    );
  }, []);

  const filteredGroups = useMemo(() => {
    return editableGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!item.prompt.toLowerCase().includes(q)) return false;
          }
          if (typeFilter !== "ALL" && item.questionType !== typeFilter) return false;
          if (statusFilter === "WARNING" && item.status !== "WARNING") return false;
          if (statusFilter === "INVALID" && item.status !== "INVALID") return false;
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [editableGroups, searchQuery, typeFilter, statusFilter]);

  const totalSelected = useMemo(
    () => editableGroups.reduce((sum, g) => sum + g.items.filter((i) => i.isSelected).length, 0),
    [editableGroups],
  );

  const totalCount = useMemo(
    () => editableGroups.reduce((sum, g) => sum + g.items.length, 0),
    [editableGroups],
  );

  const typeOptions: readonly { value: QuestionPreviewType | "ALL"; label: string }[] = [
    { value: "ALL", label: "All types" },
    { value: "MCQ", label: "MCQ" },
    { value: "READING_QUESTION", label: "Reading" },
    { value: "DIALOGUE", label: "Dialogue" },
    { value: "GRAMMAR", label: "Grammar" },
    { value: "FILL_IN_BLANK", label: "Fill in blank" },
    { value: "WRITING", label: "Writing" },
    { value: "ESSAY", label: "Essay" },
    { value: "READING", label: "Passage" },
    { value: "UNKNOWN", label: "Unknown" },
  ];

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-xl dark:bg-surface-elevated">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <FileQuestion className="h-6 w-6 text-primary-500" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Import Questions
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Upload area */}
        {previewData === null && !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <FileText className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                Upload a Word document
              </h3>
              <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                Upload a .docx file containing questions. The system will detect sections and
                question types automatically.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Upload className="h-5 w-5" />}
              onClick={(): void => fileInputRef.current?.click()}
            >
              Select file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e): void => {
                void handleFileChange(e);
              }}
            />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Parsing document...
            </p>
          </div>
        )}

        {/* Error */}
        {uploadError !== null && previewData === null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <AlertCircle className="h-12 w-12 text-danger-500" />
            <p className="text-sm text-danger-600 dark:text-danger-400">{uploadError}</p>
            <Button variant="outline" onClick={(): void => { setUploadError(null); }}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          </div>
        )}

        {/* Preview body */}
        {previewData !== null && (
          <>
            {/* Summary */}
            <QuestionImportSummary
              totalQuestions={totalCount}
              groupCount={editableGroups.length}
              validCount={previewData.counts.valid}
              warningCount={previewData.counts.warning}
              invalidCount={previewData.counts.invalid}
              supportedTypes={Array.from(
                new Set(editableGroups.flatMap((g) => g.items.map((i) => i.questionType))),
              )}
              onUploadNew={(): void => {
                setPreviewData(null);
                setEditableGroups([]);
              }}
            />

            {/* Search + Filters */}
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-6 py-3 dark:border-neutral-700">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={searchQuery}
                  onChange={(e): void => { setSearchQuery(e.target.value); }}
                  placeholder="Search questions..."
                  className="pr-10"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e): void => { setTypeFilter(e.target.value as QuestionPreviewType | "ALL"); }}
                className="rounded-[var(--radius-sm)] border border-input bg-surface px-3 py-2 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:bg-surface-muted dark:text-neutral-200"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e): void => { setStatusFilter(e.target.value as "ALL" | "WARNING" | "INVALID"); }}
                className="rounded-[var(--radius-sm)] border border-input bg-surface px-3 py-2 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:bg-surface-muted dark:text-neutral-200"
              >
                <option value="ALL">All status</option>
                <option value="WARNING">Warnings only</option>
                <option value="INVALID">Errors only</option>
              </select>
            </div>

            {/* Bulk actions */}
            <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 px-6 py-2 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" leftIcon={<Expand className="h-4 w-4" />} onClick={expandAll}>
                  Expand all
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Minimize2 className="h-4 w-4" />} onClick={collapseAll}>
                  Collapse all
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<ListChecks className="h-4 w-4" />} onClick={selectAll}>
                  {totalSelected > 0 ? "Deselect all" : "Select all"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {totalSelected > 0 && (
                  <>
                    <span className="text-xs text-neutral-500">{totalSelected} selected</span>
                    <Button variant="ghost" size="sm" className="text-danger-500" leftIcon={<Trash2 className="h-4 w-4" />} onClick={deleteSelected}>
                      Delete selected
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" className="text-danger-500" leftIcon={<Trash2 className="h-4 w-4" />} onClick={deleteInvalid}>
                  Delete invalid
                </Button>
              </div>
            </div>

            {/* Groups list */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col gap-4">
                {filteredGroups.map((group) => (
                  <QuestionImportGroup
                    key={group.id}
                    group={group}
                    onToggleExpand={toggleGroupExpanded}
                    onUpdateItem={(itemId, updates): void => { updateItem(group.id, itemId, updates); }}
                    onDeleteItem={(itemId): void => { deleteItem(group.id, itemId); }}
                    onDuplicateItem={(item): void => { duplicateItem(group.id, item); }}
                    onMoveItem={(itemId, direction): void => { moveItem(group.id, itemId, direction); }}
                    onToggleSelect={toggleSelectItem}
                  />
                ))}

                {filteredGroups.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Search className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                    <p className="text-sm text-neutral-500">
                      No questions match the current filters.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 dark:border-neutral-700">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {totalCount} questions in {editableGroups.length} groups
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button variant="primary">Preview is local only</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

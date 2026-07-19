"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EditableQuestionItem,
  QuestionPreviewType,
} from "./question-preview.types";

const TYPE_BADGE_COLORS: Record<QuestionPreviewType, string> = {
  MCQ: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  TRUE_FALSE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  FILL_IN_BLANK: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  GRAMMAR: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  READING: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  READING_QUESTION: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  DIALOGUE: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  DIALOGUE_QUESTION: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  PARAGRAPH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  WRITING: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  MATCHING: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  ORDERING: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  DRAG_DROP: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  SHORT_ANSWER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  ESSAY: "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300",
  UNKNOWN: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
};

interface QuestionImportCardProps {
  readonly item: EditableQuestionItem;
  readonly questionNumber: number;
  readonly totalInGroup: number;
  readonly onUpdate: (updates: Partial<EditableQuestionItem>) => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly onToggleSelect: () => void;
}

export function QuestionImportCard({
  item,
  questionNumber,
  totalInGroup: _totalInGroup,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleSelect,
}: QuestionImportCardProps): ReactNode {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(item.prompt);
  const [editOptions, setEditOptions] = useState(item.options.map((o) => ({ ...o })));

  const startEditing = (): void => {
    setEditPrompt(item.prompt);
    setEditOptions(item.options.map((o) => ({ ...o })));
    setIsEditing(true);
  };

  const saveEditing = (): void => {
    onUpdate({ prompt: editPrompt, options: editOptions });
    setIsEditing(false);
  };

  const cancelEditing = (): void => {
    setEditPrompt(item.prompt);
    setEditOptions(item.options.map((o) => ({ ...o })));
    setIsEditing(false);
  };

  const updateOptionText = (index: number, text: string): void => {
    setEditOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, text } : o)),
    );
  };

  const toggleOptionCorrect = (index: number): void => {
    setEditOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o)),
    );
    if (!isEditing) {
      onUpdate({
        options: item.options.map((o, i) =>
          i === index ? { ...o, isCorrect: !o.isCorrect } : o,
        ),
      });
    }
  };

  const statusIcon = (): ReactNode => {
    if (item.status === "VALID") {
      return <CheckCircle2 className="h-4 w-4 text-success-500" />;
    }
    if (item.status === "WARNING") {
      return <AlertTriangle className="h-4 w-4 text-warning-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-danger-500" />;
  };

  return (
    <div
      className={cn(
        "group rounded-[var(--radius-sm)] border border-neutral-200 bg-surface transition-all duration-150 hover:shadow-sm dark:border-neutral-700 dark:bg-surface-muted",
        item.status === "WARNING" && "border-warning-300 dark:border-warning-700",
        item.status === "INVALID" && "border-danger-300 dark:border-danger-700",
        item.isSelected && "ring-2 ring-primary-500",
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={item.isSelected}
            onChange={(): void => { onToggleSelect(); }}
            aria-label={"Select question " + String(questionNumber)}
          />
          <span className="text-xs font-semibold text-neutral-500">
            #{questionNumber}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              TYPE_BADGE_COLORS[item.questionType],
            )}
          >
            {item.questionType}
          </span>
          {statusIcon()}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onMoveUp && (
            <Button variant="ghost" size="icon-sm" aria-label="Move up" onClick={onMoveUp}>
              <ArrowUp className="h-3.5 w-3.5 text-neutral-400" />
            </Button>
          )}
          {onMoveDown && (
            <Button variant="ghost" size="icon-sm" aria-label="Move down" onClick={onMoveDown}>
              <ArrowDown className="h-3.5 w-3.5 text-neutral-400" />
            </Button>
          )}
          {!isEditing && (
            <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={startEditing}>
              <Pencil className="h-3.5 w-3.5 text-neutral-400" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" aria-label="Duplicate" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5 text-neutral-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            className="text-danger-500"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Question prompt */}
        <div className="mb-2">
          {isEditing ? (
            <textarea
              value={editPrompt}
              onChange={(e): void => { setEditPrompt(e.target.value); }}
              className="min-h-[60px] w-full resize-y rounded-[var(--radius-sm)] border border-input bg-surface px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:bg-surface-muted dark:text-neutral-100"
              dir="auto"
            />
          ) : (
            <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200" dir="auto">
              {item.prompt}
            </p>
          )}
        </div>

        {/* Passage text (if reading question) */}
        {item.passageText !== null && (
          <div className="mb-2 rounded-[var(--radius-sm)] border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800/50">
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400" dir="auto">
              {item.passageText}
            </p>
          </div>
        )}

        {/* Options */}
        {(isEditing ? editOptions : item.options).length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {(isEditing ? editOptions : item.options).map((opt, oi) => {
              const label = String.fromCharCode(97 + oi);
              return (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(): void => { toggleOptionCorrect(oi); }}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                      opt.isCorrect
                        ? "bg-success-500 text-white"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
                    )}
                    aria-label={opt.isCorrect ? "Mark as incorrect" : "Mark as correct"}
                  >
                    {opt.isCorrect ? <Check className="h-3 w-3" /> : label.toUpperCase()}
                  </button>
                  {isEditing ? (
                    <Input
                      value={opt.text}
                      onChange={(e): void => { updateOptionText(oi, e.target.value); }}
                      className="flex-1 text-sm"
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        opt.isCorrect
                          ? "font-medium text-success-700 dark:text-success-300"
                          : "text-neutral-700 dark:text-neutral-300",
                      )}
                      dir="auto"
                    >
                      {opt.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Warnings & Errors */}
        {item.warnings.length > 0 && !isEditing && (
          <div className="mt-2 flex flex-col gap-1">
            {item.warnings.map((w, wi) => (
              <div
                key={wi}
                className="flex items-center gap-1.5 text-xs text-warning-600 dark:text-warning-400"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {item.errors.length > 0 && !isEditing && (
          <div className="mt-1 flex flex-col gap-1">
            {item.errors.map((e, ei) => (
              <div
                key={ei}
                className="flex items-center gap-1.5 text-xs text-danger-600 dark:text-danger-400"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}

        {/* Edit actions */}
        {isEditing && (
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-700">
            <Button variant="ghost" size="sm" leftIcon={<X className="h-4 w-4" />} onClick={cancelEditing}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Check className="h-4 w-4" />} onClick={saveEditing}>
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

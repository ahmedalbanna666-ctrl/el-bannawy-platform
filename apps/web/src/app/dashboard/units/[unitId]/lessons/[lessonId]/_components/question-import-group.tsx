"use client";

import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EditableQuestionGroup,
  EditableQuestionItem,
} from "./question-preview.types";
import { QuestionImportCard } from "./question-import-card";

interface QuestionImportGroupProps {
  readonly group: EditableQuestionGroup;
  readonly onToggleExpand: (groupId: string) => void;
  readonly onUpdateItem: (itemId: string, updates: Partial<EditableQuestionItem>) => void;
  readonly onDeleteItem: (itemId: string) => void;
  readonly onDuplicateItem: (item: EditableQuestionItem) => void;
  readonly onMoveItem: (itemId: string, direction: "up" | "down") => void;
  readonly onToggleSelect: (itemId: string) => void;
}

export function QuestionImportGroup({
  group,
  onToggleExpand,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItem,
  onToggleSelect,
}: QuestionImportGroupProps): ReactNode {
  const warningCount = group.items.filter((i) => i.status === "WARNING").length;
  const errorCount = group.items.filter((i) => i.status === "INVALID").length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-neutral-200 transition-all duration-200 dark:border-neutral-700",
        !group.isExpanded && "shadow-sm",
      )}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={(): void => { onToggleExpand(group.id); }}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
          group.isExpanded && "border-b border-neutral-200 dark:border-neutral-700",
        )}
        aria-expanded={group.isExpanded}
      >
        <div className="flex items-center gap-3">
          <FileQuestion className="h-5 w-5 text-primary-500" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {group.title}
          </span>
          <Badge variant="primary" className="text-[10px]">
            {group.items.length}
          </Badge>
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {warningCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-danger-600 dark:text-danger-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {errorCount}
            </span>
          )}
        </div>
        <span
          role="presentation"
          aria-hidden="true"
          className="inline-flex items-center justify-center rounded-xl font-semibold transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
        >
          {group.isExpanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          )}
        </span>
      </button>

      {/* Group items */}
      <div
        className={cn(
          "transition-all duration-200 ease-out",
          group.isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 p-4">
            {group.items.map((item, idx) => (
              <QuestionImportCard
                key={item.clientDraftId}
                item={item}
                questionNumber={idx + 1}
                totalInGroup={group.items.length}
                onUpdate={(updates): void => { onUpdateItem(item.clientDraftId, updates); }}
                onDelete={(): void => { onDeleteItem(item.clientDraftId); }}
                onDuplicate={(): void => { onDuplicateItem(item); }}
                onMoveUp={idx > 0 ? (): void => { onMoveItem(item.clientDraftId, "up"); } : undefined}
                onMoveDown={
                  idx < group.items.length - 1
                    ? (): void => { onMoveItem(item.clientDraftId, "down"); }
                    : undefined
                }
                onToggleSelect={(): void => { onToggleSelect(item.clientDraftId); }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

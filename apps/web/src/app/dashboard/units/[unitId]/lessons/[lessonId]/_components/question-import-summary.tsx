"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  FileQuestion,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionPreviewType } from "./question-preview.types";

const TYPE_LABELS: Record<QuestionPreviewType, string> = {
  MCQ: "MCQ",
  TRUE_FALSE: "True/False",
  FILL_IN_BLANK: "Fill in blank",
  GRAMMAR: "Grammar",
  READING: "Passage",
  READING_QUESTION: "Reading",
  DIALOGUE: "Dialogue",
  DIALOGUE_QUESTION: "Dialogue Q",
  PARAGRAPH: "Paragraph",
  WRITING: "Writing",
  MATCHING: "Matching",
  ORDERING: "Ordering",
  DRAG_DROP: "Drag & Drop",
  SHORT_ANSWER: "Short answer",
  ESSAY: "Essay",
  UNKNOWN: "Unknown",
};

const TYPE_COLORS: Record<QuestionPreviewType, string> = {
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

interface QuestionImportSummaryProps {
  readonly totalQuestions: number;
  readonly groupCount: number;
  readonly validCount: number;
  readonly warningCount: number;
  readonly invalidCount: number;
  readonly supportedTypes: readonly QuestionPreviewType[];
  readonly onUploadNew: () => void;
}

export function QuestionImportSummary({
  totalQuestions,
  groupCount,
  validCount,
  warningCount,
  invalidCount,
  supportedTypes,
  onUploadNew,
}: QuestionImportSummaryProps): ReactNode {
  const uniqueTypes = [...new Set(supportedTypes)];

  return (
    <div className="border-b border-neutral-200 bg-neutral-50/50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-800/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-primary-500" />
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalQuestions}
            </span>
            <span className="text-sm text-neutral-500">questions</span>
          </div>

          <div className="text-sm text-neutral-500">
            {groupCount} {groupCount === 1 ? "group" : "groups"}
          </div>

          <div className="flex items-center gap-2">
            {validCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-success-600 dark:text-success-400">
                <CheckCircle2 className="h-4 w-4" />
                {validCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-warning-600 dark:text-warning-400">
                <AlertTriangle className="h-4 w-4" />
                {warningCount}
              </span>
            )}
            {invalidCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-danger-600 dark:text-danger-400">
                <AlertCircle className="h-4 w-4" />
                {invalidCount}
              </span>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onUploadNew}>
          Upload new file
        </Button>
      </div>

      {uniqueTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-400">Types:</span>
          {uniqueTypes.map((type) => (
            <span
              key={type}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                TYPE_COLORS[type],
              )}
            >
              {TYPE_LABELS[type]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

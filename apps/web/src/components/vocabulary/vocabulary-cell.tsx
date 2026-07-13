"use client";

import { type ReactNode } from "react";
import { Volume2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { TableCell } from "@/components/ui/table";
import { parseDisplayWord } from "@/lib/word-display";

export interface VocabCellItem {
  readonly id: string;
  readonly word: string;
  readonly translation: string;
  readonly definition: string | null;
  readonly example: string | null;
  readonly partOfSpeech: string | null;
  readonly displayOrder: number;
}

interface VocabCellProps {
  vocab: VocabCellItem;
  isSpeaking: (id: string) => boolean;
  speak: (text: string, id: string) => void;
  isSupported: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}

export function VocabCell({
  vocab,
  isSpeaking,
  speak,
  isSupported,
  expanded,
  onToggleExpand,
}: VocabCellProps): ReactNode {
  const { displayWord, pronunciationText, partOfSpeech: legacyPos } = parseDisplayWord(vocab.word);
  const displayPos = vocab.partOfSpeech ?? legacyPos;
  const speaking = isSpeaking(vocab.id);
  const hasDetails = (vocab.definition?.length ?? 0) > 0 || (vocab.example?.length ?? 0) > 0;

  return (
    <TableCell className="py-3">
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label={`استمع إلى نطق كلمة ${displayWord}`}
          disabled={!isSupported}
          onClick={(): void => {
            if (isSupported) speak(pronunciationText, vocab.id);
          }}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            !isSupported
              ? "cursor-not-allowed text-neutral-300 dark:text-neutral-600"
              : speaking
                ? "bg-primary-500 text-white"
                : "text-primary-400 hover:bg-primary-500/10 hover:text-primary-500"
          }`}
        >
          {speaking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400" dir="ltr">
              {displayWord}
            </span>
            {displayPos && (
              <span className="text-xs text-neutral-400">({displayPos})</span>
            )}
          </div>
          {hasDetails && (
            <div className="mt-1">
              <button
                type="button"
                onClick={onToggleExpand}
                className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-primary-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span>{expanded ? "إخفاء التفاصيل" : "تفاصيل"}</span>
              </button>
              {expanded && (
                <div className="mt-1.5 space-y-1 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800/50">
                  {vocab.definition && (
                    <p className="text-xs text-neutral-500">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">تعريف: </span>
                      {vocab.definition}
                    </p>
                  )}
                  {vocab.example && (
                    <p className="text-xs italic text-neutral-500">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400 not-italic">مثال: </span>
                      &quot;{vocab.example}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TableCell>
  );
}

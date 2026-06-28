"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ActivityConfig } from "./activity-renderer";

interface VocabularyActivityProps {
  config: ActivityConfig;
  onSubmit: (answers: string[], response?: string) => Promise<void>;
  submitted: boolean;
  submitting: boolean;
}

export function VocabularyActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: VocabularyActivityProps): ReactNode {
  const [flipped, setFlipped] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    await onSubmit([], "reviewed");
  };

  if (submitted) {
    return (
      <div className="rounded-lg bg-success-500/10 p-4 text-sm text-success-700 dark:text-success-300">
        Reviewed!
      </div>
    );
  }

  const frontText = config.question ?? "";
  const backText = config.answer ?? (typeof config.correctAnswer === "string" ? config.correctAnswer : "");

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={(): void => {
          setFlipped(!flipped);
        }}
        className="flex h-40 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-primary-200 bg-primary-50 p-6 transition-all hover:border-primary-400 dark:border-primary-800 dark:bg-primary-950"
      >
        <p className="text-center text-lg font-medium text-primary-800 dark:text-primary-200">
          {flipped ? backText : frontText}
        </p>
      </button>
      <p className="text-xs text-neutral-400">Tap the card to flip</p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={(): void => {
          void handleSubmit();
        }}
        loading={submitting}
      >
        Mark as Reviewed
      </Button>
    </div>
  );
}

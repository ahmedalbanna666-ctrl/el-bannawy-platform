"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ActivityConfig } from "./activity-renderer";

interface MatchingActivityProps {
  config: ActivityConfig;
  onSubmit: (answers: string[], response?: string) => Promise<void>;
  submitted: boolean;
  submitting: boolean;
}

export function MatchingActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: MatchingActivityProps): ReactNode {
  const leftItems = config.options ?? [];
  const rightItems = config.statements?.map((s) => s.text) ?? [];
  const [selections, setSelections] = useState<(string | null)[]>(new Array<string | null>(leftItems.length).fill(null));

  const handleSelect = (leftIndex: number, rightValue: string): void => {
    setSelections((prev) => {
      const next = [...prev];
      next[leftIndex] = rightValue;
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    const answers = selections.map((s) => s ?? "");
    await onSubmit(answers, JSON.stringify(answers));
  };

  const isComplete = selections.every((s) => s !== null);

  if (submitted) {
    return (
      <div className="rounded-lg bg-success-500/10 p-4 text-sm text-success-700 dark:text-success-300">
        Activity submitted successfully.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {config.question && (
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{config.question}</p>
      )}
      <div className="flex flex-col gap-3">
        {leftItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <span className="min-w-[80px] text-sm font-medium text-neutral-800 dark:text-neutral-200">{item}</span>
            <span className="text-neutral-400">&mdash;</span>
            <div className="flex flex-1 flex-wrap gap-2">
              {rightItems.map((right) => {
                const isSelected = selections[index] === right;
                return (
                  <button
                    key={right}
                    type="button"
                    onClick={(): void => {
                      handleSelect(index, right);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300"
                        : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {right}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={(): void => {
          void handleSubmit();
        }}
        disabled={!isComplete}
        loading={submitting}
      >
        Submit
      </Button>
    </div>
  );
}

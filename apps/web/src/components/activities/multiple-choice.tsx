"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ActivityConfig } from "./activity-renderer";

interface MultipleChoiceActivityProps {
  config: ActivityConfig;
  onSubmit: (answers: string[], response?: string) => Promise<void>;
  submitted: boolean;
  submitting: boolean;
}

export function MultipleChoiceActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: MultipleChoiceActivityProps): ReactNode {
  const [selected, setSelected] = useState<number | null>(null);
  const options = config.options ?? [];

  const handleSubmit = async (): Promise<void> => {
    if (selected === null) return;
    await onSubmit([String(selected)], options[selected]);
  };

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
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={(): void => {
              setSelected(index);
            }}
            className={`rounded-xl border px-4 py-3 text-start text-sm transition-colors ${
              selected === index
                ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300"
                : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={(): void => {
          void handleSubmit();
        }}
        disabled={selected === null}
        loading={submitting}
      >
        Submit
      </Button>
    </div>
  );
}

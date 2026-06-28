"use client";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActivityConfig } from "./activity-renderer";

interface FillInBlankActivityProps {
  config: ActivityConfig;
  onSubmit: (answers: string[], response?: string) => Promise<void>;
  submitted: boolean;
  submitting: boolean;
}

export function FillInBlankActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: FillInBlankActivityProps): ReactNode {
  const [answer, setAnswer] = useState("");

  const handleSubmit = async (): Promise<void> => {
    if (!answer.trim()) return;
    await onSubmit([answer.trim()], answer.trim());
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
      <Input
        placeholder="Type your answer..."
        value={answer}
        onChange={(e): void => {
          setAnswer(e.target.value);
        }}
      />
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={(): void => {
          void handleSubmit();
        }}
        disabled={!answer.trim()}
        loading={submitting}
      >
        Submit
      </Button>
    </div>
  );
}

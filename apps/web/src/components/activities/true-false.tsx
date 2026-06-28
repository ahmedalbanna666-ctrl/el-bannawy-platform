"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ActivityConfig } from "./activity-renderer";

interface TrueFalseActivityProps {
  config: ActivityConfig;
  onSubmit: (answers: string[], response?: string) => Promise<void>;
  submitted: boolean;
  submitting: boolean;
}

export function TrueFalseActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: TrueFalseActivityProps): ReactNode {
  const statements = config.statements ?? [];
  const [answers, setAnswers] = useState<boolean[]>(new Array<boolean>(statements.length).fill(false));

  const toggleAnswer = (index: number): void => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    const stringAnswers = answers.map((a) => (a ? "true" : "false"));
    await onSubmit(stringAnswers, JSON.stringify(stringAnswers));
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
      <div className="flex flex-col gap-3">
        {statements.map((stmt, index) => (
          <div key={index} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <Checkbox
              label={stmt.text}
              checked={answers[index]}
              onChange={(): void => {
                toggleAnswer(index);
              }}
            />
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
        loading={submitting}
      >
        Submit
      </Button>
    </div>
  );
}

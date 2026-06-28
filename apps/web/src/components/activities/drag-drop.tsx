"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { ActivityConfig } from "./activity-renderer";

interface DragDropActivityProps {
  config: ActivityConfig;
  onSubmit: (answers: string[], response?: string) => Promise<void>;
  submitted: boolean;
  submitting: boolean;
}

export function DragDropActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: DragDropActivityProps): ReactNode {
  const [items, setItems] = useState<string[]>(config.options ?? []);

  const moveItem = (fromIndex: number, direction: -1 | 1): void => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const tmp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = tmp;
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    await onSubmit(items, JSON.stringify(items));
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
      <p className="text-xs text-neutral-400">Order the items correctly using the arrow buttons</p>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={`${item}-${String(index)}`}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200">{item}</span>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={(): void => {
                  moveItem(index, -1);
                }}
                disabled={index === 0}
                className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 dark:hover:text-neutral-300"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(): void => {
                  moveItem(index, 1);
                }}
                disabled={index === items.length - 1}
                className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 dark:hover:text-neutral-300"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
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
        loading={submitting}
      >
        Submit Order
      </Button>
    </div>
  );
}

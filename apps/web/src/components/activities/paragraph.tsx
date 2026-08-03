"use client";

import { useState, type ReactNode } from "react";
import type { ActivityConfig } from "./activity-renderer";
import { Button } from "@/components/ui/button";

interface ParagraphProps {
  readonly config: ActivityConfig;
  readonly onSubmit: (answers: string[], response?: string) => Promise<void>;
  readonly submitted: boolean;
  readonly submitting: boolean;
}

export function ParagraphActivity({ config, onSubmit, submitted, submitting }: ParagraphProps): ReactNode {
  const [text, setText] = useState("");

  if (submitted) return null;

  return (
    <div className="space-y-4">
      {config.question && (
        <p className="font-medium text-white">{config.question}</p>
      )}
      {config.options && config.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {config.options.map((word, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setText((prev) => prev + (prev ? " " : "") + word); }}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-all hover:bg-neutral-700 hover:text-white"
            >
              {word}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={text}
          onChange={(e) => { setText(e.target.value); }}
        placeholder="اكتب فقرتك هنا..."
        className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-primary-400"
        rows={5}
        dir="auto"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">عدد الكلمات: {text.split(/\s+/).filter(Boolean).length}</span>
        <Button
          variant="primary"
          size="md"
          onClick={() => { void onSubmit([text], text); }}
          disabled={submitting || !text.trim() || text.split(/\s+/).filter(Boolean).length < 3}
        >
          {submitting ? "جاري الإرسال..." : "تأكيد"}
        </Button>
      </div>
    </div>
  );
}

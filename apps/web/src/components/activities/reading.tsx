"use client";

import { useState, type ReactNode } from "react";
import type { ActivityConfig } from "./activity-renderer";
import { Button } from "@/components/ui/button";

interface ReadingProps {
  readonly config: ActivityConfig;
  readonly onSubmit: (answers: string[], response?: string) => Promise<void>;
  readonly submitted: boolean;
  readonly submitting: boolean;
}

export function ReadingActivity({ config, onSubmit, submitted, submitting }: ReadingProps): ReactNode {
  const [answer, setAnswer] = useState("");

  if (submitted) return null;

  return (
    <div className="space-y-4">
      {config.question && (
        <div className="rounded-lg bg-neutral-800/50 p-4 leading-relaxed text-neutral-200">
          {config.question}
        </div>
      )}
      {config.options && (
        <div className="space-y-2">
          {config.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setAnswer(opt); }}
              className={`w-full rounded-xl border px-4 py-3 text-right text-sm transition-all ${
                answer === opt
                  ? "border-primary-400 bg-primary-400/10 text-primary-300"
                  : "border-neutral-700 bg-neutral-800 text-white hover:border-neutral-600"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {!config.options && (
        <textarea
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); }}
          placeholder="اكتب إجابتك..."
          className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-primary-400"
          rows={4}
          dir="auto"
        />
      )}
      <Button
        variant="primary"
        size="md"
        onClick={() => { void onSubmit([answer]); }}
        disabled={submitting || !answer.trim()}
      >
        {submitting ? "جاري الإرسال..." : "تأكيد"}
      </Button>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import type { ActivityConfig } from "./activity-renderer";
import { Button } from "@/components/ui/button";

interface WritingProps {
  readonly config: ActivityConfig;
  readonly onSubmit: (answers: string[], response?: string) => Promise<void>;
  readonly submitted: boolean;
  readonly submitting: boolean;
}

export function WritingActivity({ config, onSubmit, submitted, submitting }: WritingProps): ReactNode {
  const [text, setText] = useState("");

  if (submitted) return null;

  return (
    <div className="space-y-4">
      {config.question && (
        <p className="text-lg font-medium text-white">{config.question}</p>
      )}
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); }}
        placeholder="اكتب إجابتك هنا..."
        className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-primary-400"
        rows={6}
        dir="auto"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">{text.length} حرف</span>
        <Button
          variant="primary"
          size="md"
          onClick={() => { void onSubmit([text], text); }}
          disabled={submitting || !text.trim() || text.length < 10}
        >
          {submitting ? "جاري الإرسال..." : "تأكيد"}
        </Button>
      </div>
    </div>
  );
}

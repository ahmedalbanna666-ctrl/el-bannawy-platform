"use client";

import { useState, type ReactNode } from "react";
import type { ActivityConfig } from "./activity-renderer";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

interface SpeakingProps {
  readonly config: ActivityConfig;
  readonly onSubmit: (answers: string[], response?: string) => Promise<void>;
  readonly submitted: boolean;
  readonly submitting: boolean;
}

export function SpeakingActivity({ config, onSubmit, submitted, submitting }: SpeakingProps): ReactNode {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);

  if (submitted) return null;

  return (
    <div className="space-y-4">
      {config.question && (
        <p className="rounded-lg bg-neutral-800/50 p-4 text-lg font-medium text-white">
          {config.question}
        </p>
      )}
      <div className="flex flex-col items-center gap-4 py-6">
        <button
          type="button"
          onClick={() => { setRecording(!recording); }}
          className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
            recording ? "bg-danger-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]" : "bg-primary-500 hover:bg-primary-600"
          }`}
        >
          {recording ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
        </button>
        <p className="text-sm text-neutral-400">
          {recording ? "جاري التسجيل... اضغط للإيقاف" : "اضغط لبدء التسجيل"}
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); }}
        placeholder="أو اكتب إجابتك هنا..."
        className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-primary-400"
        rows={3}
        dir="auto"
      />
      <Button
        variant="primary"
        size="md"
        onClick={() => { void onSubmit([text]); }}
        disabled={submitting || !text.trim()}
      >
        {submitting ? "جاري الإرسال..." : "تأكيد"}
      </Button>
    </div>
  );
}

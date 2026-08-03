"use client";

import { useState, type ReactNode } from "react";
import type { ActivityConfig } from "./activity-renderer";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from "lucide-react";

interface ConversationProps {
  readonly config: ActivityConfig;
  readonly onSubmit: (answers: string[], response?: string) => Promise<void>;
  readonly submitted: boolean;
  readonly submitting: boolean;
}

export function ConversationActivity({
  config,
  onSubmit,
  submitted,
  submitting,
}: ConversationProps): ReactNode {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  if (submitted) return null;

  const addMessage = (): void => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, text]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      {config.question && (
        <div className="flex items-start gap-2 rounded-xl border border-primary-500/30 bg-primary-500/5 p-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-neutral-800 dark:text-neutral-200">
            {config.question}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
              ابدأ المحادثة بإرسال ردك الأول...
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary-500 px-4 py-2.5 text-sm text-white shadow-sm">
                {msg}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") addMessage(); }}
          placeholder="اكتب ردك..."
          dir="auto"
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
        />
        <Button variant="primary" size="md" onClick={addMessage} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
          إرسال
        </Button>
      </div>

      {messages.length > 0 && (
        <Button
          variant="primary"
          size="md"
          onClick={() => { void onSubmit(messages, JSON.stringify(messages)); }}
          disabled={submitting}
        >
          {submitting ? "جاري الإرسال..." : "إنهاء المحادثة"}
        </Button>
      )}
    </div>
  );
}

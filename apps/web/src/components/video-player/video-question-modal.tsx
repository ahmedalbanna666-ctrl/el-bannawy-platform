"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import type { QuestionData, VideoEvent } from "./types";

interface VideoQuestionModalProps {
  readonly event: VideoEvent;
  readonly question: QuestionData;
  readonly onComplete: (resume: boolean) => void;
  readonly onSkip: () => void;
}

interface AnswerResult {
  readonly questionId: string;
  readonly correct: boolean;
  readonly score: number;
  readonly maxScore: number;
  readonly message: string | null;
}

export function VideoQuestionModal({ event, question, onComplete, onSkip }: VideoQuestionModalProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const handleSelect = useCallback((id: string): void => {
    if (result) return;
    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      setSelectedIds([id]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }
  }, [question.type, result]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    setSubmitting(true);
    try {
      const res = await api.post<AnswerResult>("/video-questions/answer", {
        questionId: question.id,
        selectedOptionIds: selectedIds,
        text: question.type === "FILL_BLANK" ? textAnswer : undefined,
      });
      const answerResult = res.data;
      if (!answerResult) { throw new Error("No data"); }
      setResult(answerResult);
    } catch {
      setResult({ questionId: question.id, correct: false, score: 0, maxScore: 1, message: "فشل الاتصال" });
    }
    setSubmitting(false);
  }, [question.id, question.type, selectedIds, textAnswer]);

  const handleRetry = useCallback((): void => {
    setResult(null);
    setSelectedIds([]);
    setTextAnswer("");
  }, []);

  const handleContinue = useCallback((): void => {
    if (event.required && !result?.correct) {
      handleRetry();
      return;
    }
    onComplete(result?.correct ?? false);
  }, [event.required, result, onComplete, handleRetry]);

  const isCorrect = result?.correct ?? false;
  const showContinue = !event.required || isCorrect;
  const canSubmit = question.type === "FILL_BLANK" ? textAnswer.trim().length > 0 : selectedIds.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !event.required) {
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return (): void => { window.removeEventListener("keydown", onKey); };
  }, [event.required, onSkip]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-neutral-900/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-neutral-800 max-h-[85%] [animation:question-bounce-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
        <style>{`
          @keyframes question-bounce-in {
            0% { opacity: 0; transform: scale(0.9) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes question-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `}</style>

        {/* Header */}
        <div className="relative bg-gradient-to-l from-amber-500 to-amber-600 px-5 pb-4 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 id="question-modal-title" className="text-sm font-bold text-white">سؤال مفاجئ</h2>
              <p className="text-[11px] text-amber-100">جاوب عشان الفيديو يكمل</p>
            </div>
          </div>
          {event.required && (
            <div className="absolute left-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              مطلوب
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          <h3 className="mt-3.5 text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100">
            {question.title}
          </h3>
          {question.instructions && (
            <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {question.instructions}
            </p>
          )}

          {/* Result */}
          {result && (
            <div aria-live="polite" className={`mt-3.5 overflow-hidden rounded-xl ${isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"}`}
              style={isCorrect ? {} : { animation: "question-shake 0.4s ease" }}>
              <div className="flex items-center gap-2.5 p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isCorrect ? "bg-emerald-500" : "bg-red-500"
                }`}>
                  {isCorrect ? (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-bold ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    {isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}
                  </p>
                  {result.message && result.message !== "Correct" && result.message !== "Incorrect" && (
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{result.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          {!result && (
            <div className="mt-4">
              {question.type === "FILL_BLANK" ? (
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e): void => { setTextAnswer(e.target.value); }}
                  onKeyDown={(e): void => { if (e.key === "Enter" && canSubmit) { void handleSubmit(); } }}
                  placeholder="اكتب إجابتك هنا..."
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-100"
                  autoFocus
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {question.options.map((opt) => {
                    const isSelected = selectedIds.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={(): void => { handleSelect(opt.id); }}
                        className={`group rounded-xl border-2 px-3 py-2.5 text-right text-sm font-medium transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-500/10 dark:text-amber-300"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-amber-300 hover:bg-amber-50/50 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-neutral-300 text-neutral-400 group-hover:border-amber-400 dark:border-neutral-500 dark:text-neutral-500"
                          }`}>
                            {String(question.options.indexOf(opt) + 1)}
                          </div>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          {isSelected && (
                            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3.5 dark:border-neutral-700">
            {!event.required && !result && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-lg px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                تخطي
              </button>
            )}
            {!event.required && !result && <div />}

            {result ? (
              <button
                type="button"
                onClick={handleContinue}
                className={`rounded-lg px-5 py-2 text-sm font-bold text-black transition-all ${
                  showContinue
                    ? "bg-amber-500 hover:bg-amber-400"
                    : "bg-red-500 hover:bg-red-400"
                }`}
              >
                {showContinue ? "متابعة" : "حاول مجدداً"}
              </button>
            ) : (
              <button
                type="button"
                onClick={(): void => { void handleSubmit(); }}
                disabled={!canSubmit || submitting}
                className="mr-auto rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    جاري التحقق...
                  </span>
                ) : "تأكيد الإجابة"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

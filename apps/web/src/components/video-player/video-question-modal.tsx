"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
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

/** How long to show the "إجابة صحيحة" feedback before auto-resuming the video. */
const AUTO_RESUME_DELAY_MS = 900;
/** Debounce window for fill-in-the-blank real-time checking. */
const FILL_BLANK_DEBOUNCE_MS = 700;

/** Question types that are graded by a single tap. */
const SINGLE_TAP_TYPES = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE", "MATCHING", "ORDERING"]);

export function VideoQuestionModal({ event, question, onComplete, onSkip }: VideoQuestionModalProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const autoResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillBlankTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submitAnswer = useCallback(async (ids: readonly string[], textOverride?: string): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    const finalText = textOverride ?? textAnswer;
    try {
      const res = await api.post<AnswerResult>("/video-questions/answer", {
        questionId: question.id,
        selectedOptionIds: ids,
        text: question.type === "FILL_BLANK" ? finalText : undefined,
      });
      const answerResult = res.data;
      if (!answerResult) { throw new Error("No data"); }
      setResult(answerResult);
      // Correct answer → resume the video automatically after showing feedback.
      if (answerResult.correct) {
        autoResumeTimerRef.current = setTimeout((): void => { onComplete(true); }, AUTO_RESUME_DELAY_MS);
      }
    } catch {
      setResult({ questionId: question.id, correct: false, score: 0, maxScore: 1, message: "فشل الاتصال" });
    }
    setSubmitting(false);
  }, [question.id, question.type, textAnswer, submitting, onComplete]);

  const handleSelect = useCallback((id: string): void => {
    if (result || submitting) return;

    if (SINGLE_TAP_TYPES.has(question.type)) {
      // Immediate grading: tapping an option grades it right away.
      setSelectedIds([id]);
      void submitAnswer([id]);
      return;
    }

    if (question.type === "MULTIPLE_SELECT") {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      setSelectedIds(next);
      // Real-time grading: every selection change re-submits automatically.
      void submitAnswer(next);
      return;
    }
  }, [question.type, result, submitting, selectedIds, submitAnswer]);

  const handleTextChange = useCallback((value: string): void => {
    if (result) return;
    setTextAnswer(value);
    if (value.trim().length === 0) {
      if (fillBlankTimerRef.current) clearTimeout(fillBlankTimerRef.current);
      return;
    }
    // Debounce so we don't spam the API on every keystroke.
    if (fillBlankTimerRef.current) clearTimeout(fillBlankTimerRef.current);
    fillBlankTimerRef.current = setTimeout((): void => {
      void submitAnswer([], value);
    }, FILL_BLANK_DEBOUNCE_MS);
  }, [result, submitAnswer]);

  const handleRetry = useCallback((): void => {
    if (autoResumeTimerRef.current) { clearTimeout(autoResumeTimerRef.current); autoResumeTimerRef.current = null; }
    if (fillBlankTimerRef.current) { clearTimeout(fillBlankTimerRef.current); fillBlankTimerRef.current = null; }
    setResult(null);
    setSelectedIds([]);
    setTextAnswer("");
  }, []);

  const handleContinue = useCallback((): void => {
    if (autoResumeTimerRef.current) { clearTimeout(autoResumeTimerRef.current); autoResumeTimerRef.current = null; }
    if (fillBlankTimerRef.current) { clearTimeout(fillBlankTimerRef.current); fillBlankTimerRef.current = null; }
    if (event.required && !result?.correct) {
      handleRetry();
      return;
    }
    onComplete(result?.correct ?? false);
  }, [event.required, result, onComplete, handleRetry]);

  const isCorrect = result?.correct ?? false;
  const showContinue = !event.required || isCorrect;

  useEffect(() => {
    return (): void => {
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      if (fillBlankTimerRef.current) clearTimeout(fillBlankTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !event.required) {
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return (): void => { window.removeEventListener("keydown", onKey); };
  }, [event.required, onSkip]);

  const isTextType = question.type === "FILL_BLANK";
  const showAnswerOptions = question.type === "MULTIPLE_SELECT" || question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE";

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="question-modal"
      aria-labelledby="question-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 [animation:question-pop_0.3s_ease-out]"
      style={{ background: "radial-gradient(ellipse at center, rgba(120,20,160,0.35) 0%, rgba(5,5,15,0.85) 70%)" }}
    >
      <style>{`
        @keyframes question-pop {
          0% { opacity: 0; transform: scale(0.7); }
          60% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes question-bolt-flash {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.12); }
        }
        @keyframes question-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes question-glow-pulse {
          0%, 100% { box-shadow: 0 0 22px 4px rgba(168,85,247,0.35); }
          50% { box-shadow: 0 0 40px 12px rgba(168,85,247,0.55); }
        }
        @keyframes question-typing {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-purple-500/30 bg-neutral-950 text-white [animation:question-glow-pulse_1.6s_ease-in-out_infinite] max-h-[85%] overflow-y-auto"
        style={{ animation: "question-pop 0.3s ease-out, question-glow-pulse 1.6s ease-in-out infinite" }}
      >
        {/* Surprise header */}
        <div className="relative bg-gradient-to-br from-purple-700 via-fuchsia-700 to-amber-500 px-5 pb-5 pt-6">
          {/* Decorative burst lines */}
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-16 w-0.5 origin-bottom -translate-x-1/2 -translate-y-1/2 bg-white/50"
                style={{ transform: `translate(-50%,-50%) rotate(${String(i * 30)}deg)` }}
              />
            ))}
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-neutral-900 shadow-[0_0_24px_rgba(251,191,36,0.6)]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" style={{ animation: "question-bolt-flash 0.9s ease-in-out infinite" }}>
                <path d="M13 2L3 14h7v8l11-14h-7V2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="question-modal-title" className="text-xl font-black tracking-wide">
                سؤال مفاجئ!
              </h2>
              <p className="text-xs text-purple-100/90">ركّز جيداً… واجهة الفيديو متوقفة مؤقتاً</p>
            </div>
            {event.required && (
              <span className="absolute right-3 top-3 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-bold text-white">
                مطلوب
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          <h3 className="mt-4 text-base font-bold leading-snug text-white">
            {question.title}
          </h3>
          {question.instructions && (
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              {question.instructions}
            </p>
          )}

          {/* Result */}
          {result && (
            <div
              aria-live="polite"
              className={`mt-4 overflow-hidden rounded-2xl border ${isCorrect ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}
              style={isCorrect ? {} : { animation: "question-shake 0.4s ease" }}
            >
              <div className="flex items-center gap-3 p-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isCorrect ? "bg-emerald-500" : "bg-red-500"
                } shadow-lg`}>
                  {isCorrect ? (
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-bold ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                    {isCorrect ? "إجابة صحيحة!" : "إجابة خاطئة"}
                  </p>
                  {result.message && result.message !== "Correct" && result.message !== "Incorrect" && (
                    <p className="mt-0.5 text-xs text-neutral-400">{result.message}</p>
                  )}
                  {!isCorrect && question.type !== "MULTIPLE_SELECT" && (
                    <p className="mt-0.5 text-[11px] text-neutral-500">حاول مجدداً</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          {!result && (
            <div className="mt-4">
              {isTextType ? (
                <div>
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e): void => { handleTextChange(e.target.value); }}
                    placeholder="اكتب إجابتك هنا..."
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition-all placeholder:text-neutral-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    autoFocus
                  />
                  {submitting && textAnswer.trim().length > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400" style={{ animation: "question-typing 0.8s ease-in-out infinite" }}>
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      جاري التحقق تلقائياً...
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-neutral-500">الإجابة تُصحَّح تلقائياً أثناء الكتابة</p>
                </div>
              ) : showAnswerOptions ? (
                <div className="grid grid-cols-2 gap-2">
                  {question.options.map((opt) => {
                    const isSelected = selectedIds.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={(): void => { handleSelect(opt.id); }}
                        className={`group rounded-xl border-2 px-3 py-3 text-right text-sm font-medium transition-all ${
                          isSelected
                            ? "border-amber-400 bg-amber-500/15 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)]"
                            : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-amber-500/60 hover:bg-amber-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all ${
                            isSelected
                              ? "border-amber-400 bg-amber-400 text-neutral-900"
                              : "border-neutral-600 text-neutral-400 group-hover:border-amber-400"
                          }`}>
                            {String(question.options.indexOf(opt) + 1)}
                          </div>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          {isSelected && (
                            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {question.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(): void => { handleSelect(opt.id); }}
                      className={`rounded-xl border-2 px-4 py-3 text-right text-sm font-medium transition-all ${
                        selectedIds.includes(opt.id)
                          ? "border-amber-400 bg-amber-500/15 text-amber-300"
                          : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-amber-500/60"
                      }`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}

              {question.type === "MULTIPLE_SELECT" && (
                <p className="mt-2 text-[11px] text-neutral-500">
                  اختر كل الإجابات الصحيحة — تُصحَّح تلقائياً أثناء الاختيار
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3.5">
            {!event.required && !result && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-lg px-3 py-2 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-300"
              >
                تخطي
              </button>
            )}
            {!event.required && !result && <div />}

            {result ? (
              <button
                type="button"
                onClick={handleContinue}
                className={`rounded-lg px-6 py-2.5 text-sm font-bold text-black transition-all ${
                  showContinue
                    ? "bg-amber-400 hover:bg-amber-300"
                    : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {showContinue ? "متابعة" : "حاول مجدداً"}
              </button>
            ) : (
              <div className="mr-auto text-[11px] font-medium text-neutral-500">
                {submitting ? "جاري التحقق..." : "الإجابة تُصحَّح تلقائياً"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

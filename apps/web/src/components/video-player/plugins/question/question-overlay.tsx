"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { usePlayerContext } from "../../use-playback-engine";
import type { QuestionData, QuestionResult } from "./types";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface QuestionOverlayProps {
  readonly question: QuestionData;
  readonly onDismiss: () => void;
}

export function QuestionOverlay({ question, onDismiss }: QuestionOverlayProps): ReactNode {
  const { pause, play } = usePlayerContext();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pause();
  }, [pause]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!selectedOptionId) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post("/video-questions/answer", {
        questionId: question.id,
        selectedOptionIds: [selectedOptionId],
      });

      const answerResult = (response as { data: unknown }).data as QuestionResult;

      setResult(answerResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  }, [question.id, selectedOptionId]);

  const handleDismiss = useCallback((): void => {
    play();
    onDismiss();
  }, [play, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {question.title}
          </h3>
          {question.instructions && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {question.instructions}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {question.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const showCorrect = result !== null && option.id === selectedOptionId && result.correct;
            const showWrong = result !== null && isSelected && !result.correct;

            return (
              <button
                key={option.id}
                type="button"
                disabled={result !== null}
                onClick={(): void => { setSelectedOptionId(option.id); }}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left text-sm font-medium transition-all ${
                  showCorrect
                    ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                    : showWrong
                      ? "border-danger-500 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400"
                      : isSelected
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-primary-600"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    showCorrect
                      ? "border-success-500 bg-success-500 text-white"
                      : showWrong
                        ? "border-danger-500 bg-danger-500 text-white"
                        : isSelected
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  {showCorrect ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : showWrong ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : isSelected ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : null}
                </span>
                {option.text}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {result && (
            <div className="flex items-center gap-2">
              {result.correct ? (
                <span className="flex items-center gap-1 text-sm font-medium text-success-600 dark:text-success-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.message ?? "Correct"}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-medium text-danger-600 dark:text-danger-400">
                  <XCircle className="h-4 w-4" />
                  {result.message ?? "Incorrect"}
                </span>
              )}
            </div>
          )}

          {error && (
            <span className="flex items-center gap-1 text-sm font-medium text-danger-600 dark:text-danger-400">
              <XCircle className="h-4 w-4" />
              {error}
            </span>
          )}

          <div className="flex-1" />

          {result?.correct ? (
            <Button variant="primary" size="sm" onClick={handleDismiss}>
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedOptionId || submitting}
              loading={submitting}
              onClick={(): void => { void handleSubmit(); }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

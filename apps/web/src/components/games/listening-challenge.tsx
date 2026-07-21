"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePronunciation } from "@/lib/use-pronunciation";
import {
  useCurriculumUnits,
  useUnitVocabulary,
} from "@/lib/games/use-games-data";
import { useGameSettings } from "@/lib/games/settings";
import {
  buildListeningQuestions,
  distinctTranslationCount,
} from "@/lib/games/question-engine";
import type { ListeningQuestion } from "@/lib/games/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UnitMapSelect } from "@/components/games/unit-map-select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  RotateCcw,
  ChevronLeft,
  Sparkles,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

type Phase = "select" | "playing" | "result";

interface ListeningChallengeProps {
  unitId?: string;
}

export function ListeningChallenge({
  unitId: forcedUnitId,
}: ListeningChallengeProps): ReactNode {
  const { settings } = useGameSettings();
  const { speak, isSpeaking, isSupported } = usePronunciation();
  const { data: units, isLoading, isError, refetch } = useCurriculumUnits();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    forcedUnitId ?? null,
  );
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [replaysLeft, setReplaysLeft] = useState(settings.listeningChallenge.replayLimit);

  const selectedUnit = useMemo(
    () => units?.find((unit) => unit.id === selectedUnitId) ?? null,
    [units, selectedUnitId],
  );

  const {
    data: pool,
    isLoading: poolLoading,
    isError: poolError,
    refetch: refetchPool,
  } = useUnitVocabulary(selectedUnitId ?? "", selectedUnit?.lessonIds ?? []);

  const canStart = useMemo(() => {
    if (!selectedUnit || !pool) return false;
    if (pool.length === 0) return false;
    return distinctTranslationCount(pool) >= 4;
  }, [selectedUnit, pool]);

  const startGame = useCallback((): void => {
    if (!pool || !canStart) return;
    const generated = buildListeningQuestions(
      pool,
      settings.listeningChallenge.questionsPerRound,
    );
    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
    setReplaysLeft(settings.listeningChallenge.replayLimit);
    setPhase("playing");
  }, [pool, canStart, settings]);

  const current = questions[currentIndex] as ListeningQuestion | undefined;
  const isLast = currentIndex === questions.length - 1;

  const speakCurrent = useCallback((): void => {
    if (current) speak(current.word, "lc-current");
  }, [current, speak]);

  const handleReplay = useCallback((): void => {
    if (replaysLeft <= 0 || !current) return;
    setReplaysLeft((prev) => prev - 1);
    speakCurrent();
  }, [replaysLeft, current, speakCurrent]);

  const handleSelect = useCallback(
    (option: string): void => {
      if (answered || !current) return;
      setSelectedOption(option);
      setAnswered(true);
      if (option === current.correctTranslation) {
        setScore((prev) => prev + 1);
      }
    },
    [answered, current],
  );

  const handleNext = useCallback((): void => {
    if (isLast) {
      setPhase("result");
      return;
    }
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setSelectedOption(null);
    setAnswered(false);
    setReplaysLeft(settings.listeningChallenge.replayLimit);
  }, [isLast, currentIndex, settings.listeningChallenge.replayLimit]);

  const restart = useCallback((): void => {
    if (!pool) return;
    const generated = buildListeningQuestions(
      pool,
      settings.listeningChallenge.questionsPerRound,
    );
    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
    setReplaysLeft(settings.listeningChallenge.replayLimit);
    setPhase("playing");
  }, [pool, settings]);

  useEffect(() => {
    if (phase === "playing" && current) {
      speakCurrent();
    }
  }, [phase, currentIndex, current, speakCurrent]);

  if (phase === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <Volume2 className="h-7 w-7 text-primary-500" />
            تحدي الاستماع والنطق
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            اختر الوحدة التي تريد التحدي بكلماتها، ثم استمع للكلمة واختر معناها الصحيح.
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="تعذر تحميل الوحدات"
            description="حدث خطأ أثناء تحميل المنهج"
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && units?.length === 0 && (
          <EmptyState
            title="لا يوجد منهج متاح"
            description="يتم إنشاء محتوى المنهج حالياً"
            icon={<BookOpen className="h-16 w-16" />}
          />
        )}

        {!isLoading && !isError && units && units.length > 0 && (
          <>
            <UnitMapSelect
              units={units}
              selectedId={selectedUnitId}
              onSelect={(id) => {
                setSelectedUnitId(id);
                void refetchPool();
              }}
            />

            {selectedUnit && poolLoading && (
              <p className="text-sm text-neutral-500">جاري تحميل كلمات الوحدة...</p>
            )}

            {selectedUnit && poolError && (
              <ErrorState
                title="تعذر تحميل الكلمات"
                description="حدث خطأ أثناء تحميل مفردات الوحدة"
                onRetry={() => void refetchPool()}
              />
            )}

            {selectedUnit && pool && !canStart && (
              <div className="flex items-center gap-2 rounded-xl bg-warning-500/10 p-3 text-sm text-warning-600 dark:text-warning-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                هذه الوحدة لا تحتوي على عدد كافٍ من الكلمات المميزة (مطلوب 4 على الأقل).
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canStart || poolLoading}
              onClick={startGame}
            >
              <Sparkles className="h-5 w-5" />
              ابدأ التحدي
            </Button>
          </>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const total = questions.length;
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card variant="outline" padding="lg">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <Trophy className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              أحسنت!
            </h2>
            <p className="text-sm text-neutral-500">
              أكملت تحدي الاستماع والنطق
            </p>
            <div className="grid w-full grid-cols-3 gap-3">
              <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
                <p className="text-2xl font-black text-primary-500">{score}</p>
                <p className="text-[11px] text-neutral-500">إجابات صحيحة</p>
              </div>
              <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
                <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  {total}
                </p>
                <p className="text-[11px] text-neutral-500">إجمالي الأسئلة</p>
              </div>
              <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
                <p className="text-2xl font-black text-success-500">{accuracy}%</p>
                <p className="text-[11px] text-neutral-500">الدقة</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button variant="primary" fullWidth onClick={restart}>
                <RotateCcw className="h-4 w-4" />
                العب مرة أخرى
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setPhase("select");
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                اختر وحدة أخرى
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setPhase("select");
          }}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ChevronLeft className="h-4 w-4" />
          إنهاء
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          <Trophy className="h-4 w-4 text-amber-500" />
          {score} / {questions.length}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-300"
          style={{
            width: `${String(((currentIndex + (answered ? 1 : 0)) / questions.length) * 100)}%`,
          }}
        />
      </div>

      <p className="text-center text-sm text-neutral-500">
        سؤال {currentIndex + 1} من {questions.length}
      </p>

      <Card variant="outline" padding="lg">
        <CardContent className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleReplay}
            disabled={replaysLeft <= 0 || !isSupported}
            aria-label="إعادة تشغيل النطق"
            className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-200 ${
              isSpeaking("lc-current")
                ? "scale-105 bg-primary-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                : "bg-primary-500/10 text-primary-500 hover:bg-primary-500/20"
            } ${replaysLeft <= 0 || !isSupported ? "cursor-not-allowed opacity-40" : ""}`}
          >
            <Volume2 className="h-10 w-10" />
          </button>

          <p className="text-sm text-neutral-500">استمع واختر المعنى الصحيح</p>

          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
            <Volume2 className="h-3.5 w-3.5" />
            {isSupported
              ? `يمكنك إعادة التشغيل ${String(replaysLeft)} مرة أخرى`
              : "المتصفح لا يدعم تشغيل الصوت"}
          </div>

          {answered && (
            <div
              className={`flex w-full items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
                selectedOption === current.correctTranslation
                  ? "bg-success-500/10 text-success-600"
                  : "bg-danger-500/10 text-danger-600"
              }`}
            >
              {selectedOption === current.correctTranslation ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span dir="ltr" className="font-bold">
                {current.word}
              </span>
              <span>— {current.correctTranslation}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {current.options.map((option) => {
          const isCorrect = option === current.correctTranslation;
          const isSelected = option === selectedOption;
          let tone =
            "border-neutral-200 bg-white hover:border-primary-500/40 dark:border-neutral-700 dark:bg-neutral-900/40";
          if (answered) {
            if (isCorrect) {
              tone = "border-success-500 bg-success-500/10 text-success-700 dark:text-success-300";
            } else if (isSelected) {
              tone = "border-danger-500 bg-danger-500/10 text-danger-700 dark:text-danger-300";
            } else {
              tone = "border-neutral-200 bg-white opacity-60 dark:border-neutral-700 dark:bg-neutral-900/40";
            }
          }
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => {
                handleSelect(option);
              }}
              className={`rounded-2xl border-2 p-4 text-center text-base font-bold transition-all duration-200 ${tone}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <Button variant="primary" fullWidth onClick={handleNext}>
          {isLast ? "عرض النتيجة" : "التالي"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

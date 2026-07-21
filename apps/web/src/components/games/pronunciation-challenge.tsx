"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurriculumUnits, useUnitVocabulary } from "@/lib/games/use-games-data";
import { useGameSettings } from "@/lib/games/settings";
import { pickWordPairs, pronunciationScore } from "@/lib/games/question-engine";
import type { PronunciationQuestion } from "@/lib/games/types";
import { useSpeechRecognition } from "@/lib/games/use-speech-recognition";
import { UnitMapSelect } from "@/components/games/unit-map-select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Mic,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  RotateCcw,
  ChevronLeft,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Award,
  Coins,
} from "lucide-react";

type Phase = "select" | "playing" | "result";

interface PronunciationChallengeProps {
  unitId?: string;
}

export function PronunciationChallenge({
  unitId: forcedUnitId,
}: PronunciationChallengeProps): ReactNode {
  const { settings } = useGameSettings();
  const {
    supported,
    listening,
    transcript,
    finalTranscript,
    error: speechError,
    start,
    stop,
    reset,
  } = useSpeechRecognition();
  const { data: units, isLoading, isError, refetch } = useCurriculumUnits();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    forcedUnitId ?? null,
  );
  const [questions, setQuestions] = useState<PronunciationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptScore, setAttemptScore] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [rewardsXp, setRewardsXp] = useState(0);
  const [rewardsCoins, setRewardsCoins] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const safeUnits = units ?? [];
  const selectedUnit = useMemo(
    () => safeUnits.find((unit) => unit.id === selectedUnitId) ?? null,
    [safeUnits, selectedUnitId],
  );

  const {
    data: pool,
    isLoading: poolLoading,
    isError: poolError,
    refetch: refetchPool,
  } = useUnitVocabulary(selectedUnitId ?? "", selectedUnit?.lessonIds ?? []);

  const config = settings.pronunciationChallenge;
  const canStart = useMemo(() => {
    if (!selectedUnit || !pool) return false;
    return pool.length > 0;
  }, [selectedUnit, pool]);

  const startGame = useCallback((): void => {
    if (!pool || !canStart) return;
    const generated = pickWordPairs(pool, config.questionsPerRound);
    setQuestions(generated);
    setCurrentIndex(0);
    setAttemptScore(null);
    setAnswered(false);
    setRewardsXp(0);
    setRewardsCoins(0);
    setTotalScore(0);
    setResolvedCount(0);
    setPhase("playing");
  }, [pool, canStart, config]);

  const current = questions[currentIndex] as PronunciationQuestion | undefined;
  const isLast = currentIndex === questions.length - 1;

  useEffect(() => {
    if (finalTranscript && !listening && attemptScore === null && current) {
      const score = pronunciationScore(current.word, finalTranscript);
      setAttemptScore(score);
      setAnswered(true);
      setTotalScore((prev) => prev + score);
      setResolvedCount((prev) => prev + 1);
      if (score >= config.threshold) {
        setRewardsXp((prev) => prev + config.xpReward);
        setRewardsCoins((prev) => prev + config.coinReward);
      }
    }
  }, [finalTranscript, listening, attemptScore, current, config]);

  const handleSpeak = useCallback((): void => {
    reset();
    setAttemptScore(null);
    setAnswered(false);
    start();
  }, [reset, start]);

  const handleNext = useCallback((): void => {
    reset();
    setAttemptScore(null);
    setAnswered(false);
    if (isLast) {
      setPhase("result");
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }, [reset, isLast]);

  const restart = useCallback((): void => {
    if (!pool) return;
    const generated = pickWordPairs(pool, config.questionsPerRound);
    setQuestions(generated);
    setCurrentIndex(0);
    setAttemptScore(null);
    setAnswered(false);
    setRewardsXp(0);
    setRewardsCoins(0);
    setTotalScore(0);
    setResolvedCount(0);
    setPhase("playing");
  }, [pool, config]);

  if (phase === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <Mic className="h-7 w-7 text-primary-500" />
            تحدي النطق
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            اختر الوحدة، ثم انطق الكلمة الظاهرة أمامك. كلما زادت دقتك، زادت مكافاتك.
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

        {!isLoading && !isError && safeUnits.length === 0 && (
          <EmptyState
            title="لا يوجد منهج متاح"
            description="يتم إنشاء محتوى المنهج حالياً"
            icon={<BookOpen className="h-16 w-16" />}
          />
        )}

        {!isLoading && !isError && safeUnits.length > 0 && (
          <>
            <UnitMapSelect
              units={safeUnits}
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
                هذه الوحدة لا تحتوي على كلمات كافية.
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
    const accuracy =
      resolvedCount > 0 ? Math.round((totalScore / resolvedCount) * 100) : 0;
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
              أكملت تحدي النطق
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
                <p className="text-2xl font-black text-primary-500">
                  {String(resolvedCount)}
                </p>
                <p className="text-[11px] text-neutral-500">كلمات مكتملة</p>
              </div>
              <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
                <p className="text-2xl font-black text-success-500">
                  {String(accuracy)}%
                </p>
                <p className="text-[11px] text-neutral-500">متوسط الدقة</p>
              </div>
            </div>

            <div className="flex w-full items-center justify-center gap-4 rounded-xl bg-amber-500/10 p-3 text-sm font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Award className="h-4 w-4" />
                +{String(rewardsXp)} XP
              </span>
              <span className="flex items-center gap-1">
                <Coins className="h-4 w-4" />
                +{String(rewardsCoins)} عملة
              </span>
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

  const passed = attemptScore !== null && attemptScore >= config.threshold;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (listening) stop();
            reset();
            setPhase("select");
          }}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ChevronLeft className="h-4 w-4" />
          إنهاء
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          <Award className="h-4 w-4 text-amber-500" />
          {String(rewardsXp)} XP
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
        سؤال {String(currentIndex + 1)} من {String(questions.length)}
      </p>

      <Card variant="outline" padding="lg">
        <CardContent className="flex flex-col items-center gap-4">
          <p
            dir="ltr"
            className="text-4xl font-black tracking-wide text-neutral-900 dark:text-neutral-100"
          >
            {current.word}
          </p>
          <p className="text-center text-xs text-neutral-400">
            حد الأدنى للنجاح {String(config.threshold)}%
          </p>

          <button
            type="button"
            onClick={handleSpeak}
            disabled={listening || !supported}
            aria-label="انطق الكلمة"
            className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-200 ${
              listening
                ? "scale-105 bg-danger-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                : "bg-primary-500/10 text-primary-500 hover:bg-primary-500/20"
            } ${!supported || listening ? "cursor-not-allowed" : ""}`}
          >
            <Mic className="h-10 w-10" />
          </button>

          <p className="text-sm text-neutral-500">
            {listening
              ? "يتنصت..."
              : supported
                ? "اضغط وانطق الكلمة بوضوح"
                : "المتصفح لا يدعم التعرف على الصوت"}
          </p>

          {speechError && (
            <p className="text-xs text-danger-500">{speechError}</p>
          )}

          {transcript && (
            <p dir="ltr" className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {transcript}
            </p>
          )}

          {answered && attemptScore !== null && (
            <div
              className={`flex w-full items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
                passed
                  ? "bg-success-500/10 text-success-600"
                  : "bg-danger-500/10 text-danger-600"
              }`}
            >
              {passed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>دقتك: {String(attemptScore)}%</span>
              {passed && (
                <span className="mr-auto flex items-center gap-3 font-bold">
                  <span className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    +{String(config.xpReward)} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" />
                    +{String(config.coinReward)}
                  </span>
                </span>
              )}
            </div>
          )}

          {answered && passed && (
            <div className="w-full rounded-xl bg-primary-500/10 p-3 text-center text-sm font-bold text-primary-700 dark:text-primary-300">
              المعنى: {current.translation}
            </div>
          )}
        </CardContent>
      </Card>

      {answered && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {!passed && (
            <Button variant="outline" fullWidth onClick={handleSpeak}>
              <Mic className="h-4 w-4" />
              حاول مرة أخرى
            </Button>
          )}
          <Button variant="primary" fullWidth onClick={handleNext}>
            {isLast ? "عرض النتيجة" : "التالي"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

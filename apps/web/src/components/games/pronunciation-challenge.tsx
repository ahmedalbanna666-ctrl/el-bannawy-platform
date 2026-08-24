"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurriculumUnits, useUnitVocabulary } from "@/lib/games/use-games-data";
import { useGameSettings } from "@/lib/games/settings";
import { pickWordPairs } from "@/lib/games/question-engine";
import type { GameWord, PronunciationQuestion } from "@/lib/games/types";
import { useAudioRecorder } from "@/lib/games/use-audio-recorder";
import { assessPronunciation } from "@/lib/games/pronunciation-api";
import type {
  PronunciationAssessmentResult,
  WordAssessment,
} from "@/lib/games/pronunciation-types";
import { UnitMapSelect } from "@/components/games/unit-map-select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Mic,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trophy,
  RotateCcw,
  ChevronLeft,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Award,
  Coins,
  MicOff,
  Volume2,
  Loader2,
} from "lucide-react";

type Phase = "select" | "playing" | "result";

interface PronunciationChallengeProps {
  unitId?: string;
  /** When provided (lesson games mode), the challenge runs on these words directly and skips unit selection. */
  words?: readonly GameWord[];
}

function useSpeak(): (text: string) => void {
  return useCallback((text: string): void => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-success-600 dark:text-success-400";
  if (score >= 60) return "text-warning-600 dark:text-warning-400";
  return "text-danger-600 dark:text-danger-400";
}

function AspectBar({ label, value }: { label: string; value: number }): ReactNode {
  return (
    <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
      <p className={`text-xl font-black ${scoreColor(value)}`}>{String(value)}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

export function PronunciationChallenge({
  unitId: forcedUnitId,
  words: lessonWords,
}: PronunciationChallengeProps): ReactNode {
  const { settings } = useGameSettings();
  const recorder = useAudioRecorder();
  const speak = useSpeak();

  const { data: units, isLoading, isError, refetch } = useCurriculumUnits();
  const isLessonMode = lessonWords !== undefined;

  const [phase, setPhase] = useState<Phase>(isLessonMode ? "playing" : "select");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    forcedUnitId ?? null,
  );
  const [questions, setQuestions] = useState<PronunciationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptResult, setAttemptResult] =
    useState<PronunciationAssessmentResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [rewardsXp, setRewardsXp] = useState(0);
  const [rewardsCoins, setRewardsCoins] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const safeUnits = units ?? [];
  const selectedUnit = useMemo(
    () => safeUnits.find((unit) => unit.id === selectedUnitId) ?? null,
    [safeUnits, selectedUnitId],
  );

  const {
    data: unitPool,
    isLoading: poolLoading,
    isError: poolError,
    refetch: refetchPool,
  } = useUnitVocabulary(selectedUnitId ?? "", selectedUnit?.lessonIds ?? []);
  const pool = isLessonMode ? lessonWords : unitPool;

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
    setAttemptResult(null);
    setAssessError(null);
    setAnswered(false);
    setRewardsXp(0);
    setRewardsCoins(0);
    setTotalScore(0);
    setResolvedCount(0);
    setSkippedCount(0);
    setPhase("playing");
  }, [pool, canStart, config]);

  const current = questions[currentIndex] as PronunciationQuestion | undefined;
  const isLast = currentIndex === questions.length - 1;
  const attemptScore = attemptResult ? attemptResult.overallScore : null;

  // Upload the recorded audio to the self-hosted pronunciation engine and
  // store the structured result when recording finishes.
  useEffect(() => {
    if (!recorder.result || attemptResult || !current) return;
    let cancelled = false;
    setUploading(true);
    setAssessError(null);
    assessPronunciation(recorder.result.blob, current.word)
      .then((res) => {
        if (cancelled) return;
        setAttemptResult(res);
        setAnswered(true);
        setTotalScore((prev) => prev + res.overallScore);
        setResolvedCount((prev) => prev + 1);
        if (res.overallScore >= config.threshold) {
          setRewardsXp((prev) => prev + config.xpReward);
          setRewardsCoins((prev) => prev + config.coinReward);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAssessError(err instanceof Error ? err.message : "حدث خطأ أثناء التقييم");
      })
      .finally(() => {
        if (!cancelled) setUploading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, [recorder.result, attemptResult, current, config]);

  const handleSpeak = useCallback((): void => {
    recorder.reset();
    setAttemptResult(null);
    setAssessError(null);
    setAnswered(false);
    void recorder.start();
  }, [recorder]);

  const handleSkip = useCallback((): void => {
    recorder.reset();
    setAttemptResult(null);
    setAssessError(null);
    setAnswered(true);
    setSkippedCount((prev) => prev + 1);
  }, [recorder]);

  const handleNext = useCallback((): void => {
    recorder.reset();
    setAttemptResult(null);
    setAssessError(null);
    setAnswered(false);
    if (isLast) {
      setPhase("result");
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }, [recorder, isLast]);

  const restart = useCallback((): void => {
    if (!pool) return;
    const generated = pickWordPairs(pool, config.questionsPerRound);
    setQuestions(generated);
    setCurrentIndex(0);
    setAttemptResult(null);
    setAssessError(null);
    setAnswered(false);
    setRewardsXp(0);
    setRewardsCoins(0);
    setTotalScore(0);
    setResolvedCount(0);
    setSkippedCount(0);
    setPhase("playing");
  }, [pool, config]);

  // Lesson mode: start the challenge immediately with the lesson's words.
  useEffect(() => {
    if (!isLessonMode || lessonWords.length === 0) return;
    const generated = pickWordPairs(lessonWords, config.questionsPerRound);
    setQuestions(generated);
    setCurrentIndex(0);
    setAttemptResult(null);
    setAssessError(null);
    setAnswered(false);
    setRewardsXp(0);
    setRewardsCoins(0);
    setTotalScore(0);
    setResolvedCount(0);
    setSkippedCount(0);
    setPhase("playing");
  }, [isLessonMode, lessonWords, config.questionsPerRound]);

  if (!config.enabled) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-500">
            <Mic className="h-6 w-6" />
          </span>
          تحدي النطق
        </h1>
        <EmptyState
          title="اللعبة غير مفعّلة"
          description="لم يقم المعلم بتفعيل تحدي النطق حالياً، جرّب لعبة أخرى."
          icon={<BookOpen className="h-16 w-16" />}
        />
      </div>
    );
  }

  if (isLessonMode && lessonWords.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-500">
            <Mic className="h-6 w-6" />
          </span>
          تحدي النطق
        </h1>
        <EmptyState
          title="لا توجد كلمات في هذا الدرس"
          description="أضف مفردات للدرس أولاً لتشغيل تحدي النطق."
          icon={<BookOpen className="h-16 w-16" />}
        />
      </div>
    );
  }

  if (phase === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-500">
              <Mic className="h-6 w-6" />
            </span>
            تحدي النطق
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
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

            {!recorder.supported && (
              <div className="flex items-center gap-2 rounded-xl bg-warning-500/10 p-3 text-sm text-warning-600 dark:text-warning-400">
                <MicOff className="h-4 w-4 shrink-0" />
                متصفحك لا يدعم تسجيل الصوت، يمكنك المرور على الكلمات بدون نطق.
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
        <Card variant="elevated" padding="lg">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning-500/10 text-warning-500">
              <Trophy className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              أحسنت!
            </h2>
            <p className="text-sm text-neutral-500">أكملت تحدي النطق</p>
            <div className="grid w-full grid-cols-3 gap-3">
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
              <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50">
                <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  {String(skippedCount)}
                </p>
                <p className="text-[11px] text-neutral-500">تم المرور عليها</p>
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
              {!isLessonMode && (
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
              )}
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
            if (recorder.recording) recorder.stop();
            recorder.reset();
            setAttemptResult(null);
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
          className="h-full rounded-full bg-gradient-to-r from-warning-500 to-rose-500 transition-all duration-300"
          style={{
            width: `${String(((currentIndex + (answered ? 1 : 0)) / questions.length) * 100)}%`,
          }}
        />
      </div>

      <p className="text-center text-sm text-neutral-500">
        سؤال {String(currentIndex + 1)} من {String(questions.length)}
      </p>

      <Card variant="elevated" padding="lg">
        <CardContent className="flex flex-col items-center gap-4">
          <Badge variant="warning">المفردات</Badge>
          <div className="flex items-center gap-2">
            <p
              dir="ltr"
              className="text-4xl font-black tracking-wide text-neutral-900 dark:text-neutral-100"
            >
              {current.word}
            </p>
            <button
              type="button"
              onClick={() => { speak(current.word); }}
              aria-label="استمع للنطق الصحيح"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 hover:bg-primary-500/20"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-xs text-neutral-400">
            حد الأدنى للنجاح {String(config.threshold)}%
          </p>

          {recorder.supported ? (
            <>
              <button
                type="button"
                onClick={recorder.recording ? recorder.stop : handleSpeak}
                disabled={uploading}
                aria-label="سجّل نطقك"
                className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-500 focus-visible:ring-offset-2 ${
                  recorder.recording
                    ? "scale-105 bg-danger-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                    : "bg-warning-500/10 text-warning-500 hover:bg-warning-500/20"
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
                {recorder.recording && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-danger-400/40" />
                )}
              </button>

              <p className="text-sm text-neutral-500">
                {recorder.recording
                  ? `يُسجّل... ${(recorder.durationMs / 1000).toFixed(1)}s`
                  : uploading
                    ? "جاري التقييم..."
                    : "اضغط وانطق الكلمة بوضوح"}
              </p>

              {recorder.error && (
                <p className="text-xs text-danger-500">{recorder.error}</p>
              )}

              {assessError && (
                <p className="text-xs text-danger-500">{assessError}</p>
              )}

              {recorder.recording && (
                <button
                  type="button"
                  onClick={recorder.stop}
                  className="text-xs font-semibold text-danger-500"
                >
                  إيقاف التسجيل
                </button>
              )}
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning-500/10 text-warning-500">
                <MicOff className="h-9 w-9" />
              </div>
              <p className="text-sm text-neutral-500">
                متصفحك لا يدعم تسجيل الصوت
              </p>
              <p className="rounded-xl bg-neutral-100 p-3 text-sm font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                المعنى: {current.translation}
              </p>
            </div>
          )}

          {answered && attemptResult && (
            <div className="flex w-full flex-col gap-3">
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
                <span>درجتك العامة: {String(attemptScore)}%</span>
                {passed && (
                  <span className="ms-auto flex items-center gap-3 font-bold">
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

              <div className="grid grid-cols-4 gap-2">
                <AspectBar label="الدقة" value={attemptResult.accuracy} />
                <AspectBar label="الطلاقة" value={attemptResult.fluency} />
                <AspectBar label="النبرة" value={attemptResult.prosody} />
                <AspectBar label="الاكتمال" value={attemptResult.completeness} />
              </div>

              {attemptResult.transcript && (
                <p dir="ltr" className="text-center text-sm text-neutral-500">
                  ما سمعه المحرك: {attemptResult.transcript}
                </p>
              )}

              <div className="flex flex-col gap-2">
                {attemptResult.words.map((w: WordAssessment, i: number) => (
                  <div
                    key={`${w.word}-${String(i)}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-700/50"
                  >
                    <div className="flex flex-col">
                      <span dir="ltr" className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                        {w.word}
                      </span>
                      {w.feedback && (
                        <span className="text-[11px] text-neutral-500">{w.feedback}</span>
                      )}
                    </div>
                    <span className={`text-sm font-black ${scoreColor(w.score)}`}>
                      {String(w.score)}%
                    </span>
                  </div>
                ))}
              </div>
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
          {!passed && recorder.supported && (
            <Button variant="outline" fullWidth onClick={handleSpeak}>
              <Mic className="h-4 w-4" />
              حاول مرة أخرى
            </Button>
          )}
          <Button variant="primary" fullWidth onClick={handleNext}>
            {isLast ? "عرض النتيجة" : "التالي"}
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!answered && !recorder.supported && (
        <Button variant="outline" fullWidth onClick={handleSkip}>
          المرور على الكلمة
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

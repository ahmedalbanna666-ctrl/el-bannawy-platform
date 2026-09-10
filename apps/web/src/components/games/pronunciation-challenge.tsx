"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCurriculumUnits, useUnitVocabulary } from "@/lib/games/use-games-data";
import { useGameSettings } from "@/lib/games/settings";
import { pickWordPairs } from "@/lib/games/question-engine";
import type { GameWord, PronunciationQuestion } from "@/lib/games/types";
import { useAudioRecorder } from "@/lib/games/use-audio-recorder";
import { assessPronunciation } from "@/lib/games/pronunciation-api";
import type { PronunciationAssessmentResult } from "@/lib/games/pronunciation-types";
import { UnitMapSelect } from "@/components/games/unit-map-select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mic, CheckCircle2, XCircle, ChevronLeft, Trophy, RotateCcw, Sparkles, BookOpen, AlertTriangle, Award, Coins, Volume2, Loader2 } from "lucide-react";

function useSpeak(): (text: string) => void {
  return useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);
}

export function PronunciationChallenge({ unitId: forcedUnitId, words: lessonWords }: { unitId?: string; words?: readonly GameWord[] }): ReactNode {
  const { settings } = useGameSettings();
  const recorder = useAudioRecorder();
  const speak = useSpeak();
  const { data: units, isLoading, isError, refetch } = useCurriculumUnits();
  const isLessonMode = lessonWords !== undefined;
  const [phase, setPhase] = useState<"select" | "playing" | "result">(isLessonMode ? "playing" : "select");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(forcedUnitId ?? null);
  const [questions, setQuestions] = useState<PronunciationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptResult, setAttemptResult] = useState<PronunciationAssessmentResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [rewardsXp, setRewardsXp] = useState(0);
  const [rewardsCoins, setRewardsCoins] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const safeUnits = units ?? [];
  const selectedUnit = useMemo(() => safeUnits.find((u) => u.id === selectedUnitId) ?? null, [safeUnits, selectedUnitId]);
  const { data: unitPool, isLoading: poolLoading, isError: poolError, refetch: refetchPool } = useUnitVocabulary(selectedUnitId ?? "", selectedUnit?.lessonIds ?? []);
  const pool = isLessonMode ? lessonWords : unitPool;
  const config = settings.pronunciationChallenge;
  const canStart = useMemo(() => selectedUnit && pool ? pool.length > 0 : false, [selectedUnit, pool]);

  const startGame = useCallback(() => {
    if (!pool || !canStart) return;
    const gen = pickWordPairs(pool, config.questionsPerRound);
    setQuestions(gen); setCurrentIndex(0); setAttemptResult(null); setAssessError(null); setAnswered(false);
    setRewardsXp(0); setRewardsCoins(0); setTotalScore(0); setResolvedCount(0); setSkippedCount(0); setPhase("playing");
  }, [pool, canStart, config]);

  // Auto-start when a unit is selected and its pool is ready (like memory game - no "Start" button)
  useEffect(() => {
    if (selectedUnitId && pool && canStart && !poolLoading && phase === "select") {
      startGame();
    }
  }, [selectedUnitId, pool, canStart, poolLoading, phase, startGame]);

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const attemptScore = attemptResult?.overallScore ?? null;
  const passed = attemptScore !== null && attemptScore >= config.threshold;

  useEffect(() => {
    if (!recorder.result || attemptResult || !current) return;
    let cancelled = false;
    setUploading(true); setAssessError(null);
    assessPronunciation(recorder.result.blob, current.word)
      .then((res) => {
        if (cancelled) return;
        setAttemptResult(res); setAnswered(true);
        setTotalScore((p) => p + res.overallScore); setResolvedCount((p) => p + 1);
        if (res.overallScore >= config.threshold) { setRewardsXp((p) => p + config.xpReward); setRewardsCoins((p) => p + config.coinReward); }
      })
      .catch((err: unknown) => { if (!cancelled) setAssessError(err instanceof Error ? err.message : "حدث خطأ أثناء التقييم"); })
      .finally(() => { if (!cancelled) setUploading(false); });
    return () => { cancelled = true; };
  }, [recorder.result, attemptResult, current, config]);

  const handleSpeak = useCallback(() => {
    recorder.reset(); setAttemptResult(null); setAssessError(null); setAnswered(false); void recorder.start();
  }, [recorder]);

  const handleNext = useCallback(() => {
    recorder.reset(); setAttemptResult(null); setAssessError(null); setAnswered(false);
    if (isLast) setPhase("result"); else setCurrentIndex((p) => p + 1);
  }, [recorder, isLast]);

  const restart = useCallback(() => {
    if (!pool) return;
    const gen = pickWordPairs(pool, config.questionsPerRound);
    setQuestions(gen); setCurrentIndex(0); setAttemptResult(null); setAssessError(null); setAnswered(false);
    setRewardsXp(0); setRewardsCoins(0); setTotalScore(0); setResolvedCount(0); setSkippedCount(0); setPhase("playing");
  }, [pool, config]);

  useEffect(() => {
    if (!isLessonMode || !lessonWords?.length) return;
    const gen = pickWordPairs(lessonWords, config.questionsPerRound);
    setQuestions(gen); setCurrentIndex(0); setAttemptResult(null); setAssessError(null); setAnswered(false);
    setRewardsXp(0); setRewardsCoins(0); setTotalScore(0); setResolvedCount(0); setSkippedCount(0); setPhase("playing");
  }, [isLessonMode, lessonWords, config.questionsPerRound]);

  if (!config.enabled) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-500"><Mic className="h-6 w-6" /></span> تحدي النطق</h1>
        <EmptyState title="اللعبة غير مفعّلة" description="لم يقم المعلم بتفعيل تحدي النطق حالياً" icon={<BookOpen className="h-16 w-16" />} />
      </div>
    );
  }

  if (isLessonMode && lessonWords?.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-500"><Mic className="h-6 w-6" /></span> تحدي النطق</h1>
        <EmptyState title="لا توجد كلمات" description="أضف مفردات للدرس أولاً" icon={<BookOpen className="h-16 w-16" />} />
      </div>
    );
  }

  if (phase === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-500"><Mic className="h-6 w-6" /></span> تحدي النطق</h1>
          <p className="mt-2 text-sm text-neutral-500">اختر الوحدة، ثم انطق الكلمة. سيُقيّم نطقك بنسبة مئوية دقيقة.</p>
        </div>
        {isLoading && <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>}
        {isError && <ErrorState title="تعذر تحميل الوحدات" onRetry={() => void refetch()} />}
        {!isLoading && !isError && safeUnits.length === 0 && <EmptyState title="لا يوجد منهج" icon={<BookOpen className="h-16 w-16" />} />}
        {!isLoading && !isError && safeUnits.length > 0 && (
          <>
            <UnitMapSelect units={safeUnits} selectedId={selectedUnitId} onSelect={(id) => { setSelectedUnitId(id); void refetchPool(); }} />
            {selectedUnit && poolLoading && <p className="text-sm text-neutral-500">جاري تحميل كلمات الوحدة...</p>}
            {selectedUnit && poolError && <ErrorState title="تعذر تحميل الكلمات" onRetry={() => void refetchPool()} />}
            {selectedUnit && pool && !canStart && <div className="flex items-center gap-2 rounded-xl bg-warning-500/10 p-3 text-sm text-warning-600"><AlertTriangle className="h-4 w-4" /> هذه الوحدة لا تحتوي على كلمات كافية.</div>}
            {!recorder.supported && <div className="flex items-center gap-2 rounded-xl bg-warning-500/10 p-3 text-sm text-warning-600"><AlertTriangle className="h-4 w-4" /> متصفحك لا يدعم التسجيل</div>}
          </>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const accuracy = resolvedCount > 0 ? Math.round(totalScore / resolvedCount) : 0;
    const allCorrect = resolvedCount > 0 && totalScore / resolvedCount >= 85;
    const hasWeak = accuracy < 60;
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card variant="elevated" padding="lg"><CardContent className="flex flex-col items-center gap-4 text-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${allCorrect ? "bg-emerald-500/10 text-emerald-500" : hasWeak ? "bg-amber-500/10 text-amber-500" : "bg-warning-500/10 text-warning-500"}`}>{allCorrect ? <CheckCircle2 className="h-10 w-10" /> : hasWeak ? <AlertTriangle className="h-10 w-10" /> : <Trophy className="h-10 w-10" />}</div>
          <h2 className="text-2xl font-bold">{allCorrect ? "ممتاز! أحسنت" : hasWeak ? "حاول مرة أخرى" : "أحسنت!"}</h2>
          <p className="text-sm text-neutral-500">{allCorrect ? "أتممت نطق جميع الكلمات بشكل صحيح" : hasWeak ? "لديك ضعف بسيط في النطق، استمر في التدريب وستتحسن" : "أكملت تحدي النطق"}</p>
          <div className="grid w-full grid-cols-3 gap-3">
            <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50"><p className="text-2xl font-black text-primary-500">{resolvedCount}</p><p className="text-[11px] text-neutral-500">كلمات مكتملة</p></div>
            <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50"><p className="text-2xl font-black text-success-500">{accuracy}%</p><p className="text-[11px] text-neutral-500">متوسط الدقة</p></div>
            <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-700/50"><p className="text-2xl font-black">{skippedCount}</p><p className="text-[11px] text-neutral-500">تم تخطيها</p></div>
          </div>
          <div className="flex w-full items-center justify-center gap-4 rounded-xl bg-amber-500/10 p-3 text-sm font-bold text-amber-600"><span className="flex items-center gap-1"><Award className="h-4 w-4" />+{rewardsXp} XP</span><span className="flex items-center gap-1"><Coins className="h-4 w-4" />+{rewardsCoins} عملة</span></div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button variant="primary" fullWidth onClick={restart}><RotateCcw className="h-4 w-4" /> العب مرة أخرى</Button>
            {!isLessonMode && <Button variant="outline" fullWidth onClick={() => setPhase("select")}><ChevronLeft className="h-4 w-4" /> اختر وحدة أخرى</Button>}
          </div>
        </CardContent></Card>
      </div>
    );
  }

  if (!current) return null;

  // Big percentage display - the core of the new accurate game
  const score = attemptResult?.overallScore ?? 0;
  const showResult = answered && !!attemptResult;
  const feedback = attemptResult?.words[0]?.feedback ?? "";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => { if (recorder.recording) recorder.stop(); recorder.reset(); setAttemptResult(null); setPhase("select"); }} className="flex items-center gap-1 text-sm text-neutral-500"><ChevronLeft className="h-4 w-4" /> إنهاء</button>
        <div className="flex items-center gap-2 text-sm font-bold"><Award className="h-4 w-4 text-amber-500" />{rewardsXp} XP</div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"><div className="h-full rounded-full bg-gradient-to-r from-warning-500 to-rose-500 transition-all" style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }} /></div>
      <p className="text-center text-sm text-neutral-500">سؤال {currentIndex + 1} من {questions.length}</p>
      <Card variant="elevated" padding="lg"><CardContent className="flex flex-col items-center gap-4">
        <Badge variant="warning">المفردات</Badge>
        <div className="flex items-center gap-2">
          <p dir="ltr" className="text-4xl font-black tracking-wide">{current.word}</p>
          <button type="button" onClick={() => speak(current.word)} aria-label="استمع" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 hover:bg-primary-500/20"><Volume2 className="h-4 w-4" /></button>
        </div>
        <p className="text-center text-xs text-neutral-400">انطق الكلمة بوضوح — سيُقيّم نطقك بنسبة مئوية</p>

        <button
          type="button"
          onClick={recorder.recording ? recorder.stop : handleSpeak}
          disabled={uploading}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-500 ${recorder.recording ? "scale-105 bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]" : "bg-gradient-to-br from-warning-500 to-rose-500 hover:scale-105"} disabled:opacity-50`}
        >
          {uploading ? <Loader2 className="h-12 w-12 animate-spin" /> : <Mic className="h-12 w-12" />}
          {recorder.recording && <span className="absolute inset-0 animate-ping rounded-full bg-red-400/30" />}
        </button>
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {recorder.recording ? `... ${(recorder.durationMs / 1000).toFixed(1)}s` : uploading ? "جاري التقييم..." : "اضغط على المايك وانطق الكلمة"}
        </p>

        {recorder.error && (
          <div className="flex w-full flex-col items-center gap-2 rounded-xl bg-red-500/10 p-3">
            <p className="text-center text-xs font-medium text-red-600">{recorder.error}</p>
            <Button variant="outline" size="sm" onClick={() => { recorder.reset(); void recorder.start(); }}>إعادة المحاولة</Button>
          </div>
        )}
        {assessError && <div className="rounded-xl bg-red-500/10 p-3 text-center text-xs font-medium text-red-600">{assessError}</div>}

        {showResult && (
          <div className="flex w-full flex-col items-center gap-3">
            {/* Big percentage - the main accurate feedback */}
            <div className={`flex h-32 w-32 items-center justify-center rounded-full border-8 bg-white shadow-xl dark:bg-neutral-800 ${score >= 80 ? "border-emerald-500 text-emerald-500" : score >= 60 ? "border-amber-500 text-amber-500" : "border-red-500 text-red-500"}`}>
              <span className="text-5xl font-black">{score}%</span>
            </div>
            <p className={`text-center text-sm font-bold ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>{feedback}</p>
            {attemptResult?.transcript && attemptResult.transcript.toLowerCase() !== current.word.toLowerCase() && (
              <p className="text-center text-xs text-neutral-500">سمعنا: <span dir="ltr" className="font-mono font-bold">"{attemptResult.transcript}"</span></p>
            )}
          </div>
        )}
      </CardContent></Card>

      {showResult && (
        <div className="flex gap-3">
          <Button variant="primary" fullWidth onClick={handleNext}>{isLast ? "عرض النتيجة" : "التالي"} <ChevronLeft className="h-4 w-4" /></Button>
        </div>
      )}
      {!showResult && (
        <Button variant="ghost" fullWidth onClick={() => { recorder.reset(); setAnswered(true); setSkippedCount((p) => p + 1); handleNext(); }}>تخطي</Button>
      )}
    </div>
  );
}

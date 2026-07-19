"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePlayerContext, PlayerState } from "./use-playback-engine";
import { useQuestionPlugin } from "./plugins/question/question-context";
import { Button } from "@/components/ui/button";
import { Loader2, Play, RotateCcw, AlertTriangle, Volume2, VolumeX, Maximize2, CheckCircle2, ArrowRight, FileText, ClipboardList, BookOpen } from "lucide-react";

export interface LessonCompletedActions {
  readonly onNextLesson?: () => void;
  readonly onReviewQuestions?: () => void;
  readonly onHomework?: () => void;
  readonly onBackToUnit?: () => void;
}

interface ExperienceLayerProps {
  readonly lessonTitle?: string;
  readonly enableLessonCompleted?: boolean;
  readonly onComplete?: (currentTime: number, duration: number) => void;
  readonly completedActions?: LessonCompletedActions;
}

const SHIELD_Z = "z-30";
const COMPLETED_Z = "z-40";
const ERROR_Z = "z-45";
const BUFFERING_Z = "z-55";
const LOADING_Z = "z-60";

function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ExperienceLayer({
  lessonTitle,
  enableLessonCompleted = false,
  onComplete,
  completedActions,
}: ExperienceLayerProps): ReactNode {
  const { playerState, currentTime, duration, play, pause, seek, isMuted, toggleMute, toggleFullscreen } =
    usePlayerContext();
  const { currentQuestion } = useQuestionPlugin();

  const iframeInteractive = playerState === PlayerState.Playing && !currentQuestion;
  const showShield = !iframeInteractive && playerState !== PlayerState.Error;

  const completedRef = useRef(false);
  useEffect(() => {
    if (playerState === PlayerState.Ended && enableLessonCompleted && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(currentTime, duration);
    }
    if (playerState !== PlayerState.Ended) {
      completedRef.current = false;
    }
  }, [playerState, enableLessonCompleted, onComplete, currentTime, duration]);

  const progressPct =
    duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  const shield = showShield ? (
    <div
      className={`pointer-events-auto absolute inset-0 flex items-center justify-center bg-neutral-950/40 ${SHIELD_Z}`}
      aria-hidden={playerState === PlayerState.Ended}
    >
      {playerState === PlayerState.Paused && (
        <button
          type="button"
          onClick={(): void => { play(); }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="تشغيل الفيديو"
        >
          <Play className="h-9 w-9 translate-x-0.5 fill-current" />
        </button>
      )}
    </div>
  ) : null;

  const controlBar = iframeInteractive ? (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-gradient-to-t from-neutral-950/80 to-transparent px-4 py-3">
      <button
        type="button"
        onClick={(): void => { pause(); }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="إيقاف مؤقت"
      >
        <span className="block h-3 w-1 border-x-[3px] border-white" />
      </button>
      <button
        type="button"
        onClick={(): void => { seek(0); }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="إعادة من البداية"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-primary-400 transition-all duration-300"
          style={{ width: `${String(progressPct)}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-white/80">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <button
        type="button"
        onClick={(): void => { toggleMute(); }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={(): void => { toggleFullscreen(); }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        aria-label="ملء الشاشة"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  const buffering =
    playerState === PlayerState.Buffering ? (
      <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-950/30 ${BUFFERING_Z}`}>
        <Loader2 className="h-12 w-12 animate-spin text-white/80" />
      </div>
    ) : null;

  const loading =
    playerState === PlayerState.Idle || playerState === PlayerState.Loading ? (
      <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900 ${LOADING_Z}`}>
        <Loader2 className="h-12 w-12 animate-spin text-primary-400" />
        <p className="text-sm font-medium text-neutral-300">جارٍ تحميل المشغل…</p>
      </div>
    ) : null;

  const error =
    playerState === PlayerState.Error ? (
      <div className={`pointer-events-auto absolute inset-0 flex items-center justify-center bg-neutral-950/85 p-6 ${ERROR_Z}`}>
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/15 text-danger-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">تعذر تشغيل الفيديو</h3>
          <p className="text-sm text-neutral-300">
            حدث خطأ أثناء تحميل الفيديو. يرجى المحاولة مرة أخرى أو العودة لاحقاً.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={(): void => { window.location.reload(); }}
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    ) : null;

  const lessonCompleted =
    playerState === PlayerState.Ended && enableLessonCompleted ? (
      <div className={`pointer-events-auto absolute inset-0 flex items-center justify-center overflow-auto bg-neutral-950/90 p-4 backdrop-blur-sm ${COMPLETED_Z}`}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-500/15 text-success-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              تمت مشاهدة الدرس
            </h3>
            {lessonTitle && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{lessonTitle}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {completedActions?.onNextLesson && (
              <Button
                variant="primary"
                size="md"
                className="w-full justify-between"
                onClick={(): void => { completedActions.onNextLesson?.(); }}
              >
                <span>الدرس التالي</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {completedActions?.onReviewQuestions && (
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-between"
                onClick={(): void => { completedActions.onReviewQuestions?.(); }}
              >
                <span>مراجعة الأسئلة</span>
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {completedActions?.onHomework && (
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-between"
                onClick={(): void => { completedActions.onHomework?.(); }}
              >
                <span>الواجب</span>
                <ClipboardList className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              className="w-full justify-between"
              onClick={(): void => { seek(0); play(); }}
            >
              <span>إعادة مشاهدة الدرس</span>
              <RotateCcw className="h-4 w-4" />
            </Button>
            {completedActions?.onBackToUnit && (
              <Button
                variant="ghost"
                size="md"
                className="w-full justify-between"
                onClick={(): void => { completedActions.onBackToUnit?.(); }}
              >
                <span>العودة للوحدة</span>
                <BookOpen className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {controlBar}
      {shield}
      {buffering}
      {loading}
      {error}
      {lessonCompleted}
    </>
  );
}

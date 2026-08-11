"use client";

import { useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { TeacherContextBanner } from "@/components/ui/teacher-context-banner";
import { QuestionCard, groupQuestions, type StudentQuestion } from "@/components/questions/question-card";
import { formatMcqAnswer } from "@/lib/mcq-format";
import {
  ClipboardList,
  ChevronLeft,
  Check,
  X,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  Save,
  Info,
  ArrowLeft,
  Target,
  Layers,
  Play,
} from "lucide-react";

interface HomeworkData {
  id: string;
  lessonId: string;
  title: string;
  instructions: string | null;
  passingScore: number;
  maxAttempts: number;
  xpReward: number;
  published: boolean;
  allowRetry: boolean;
  showAnswers: boolean;
  _count: { questions: number };
}

interface HomeworkQuestion {
  id: string;
  type: string;
  question: string;
  options: string | null;
  displayOrder: number;
}

interface HomeworkResult {
  id: string;
  score: number | null;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  passed: boolean | null;
  attemptNum: number;
  wrongAnswersList?: { questionId: string; studentAnswer: string; correctAnswer: string | null }[];
  details?: HomeworkDetail[];
}

interface HomeworkDetail {
  id: string;
  type: string;
  question: string;
  options: string | null;
  studentAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  isCorrect: boolean;
}

interface ReviewQuestion {
  id: string;
  type: string;
  question: string;
  options: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  studentAnswer: string | null;
  isCorrect: boolean | null;
}

interface ReviewData {
  id?: string;
  score: number | null;
  passed: boolean | null;
  attemptNum: number;
  submittedAt?: string | null;
  questions: ReviewQuestion[];
}

interface AttemptSummary {
  id: string;
  attemptNum: number;
  score: number | null;
  passed: boolean | null;
  submittedAt: string | null;
}

interface HomeworkStatusData {
  status: string;
  activeAttemptId: string | null;
  attemptCount: number;
  maxAttempts: number;
}

export default function HomeworkPage(): ReactNode {
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<HomeworkResult | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [viewingReview, setViewingReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptSummary | null>(null);
  const [attemptReview, setAttemptReview] = useState<ReviewData | null>(null);
  const [attemptView, setAttemptView] = useState<"hub" | "wrong" | "correct" | "all">("hub");
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const queryClient = useQueryClient();

  const { data: homework, isLoading: hwLoading } = useQuery({
    queryKey: ["homework", lessonId],
    queryFn: async () => {
      const res = await api.get<HomeworkData>(`/homework/${lessonId}`);
      if (!res.data) throw new Error("Homework not found");
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ["homework-questions", lessonId],
    queryFn: async () => {
      const res = await api.get<{ questions: HomeworkQuestion[] }>(`/homework/${lessonId}/questions`);
      return res.data?.questions ?? [];
    },
    enabled: !!homework,
    staleTime: 60_000,
    retry: false,
  });

  const questions = questionsData ?? [];
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const groupedQuestions = useMemo(
    () => groupQuestions(questions as StudentQuestion[]),
    [questions],
  );

  const { isLoading: resultLoading } = useQuery({
    queryKey: ["homework-result", lessonId],
    queryFn: async () => {
      const res = await api.get<HomeworkResult>(`/homework/${lessonId}/result`);
      if (res.data) setResult(res.data);
      return res.data ?? null;
    },
    enabled: !!homework,
    staleTime: 0,
    retry: false,
  });

  const { data: history } = useQuery({
    queryKey: ["homework-history", lessonId],
    queryFn: async () => {
      const res = await api.get<AttemptSummary[]>(`/homework/${lessonId}/history`);
      return res.data ?? [];
    },
    enabled: !!homework,
    staleTime: 30_000,
    retry: false,
  });

  const { data: statusData } = useQuery({
    queryKey: ["homework-status", lessonId],
    queryFn: async () => {
      const res = await api.get<HomeworkStatusData>(`/homework/${lessonId}/status`);
      return res.data ?? null;
    },
    enabled: !!homework,
    staleTime: 30_000,
    retry: false,
  });

  const usedAttempts = history?.length ?? 0;
  const attemptsLeft = homework ? Math.max(0, homework.maxAttempts - usedAttempts) : 0;

  const bestAttempt = (history ?? [])
    .filter((a) => a.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;

  const loading = hwLoading || questionsLoading || resultLoading;

  const isSubmitted = result !== null && result.passed !== null;

  // Show the start popup (homework details + ابدأ الواجب) before the student
  // begins answering. A mid-attempt reload resumes instead.
  useEffect(() => {
    if (!homework || !statusData || loading) return;
    if (isSubmitted) return;
    if (statusData.activeAttemptId) {
      setAttemptStarted(true);
      setStartDialogOpen(false);
      return;
    }
    if (statusData.status === "AVAILABLE" && !attemptStarted) {
      setStartDialogOpen(true);
    }
  }, [homework, statusData, loading, isSubmitted, attemptStarted]);

  useEffect(() => {
    if (result || viewingReview) return;

    const hasAnswers = Object.keys(answersRef.current).some((k) => (answersRef.current[Number(k)] ?? "").trim() !== "");
    if (!hasAnswers) return;

    saveTimerRef.current = setInterval(() => {
      const currentQuestions = questionsRef.current;
      const currentAnswers = answersRef.current;
      const saveData = currentQuestions
        .map((q, i) => {
          const ans = currentAnswers[i] ?? "";
          if (ans.trim() === "") return null;
          return { questionId: q.id, selectedAnswer: ans };
        })
        .filter((a): a is { questionId: string; selectedAnswer: string } => a !== null);

      if (saveData.length > 0) {
        void api.patch(`/homework/${lessonId}/save`, { answers: saveData });
        setLastSaved(new Date());
      }
    }, 30000);

    return (): void => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
    };
  }, [result, viewingReview, lessonId]);

  const handleAnswerChange = useCallback((questionIndex: number, value: string): void => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  }, []);

  const handleStartAttempt = async (): Promise<void> => {
    try {
      await api.post(`/homework/${lessonId}/start`);
      setResult(null);
      setReview(null);
      setViewingReview(false);
      setAnswers({});
      setAttemptStarted(true);
      setStartDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["homework", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["homework-questions", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["homework-result", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["homework-history", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["homework-status", lessonId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل بدء المحاولة");
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!homework) return;
    setSubmitting(true);
    setError(null);

    try {
      const answersArray = questions.map((_, i) => answers[i] ?? "");
      const res = await api.post<HomeworkResult>(`/homework/${lessonId}/submit`, {
        answers: answersArray,
      });
      if (res.data) {
        setResult(res.data);
        if (saveTimerRef.current) {
          clearInterval(saveTimerRef.current);
        }
        void queryClient.invalidateQueries({ queryKey: ["homework-history", lessonId] });
        void queryClient.invalidateQueries({ queryKey: ["homework-status", lessonId] });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("No active attempt")) {
        try {
          await api.post(`/homework/${lessonId}/start`);
          const retryRes = await api.post<HomeworkResult>(`/homework/${lessonId}/submit`, {
            answers: questions.map((_, i) => answers[i] ?? ""),
          });
          if (retryRes.data) {
            setResult(retryRes.data);
            if (saveTimerRef.current) clearInterval(saveTimerRef.current);
            void queryClient.invalidateQueries({ queryKey: ["homework-history", lessonId] });
            void queryClient.invalidateQueries({ queryKey: ["homework-status", lessonId] });
            return;
          }
        } catch { /* fall through to error state */ }
      }
      setError(err instanceof Error ? err.message : "فشل تسليم الواجب");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (): Promise<void> => {
    await handleStartAttempt();
  };

  const handleBackToResult = (): void => {
    setViewingReview(false);
    setReview(null);
  };

  const handleOpenAttempt = async (attempt: AttemptSummary): Promise<void> => {
    try {
      const res = await api.get<ReviewData>(`/homework/${lessonId}/review?attemptId=${attempt.id}`);
      if (res.data) {
        setSelectedAttempt(attempt);
        setAttemptReview(res.data);
        setAttemptView("hub");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل محاولة");
    }
  };

  const handleBackFromAttempt = (): void => {
    setSelectedAttempt(null);
    setAttemptReview(null);
    setAttemptView("hub");
  };

  if (loading) return <HomeworkSkeleton />;
  if (error) return <ErrorState title="فشل تحميل الواجب" description={error} />;
  if (!homework) {
    return (
      <EmptyState
        title="لا يوجد واجب"
        description="لا يوجد واجب مخصص لهذا الدرس"
        icon={<ClipboardList className="h-16 w-16" />}
      />
    );
  }

  const allAnswered = questions.length > 0 && questions.every((_, i) => (answers[i] ?? "").trim() !== "");

  if (viewingReview && review) {
    return (
      <div className="flex flex-col gap-4" dir="ltr">
        <TeacherContextBanner />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToResult}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة للنتائج
          </Button>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">مراجعة الإجابات</h1>
          <Badge variant={review.passed ? "success" : "warning"} className="ml-auto">
            النتيجة: {review.score}%
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          {review.questions.map((q, index) => {
            const optionStates = resolveReviewOptions(q);
            const isMcq = q.type === "MULTIPLE_CHOICE";
            const isTrueFalse = q.type === "TRUE_FALSE";
            const isDialogue = q.type === "DIALOGUE";
            const dialogueLines = parseReviewDialogueLines(q.options);
            const dialogueSegments = dialogueLines.map((l) => splitReviewDialogueSegments(l.text));
            const dialogueBlankCount = dialogueSegments.reduce(
              (sum, segs) => sum + segs.filter((s) => s.type === "blank").length,
              0,
            );
            const dialogueAnswers = parseReviewDialogueAnswers(q.studentAnswer, dialogueBlankCount);
            let dialogueBlankIndex = 0;
            return (
              <Card
                key={q.id}
                variant="outline"
                padding="none"
                className={`relative overflow-hidden ${q.isCorrect ? "border-success-500/50" : "border-danger-500/50"}`}
              >
                <div
                  className={`absolute inset-y-0 left-0 w-1.5 ${q.isCorrect ? "bg-success-500" : "bg-danger-500"}`}
                />
                <CardContent className="flex flex-col gap-3 p-4 pl-6 sm:pl-7">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                        q.isCorrect ? "bg-success-500" : "bg-danger-500"
                      }`}
                    >
                      {q.isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-bold leading-relaxed text-neutral-900 dark:text-neutral-100">
                      <span className="ms-1 text-neutral-400">{index + 1}.</span>
                      {q.question}
                    </p>
                    <Badge
                      variant={q.isCorrect ? "success" : "danger"}
                      className="shrink-0 text-[10px]"
                    >
                      {q.isCorrect ? "صحيحة" : "خاطئة"}
                    </Badge>
                  </div>

                  {isMcq ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" dir="ltr">
                      {optionStates.map((opt) => {
                        const rowCls = opt.correct
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : opt.selected
                            ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                            : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900";
                        const badgeCls = opt.correct
                          ? "bg-emerald-500 text-white"
                          : opt.selected
                            ? "bg-red-500 text-white"
                            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700";
                        return (
                          <div
                            key={opt.letter}
                            className={`flex flex-row items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm ${rowCls}`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${badgeCls}`}
                            >
                              {opt.letter}
                            </span>
                            <span className="min-w-0 flex-1 leading-relaxed">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : isTrueFalse ? (
                    <div className="flex gap-2" dir="ltr">
                      {optionStates.map((opt) => {
                        const isTrue = opt.label.toLowerCase() === "true";
                        const pillCls = opt.correct
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : opt.selected
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400";
                        return (
                          <div
                            key={opt.label}
                            className={`flex h-9 min-w-[64px] items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-bold ${pillCls}`}
                          >
                            {opt.correct ? (
                              <Check className="h-4 w-4" />
                            ) : opt.selected ? (
                              <X className="h-4 w-4" />
                            ) : null}
                            <span>{isTrue ? "T" : "F"}</span>
                            <span className="font-semibold">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : isDialogue ? (
                    <div
                      className="flex flex-col gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50/50 p-4 dark:border-primary-700 dark:bg-primary-900/10"
                      dir="ltr"
                    >
                      {dialogueLines.map((line, li) => {
                        const segments = dialogueSegments[li];
                        const hasBlank = segments.some((s) => s.type === "blank");
                        return (
                          <div key={li} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 shrink-0 rounded-md bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                              {line.speaker}
                            </span>
                            {hasBlank ? (
                              <span className="text-neutral-600 dark:text-neutral-400">
                                {segments.map((seg, si) => {
                                  if (seg.type === "text") return <span key={si}>{seg.value}</span>;
                                  const numMatch = /\((\d+)\)/.exec(seg.value);
                                  const bi = dialogueBlankIndex;
                                  dialogueBlankIndex += 1;
                                  return (
                                    <span key={si} className="inline-flex items-center gap-1 align-middle">
                                      {numMatch && (
                                        <span className="text-[11px] font-bold text-primary-500">
                                          {numMatch[1]}.
                                        </span>
                                      )}
                                      <span className="inline-block min-w-[6rem] rounded border-b-2 border-primary-300 bg-white px-2 py-0.5 font-semibold text-neutral-900 dark:border-primary-500 dark:bg-neutral-800 dark:text-neutral-100">
                                        {dialogueAnswers[bi] || "..."}
                                      </span>
                                    </span>
                                  );
                                })}
                              </span>
                            ) : (
                              <span className="text-neutral-700 dark:text-neutral-300">{line.text}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 ps-2 text-sm sm:ps-10">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-neutral-500">إجابتك:</span>
                        <span
                          className={
                            q.isCorrect
                              ? "font-semibold text-success-600 dark:text-success-400"
                              : "font-semibold text-danger-600 dark:text-danger-400"
                          }
                        >
                          {q.studentAnswer ?? "(فارغ)"}
                        </span>
                      </div>
                      {!q.isCorrect && q.correctAnswer && (
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-neutral-500">الإجابة الصحيحة:</span>
                          <span className="font-semibold text-success-600 dark:text-success-400">
                            {q.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {q.explanation && (
                    <p className="flex items-start gap-2 ps-2 text-xs italic text-neutral-400 sm:ps-10">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TeacherContextBanner />
      <div>
        <Link
          href={`/dashboard/lessons/detail/${lessonId}`}
          className="mb-4 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" />
          العودة للدرس
        </Link>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{homework.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <ClipboardList className="h-4 w-4" />
                {homework._count.questions} سؤال
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                نسبة النجاح {homework.passingScore}%
              </span>
              <span>الحد الأقصى {homework.maxAttempts} محاولات</span>
              {homework.xpReward > 0 && <span>+{homework.xpReward} XP</span>}
              {lastSaved && (
                <span className="flex items-center gap-1 text-success-600">
                  <Save className="h-3 w-3" />
                  تم الحفظ
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {attemptStarted && !isSubmitted ? (
              <Button
                variant="primary"
                size="md"
                onClick={(): void => { void handleSubmit(); }}
                disabled={!allAnswered}
                loading={submitting}
              >
                تسليم الواجب
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {selectedAttempt && attemptReview ? (
        <HomeworkAttemptReviewView
          attempt={selectedAttempt}
          review={attemptReview}
          view={attemptView}
          onViewChange={setAttemptView}
          onBack={handleBackFromAttempt}
        />
      ) : isSubmitted ? (
        <>
          <HomeworkResultsHub
            result={result}
            attemptsLeft={attemptsLeft}
            onRetry={(): void => { void handleRetry(); }}
          />
          {history && history.length > 0 && (
            <AttemptsList
              attempts={[...history].sort((a, b) => a.attemptNum - b.attemptNum)}
              bestAttempt={bestAttempt}
              onOpenAttempt={(attempt): void => { void handleOpenAttempt(attempt); }}
            />
          )}
        </>
      ) : (
        <>
          {!attemptStarted && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="h-12 w-12 text-primary-500" />
              <p className="text-sm text-neutral-500">
                اضغط "ابدأ الواجب" لبدء المحاولة
              </p>
            </div>
          )}

          {attemptStarted && homework.instructions && (
            <Card variant="outline" padding="sm">
              <CardContent>
                <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{homework.instructions}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {attemptStarted && (
            <div className="flex flex-col gap-4" dir="ltr">
              {groupedQuestions.map((group, gi) => (
                <div key={gi} className="flex flex-col gap-3">
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                    {group.heading}
                  </h2>
                  <div className="flex flex-col gap-4">
                    {group.questions.map(({ question, originalIndex }) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        index={originalIndex}
                        selectedAnswer={answers[originalIndex] ?? ""}
                        isSubmitted={isSubmitted}
                        showResult={isSubmitted}
                        correctAnswer={getCorrectAnswer(question.id, result)}
                        explanation={getExplanation(question.id, result)}
                        isAnswerCorrect={getIsCorrect(question.id, answers[originalIndex] ?? "", result)}
                        onAnswerChange={handleAnswerChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {attemptStarted && (
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={(): void => { void handleSubmit(); }}
                disabled={!allAnswered}
                loading={submitting}
              >
                تسليم الواجب
              </Button>
            </div>
          )}

          {history && history.length > 0 && (
            <AttemptsList
              attempts={[...history].sort((a, b) => a.attemptNum - b.attemptNum)}
              bestAttempt={bestAttempt}
              onOpenAttempt={(attempt): void => { void handleOpenAttempt(attempt); }}
            />
          )}
        </>
      )}

      <HomeworkStartDialog
        open={startDialogOpen}
        homework={homework}
        onStart={(): void => { void handleStartAttempt(); }}
      />
    </div>
  );
}

function getCorrectAnswer(questionId: string, result: HomeworkResult | null): string | null {
  if (!result?.wrongAnswersList) return null;
  const wrong = result.wrongAnswersList.find((w) => w.questionId === questionId);
  return wrong?.correctAnswer ?? null;
}

function getExplanation(_questionId: string, _result: HomeworkResult | null): string | null {
  return null;
}

function getIsCorrect(questionId: string, selectedAnswer: string, result: HomeworkResult | null): boolean | null {
  if (!result || !selectedAnswer) return null;
  if (result.wrongAnswersList?.some((w) => w.questionId === questionId)) return false;
  return selectedAnswer !== "" ? true : null;
}

interface ReviewOptionState {
  letter: string;
  label: string;
  text: string;
  selected: boolean;
  correct: boolean;
}

function parseReviewOptionItems(options: string | null): { label: string; text: string }[] {
  if (!options) return [];
  try {
    const parsed: unknown = JSON.parse(options);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o) => {
      if (typeof o === "string") return { label: "", text: o };
      const obj = o as { label?: unknown; text?: unknown };
      return {
        label: typeof obj.label === "string" ? obj.label : "",
        text: typeof obj.text === "string" ? obj.text : "",
      };
    });
  } catch {
    return [];
  }
}

function resolveReviewOptions(q: ReviewQuestion): ReviewOptionState[] {
  const items = parseReviewOptionItems(q.options);
  if (items.length === 0) return [];

  const resolveIndex = (value: string): number => {
    const v = value.trim().toLowerCase();
    if (!v) return -1;
    if (/^[a-z]$/.test(v)) {
      const byLetter = items.findIndex((_, i) => String.fromCharCode(97 + i) === v);
      if (byLetter >= 0) return byLetter;
    }
    const byLabel = items.findIndex((o) => o.label.toLowerCase() === v);
    if (byLabel >= 0) return byLabel;
    const byText = items.findIndex((o) => o.text.trim().toLowerCase() === v);
    if (byText >= 0) return byText;
    const idx = Number.parseInt(v, 10);
    if (!Number.isNaN(idx) && idx >= 0 && idx < items.length) return idx;
    return -1;
  };

  const selectedIndex = resolveIndex(q.studentAnswer ?? "");
  const correctIndex = resolveIndex(q.correctAnswer ?? "");

  return items.map((item, i) => ({
    letter: String.fromCharCode(65 + i),
    label: item.label,
    text: item.text.length > 0 ? item.text : item.label,
    selected: i === selectedIndex,
    correct: i === correctIndex,
  }));
}

interface ReviewDialogueLine {
  speaker: string;
  text: string;
  hasBlank: boolean;
}

function parseReviewDialogueLines(options: string | null): ReviewDialogueLine[] {
  if (!options) return [];
  try {
    const parsed: unknown = JSON.parse(options);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o) => {
      const obj = o as { speaker?: unknown; text?: unknown; hasBlank?: unknown };
      return {
        speaker: typeof obj.speaker === "string" ? obj.speaker : "",
        text: typeof obj.text === "string" ? obj.text : "",
        hasBlank: obj.hasBlank === true,
      };
    });
  } catch {
    return [];
  }
}

function splitReviewDialogueSegments(text: string): { type: "text" | "blank"; value: string }[] {
  const segments: { type: "text" | "blank"; value: string }[] = [];
  const regex = /(?:\(\d+\)\s*)?(?:\.{2,}|_{2,})|\(\d+\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "blank", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", value: text });
  }
  return segments;
}

function parseReviewDialogueAnswers(selectedAnswer: string | null, count: number): string[] {
  const empty = Array.from({ length: count }, () => "");
  if (!selectedAnswer) return empty;
  try {
    const parsed: unknown = JSON.parse(selectedAnswer);
    if (!Array.isArray(parsed)) return empty;
    return Array.from({ length: count }, (_, i) =>
      typeof parsed[i] === "string" ? parsed[i] : "",
    );
  } catch {
    return empty;
  }
}

function HomeworkSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// Inline results after submitting homework: congratulation/motivation message +
// retry. The per-question icons (عرض الأخطاء/الأسئلة الصحيحة/كل الأسئلة) live
// inside each attempt's review view (HomeworkAttemptReviewView), not here.
function HomeworkResultsHub({
  result,
  attemptsLeft,
  onRetry,
}: {
  result: HomeworkResult | null;
  attemptsLeft: number;
  onRetry: () => void;
}): ReactNode {
  const score = result?.score ?? 0;
  const passed = result?.passed ?? false;
  const message = passed
    ? "أحسنت! لقد أنجزت الواجب بنجاح"
    : score >= 50
      ? "قريب! واصل المحاولة وستنجح"
      : "لا بأس، كل محاولة تقربك من النجاح — حاول مرة أخرى";

  return (
    <div className="flex flex-col gap-4">
      <Card
        variant={passed ? "gradient" : "outline"}
        padding="md"
        className={passed ? "" : "border-warning-500/50"}
      >
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            {passed ? (
              <CheckCircle className="h-14 w-14 text-success-500" />
            ) : (
              <Target className="h-14 w-14 text-warning-500" />
            )}
            <div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{score}%</h2>
              <p className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">{message}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {result?.correctAnswers ?? 0} صحيحة / {result?.wrongAnswers ?? 0} خاطئة من أصل {result?.totalQuestions ?? 0} سؤال
              </p>
              <Badge variant={passed ? "success" : "warning"} className="mt-2">
                {passed ? "ناجح" : "حاول مرة أخرى"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {attemptsLeft > 0 && (
        <button
          type="button"
          onClick={onRetry}
          className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-start transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <RotateCcw className="h-5 w-5" />
          </span>
          <span className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            إعادة الواجب
          </span>
          <span className="text-sm text-neutral-400">متبقي {attemptsLeft} محاولات</span>
        </button>
      )}
    </div>
  );
}

// Start popup shown before the student begins: homework details + ابدأ الواجب button.
function HomeworkStartDialog({
  open,
  homework,
  onStart,
}: {
  open: boolean;
  homework: HomeworkData;
  onStart: () => void;
}): ReactNode {
  return (
    <Dialog open={open} onClose={() => { /* must start to continue */ }} title={homework.title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <ClipboardList className="h-12 w-12 text-primary-500" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            راجع تفاصيل الواجب قبل البدء.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">عدد الأسئلة</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{homework._count.questions}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">نسبة النجاح</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{homework.passingScore}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">عدد المحاولات</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{homework.maxAttempts}</span>
          </div>
          {homework.xpReward > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">المكافأة</span>
              <span className="font-semibold text-yellow-600">+{homework.xpReward} XP</span>
            </div>
          )}
        </div>

        {homework.instructions && (
          <p className="text-sm text-neutral-500">{homework.instructions}</p>
        )}

        <Button variant="primary" size="lg" onClick={onStart} className="w-full">
          <Play className="mr-2 h-5 w-5" />
          ابدأ الواجب
        </Button>
      </div>
    </Dialog>
  );
}

// Vertical list of the student's homework attempts (المحاولة الأولى/الثانية/
// الثالثة) at the bottom of the page; clicking one opens that attempt's review.
function AttemptsList({
  attempts,
  bestAttempt,
  onOpenAttempt,
}: {
  attempts: AttemptSummary[];
  bestAttempt: AttemptSummary | null;
  onOpenAttempt: (attempt: AttemptSummary) => void;
}): ReactNode {
  const bestId = bestAttempt?.id;
  const bestScore = bestAttempt?.score;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">المحاولات</h2>
        {bestScore !== undefined && bestScore !== null && bestAttempt && (
          <Badge variant="success" className="gap-1">
            <Trophy className="h-3.5 w-3.5" />
            أعلى درجة {bestScore}%
          </Badge>
        )}
      </div>

      {attempts.map((attempt) => {
        const ordinal = homeworkAttemptNumberLabel(attempt.attemptNum);
        const isBest = attempt.id === bestId;
        return (
          <button
            key={attempt.id}
            type="button"
            onClick={(): void => { onOpenAttempt(attempt); }}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-start transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isBest ? "bg-success-500/10 text-success-500" : "bg-primary-500/10 text-primary-500"}`}>
              {isBest ? <Trophy className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {ordinal}
            </span>
            {attempt.score !== null && (
              <Badge variant={attempt.passed ? "success" : "warning"}>{attempt.score}%</Badge>
            )}
            {attempt.submittedAt && (
              <span className="hidden text-xs text-neutral-400 sm:block">
                {new Date(attempt.submittedAt).toLocaleDateString("ar-EG")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function homeworkAttemptNumberLabel(attemptNum: number): string {
  const arabic = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
  return `المحاولة ${arabic[attemptNum - 1] ?? String(attemptNum)}`;
}

// Per-attempt review: attempt data at top + the 3 filter icons (عرض الأخطاء /
// الأسئلة الصحيحة / كل الأسئلة) that filter that attempt's questions.
function HomeworkAttemptReviewView({
  attempt,
  review,
  view,
  onViewChange,
  onBack,
}: {
  attempt: AttemptSummary;
  review: ReviewData;
  view: "hub" | "wrong" | "correct" | "all";
  onViewChange: (v: "hub" | "wrong" | "correct" | "all") => void;
  onBack: () => void;
}): ReactNode {
  const questions = review.questions;
  const wrong = questions.filter((q) => q.isCorrect === false);
  const correct = questions.filter((q) => q.isCorrect === true);

  if (view !== "hub") {
    const filtered = view === "wrong" ? wrong : view === "correct" ? correct : questions;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={(): void => { onViewChange("hub"); }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة
          </Button>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {view === "wrong" ? "الأسئلة الخاطئة" : view === "correct" ? "الأسئلة الصحيحة" : "كل الأسئلة"}
          </h2>
          <Badge variant="secondary" className="ml-auto">{filtered.length} سؤال</Badge>
        </div>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">لا توجد أسئلة في هذا التصنيف</p>
        ) : (
          <div className="flex flex-col gap-3" dir="ltr">
            {filtered.map((q, idx) => (
              <div
                key={q.id}
                className={`rounded-xl border p-3 text-sm ${
                  q.isCorrect ? "border-success-500/50 bg-success-500/5" : "border-danger-500/50 bg-danger-500/5"
                }`}
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{idx + 1}. {q.question}</p>
                <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-neutral-500">
                  <p>
                    <span>إجابتك: </span>
                    <span className={q.isCorrect ? "text-success-600 font-medium" : "text-danger-600 font-medium"}>
                      {q.type === "MULTIPLE_CHOICE" ? formatMcqAnswer(q.options, q.studentAnswer) : (q.studentAnswer ?? "(فارغ)")}
                    </span>
                  </p>
                  {!q.isCorrect && q.correctAnswer && (
                    <p>
                      <span>الإجابة الصحيحة: </span>
                      <span className="font-medium text-success-600">
                        {q.type === "MULTIPLE_CHOICE" ? formatMcqAnswer(q.options, q.correctAnswer) : q.correctAnswer}
                      </span>
                    </p>
                  )}
                  {q.explanation && <p className="italic text-neutral-400">{q.explanation}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          العودة
        </Button>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{homeworkAttemptNumberLabel(attempt.attemptNum)}</h2>
      </div>

      <Card variant={attempt.passed ? "gradient" : "outline"} padding="md" className={attempt.passed ? "" : "border-warning-500/50"}>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            {attempt.passed ? <CheckCircle className="h-10 w-10 text-success-500" /> : <XCircle className="h-10 w-10 text-warning-500" />}
            <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{attempt.score ?? 0}%</p>
            <p className="text-sm text-neutral-500">
              {correct.length} صحيحة / {wrong.length} خاطئة من أصل {questions.length} سؤال
            </p>
            <Badge variant={attempt.passed ? "success" : "warning"}>
              {attempt.passed ? "ناجح" : "حاول مرة أخرى"}
            </Badge>
            {attempt.submittedAt && (
              <p className="text-xs text-neutral-400">
                {new Date(attempt.submittedAt).toLocaleString("ar-EG")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {[
          { key: "wrong" as const, icon: <XCircle className="h-5 w-5" />, label: "عرض الأخطاء", count: wrong.length, color: "text-danger-500 bg-danger-500/10" },
          { key: "correct" as const, icon: <CheckCircle className="h-5 w-5" />, label: "الأسئلة الصحيحة", count: correct.length, color: "text-success-500 bg-success-500/10" },
          { key: "all" as const, icon: <Layers className="h-5 w-5" />, label: "كل الأسئلة", count: questions.length, color: "text-primary-500 bg-primary-500/10" },
        ].map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={(): void => { onViewChange(action.key); }}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-start transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
              {action.icon}
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{action.label}</span>
            <span className="text-sm text-neutral-400">{action.count} سؤال</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
import { useAutoIssueCertificates } from "@/lib/use-auto-issue-certificates";
import { formatMcqAnswer } from "@/lib/mcq-format";
import {
  GraduationCap,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  Save,
  Info,
  ArrowLeft,
  Zap,
  Lock,
  Target,
  Layers,
  Play,
} from "lucide-react";

interface QuizData {
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
  questionCount: number | null;
  durationMinutes: number | null;
  _count: { questions: number };
}

interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string | null;
  displayOrder: number;
}

interface QuizDetail {
  id: string;
  type: string;
  question: string;
  options: string | null;
  studentAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  isCorrect: boolean;
}

interface QuizResult {
  id: string;
  score: number | null;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  passed: boolean | null;
  attemptNum: number;
  xpAwarded?: number;
  nextLessonUnlocked?: boolean;
  wrongAnswersList?: { questionId: string; studentAnswer: string; correctAnswer: string | null }[];
  details?: QuizDetail[];
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

function translatePrereqReason(reason: string | null): string | null {
  if (!reason) return null;
  if (reason.includes("All lesson videos must be completed")) {
    return "أكمل جميع فيديوهات الدرس قبل بدء الاختبار";
  }
  if (reason.includes("Homework must be submitted")) {
    return "يجب تسليم واجب الدرس قبل بدء الاختبار";
  }
  if (reason.includes("Maximum attempts reached")) {
    return "لقد استنفدت جميع محاولاتك لهذا الاختبار";
  }
  return reason;
}

export default function QuizPage(): ReactNode {
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [viewingReview, setViewingReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [prereqError, setPrereqError] = useState<string | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptSummary | null>(null);
  const [attemptReview, setAttemptReview] = useState<ReviewData | null>(null);
  const [attemptView, setAttemptView] = useState<"hub" | "wrong" | "correct" | "all">("hub");
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  // Refs keep the autosave interval stable (does not restart on every keystroke).
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: async () => {
      const res = await api.get<QuizData>(`/quizzes/${lessonId}`);
      if (!res.data) throw new Error("Quiz not found");
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ["quiz-questions", lessonId],
    queryFn: async () => {
      const res = await api.get<{ questions: QuizQuestion[] }>(`/quizzes/${lessonId}/questions`);
      return res.data?.questions ?? [];
    },
    enabled: !!quiz,
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
    queryKey: ["quiz-result", lessonId],
    queryFn: async () => {
      const res = await api.get<QuizResult>(`/quizzes/${lessonId}/result`);
      if (res.data) setResult(res.data);
      return res.data ?? null;
    },
    enabled: !!quiz,
    staleTime: 0,
    retry: false,
  });

  const { data: eligibility } = useQuery({
    queryKey: ["quiz-eligibility", lessonId],
    queryFn: async () => {
      const res = await api.get<{ eligible: boolean; reason: string | null; hasActiveAttempt?: boolean; attemptsLeft?: number }>(
        `/quizzes/${lessonId}/eligibility`,
      );
      return res.data ?? { eligible: true, reason: null };
    },
    enabled: !!quiz,
    staleTime: 30_000,
    retry: false,
  });

  const { data: history } = useQuery({
    queryKey: ["quiz-history", lessonId],
    queryFn: async () => {
      const res = await api.get<AttemptSummary[]>(`/quizzes/${lessonId}/history`);
      return res.data ?? [];
    },
    enabled: !!quiz,
    staleTime: 30_000,
    retry: false,
  });

  const usedAttempts = history?.length ?? 0;
  const attemptsLeft = quiz ? Math.max(0, quiz.maxAttempts - usedAttempts) : 0;

  const bestAttempt = (history ?? [])
    .filter((a) => a.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;

  const isSubmitted = result !== null && result.passed !== null;

  useAutoIssueCertificates(isSubmitted && result.passed === true);

  useEffect(() => {
    if (!quiz) return;
    if (isSubmitted || viewingReview) return;
    if (eligibility) {
      if (!eligibility.eligible) {
        setPrereqError(translatePrereqReason(eligibility.reason));
      } else if (prereqError) {
        setPrereqError(null);
      }
    }
  }, [quiz, eligibility, isSubmitted, viewingReview, prereqError]);

  const loading = quizLoading || questionsLoading || resultLoading;

  // Show the start popup (quiz details + بدء الاختبار) before the timer begins.
  // It appears when the student can take the quiz and hasn't started an attempt yet.
  useEffect(() => {
    if (!quiz || !eligibility || loading) return;
    if (isSubmitted) return;
    if (!eligibility.eligible) return;
    if (eligibility.hasActiveAttempt) {
      setAttemptStarted(true);
      setStartDialogOpen(false);
      return;
    }
    if ((eligibility.attemptsLeft ?? attemptsLeft) > 0 && !attemptStarted) {
      setStartDialogOpen(true);
    }
  }, [quiz, eligibility, loading, isSubmitted, attemptStarted, attemptsLeft]);

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
        void api.patch(`/quizzes/${lessonId}/save`, { answers: saveData });
        setLastSaved(new Date());
      }
    }, 30000);

    return (): void => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [result, viewingReview, lessonId]);

  const handleAnswerChange = useCallback((questionIndex: number, value: string): void => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  }, []);

  const handleStartAttempt = async (): Promise<void> => {
    try {
      setPrereqError(null);
      await api.post(`/quizzes/${lessonId}/start`);
      setResult(null);
      setReview(null);
      setViewingReview(false);
      setAnswers({});
      setAttemptStarted(true);
      setStartDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["quiz-questions", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["quiz-result", lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["quiz-history", lessonId] });
    } catch (err) {
      if (err instanceof Error && err.message.includes("403")) {
        setPrereqError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "فشل بدء المحاولة");
      }
    }
  };

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);

    try {
      const answersArray = questions.map((_, i) => answers[i] ?? "");
      const res = await api.post<QuizResult>(`/quizzes/${lessonId}/submit`, {
        answers: answersArray,
      });
      if (res.data) {
        setResult(res.data);
        if (saveTimerRef.current) clearInterval(saveTimerRef.current);
        void queryClient.invalidateQueries({ queryKey: ["quiz-history", lessonId] });
      }
    } catch (err) {
      // If no active attempt, auto-start one and retry
      if (err instanceof Error && err.message.includes("No active attempt")) {
        try {
          await api.post(`/quizzes/${lessonId}/start`);
          const retryRes = await api.post<QuizResult>(`/quizzes/${lessonId}/submit`, {
            answers: questions.map((_, i) => answers[i] ?? ""),
          });
          if (retryRes.data) {
            setResult(retryRes.data);
            if (saveTimerRef.current) clearInterval(saveTimerRef.current);
            void queryClient.invalidateQueries({ queryKey: ["quiz-history", lessonId] });
            return;
          }
        } catch (startErr) {
          setError(startErr instanceof Error ? startErr.message : "فشل بدء المحاولة");
          return;
        }
      }
      setError(err instanceof Error ? err.message : "فشل تسليم الاختبار");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, questions, answers, lessonId]);

  const handleRetry = async (): Promise<void> => {
    await handleStartAttempt();
  };

  const handleBackToResult = (): void => {
    setViewingReview(false);
    setReview(null);
  };

  const handleOpenAttempt = async (attempt: AttemptSummary): Promise<void> => {
    try {
      const res = await api.get<ReviewData>(`/quizzes/${lessonId}/review?attemptId=${attempt.id}`);
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

  const allAnswered = questions.length > 0 && questions.every((_, i) => (answers[i] ?? "").trim() !== "");

  if (loading) return <QuizSkeleton />;
  if (error) return <ErrorState title="فشل تحميل الاختبار" description={error} />;
  if (!quiz) {
    return (
      <EmptyState
        title="لا يوجد اختبار"
        description="لا يوجد اختبار مخصص لهذا الدرس"
        icon={<GraduationCap className="h-16 w-16" />}
      />
    );
  }

  if (prereqError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Lock className="h-16 w-16 text-warning-500" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">الاختبار مقفل</h2>
        <p className="text-sm text-neutral-500">{prereqError}</p>
        <Link href={`/dashboard/lessons/${lessonId}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            العودة للدرس
          </Button>
        </Link>
      </div>
    );
  }

  if (viewingReview && review) {
    return (
      <div className="flex flex-col gap-4">
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
          {review.questions.map((q, index) => (
            <Card
              key={q.id}
              variant="outline"
              padding="sm"
              className={q.isCorrect ? "border-success-500/50 bg-success-500/5" : "border-danger-500/50 bg-danger-500/5"}
            >
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {index + 1}
                    </span>
                    <p className="flex-1 min-w-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">{q.question}</p>
                    {q.isCorrect ? (
                      <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-success-500" />
                    ) : (
                      <XCircle className="ml-auto h-5 w-5 shrink-0 text-danger-500" />
                    )}
                  </div>
                  <div className="ps-4 sm:ps-8 space-y-1 text-sm">
                    <p>
                      <span className="text-neutral-500">إجابتك: </span>
                      <span className={q.isCorrect ? "text-success-600 font-medium" : "text-danger-600 font-medium"}>
                        {q.type === "MULTIPLE_CHOICE"
                          ? formatMcqAnswer(q.options, q.studentAnswer)
                          : (q.studentAnswer ?? "(فارغ)")}
                      </span>
                    </p>
                    {!q.isCorrect && q.correctAnswer && (
                      <p>
                        <span className="text-neutral-500">الإجابة الصحيحة: </span>
                        <span className="font-medium text-success-600">
                          {q.type === "MULTIPLE_CHOICE"
                            ? formatMcqAnswer(q.options, q.correctAnswer)
                            : q.correctAnswer}
                        </span>
                      </p>
                    )}
                    {q.explanation && <p className="text-neutral-400 italic">{q.explanation}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-card-border className="flex flex-col gap-4">
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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{quiz.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {questions.length} من {quiz._count.questions} سؤال
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                نسبة النجاح {quiz.passingScore}%
              </span>
              <span>الحد الأقصى {quiz.maxAttempts} محاولات</span>
              {isSubmitted && (
                <span className="flex items-center gap-1">
                  <RotateCcw className="h-4 w-4" />
                  متبقي {attemptsLeft} محاولات
                </span>
              )}
              {quiz.durationMinutes !== null && quiz.durationMinutes > 0 && (
                <span className="flex items-center gap-1">
                  ⏱ مدة الاختبار {quiz.durationMinutes} دقيقة
                </span>
              )}
              {quiz.xpReward > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  +{quiz.xpReward} XP
                </span>
              )}
              {lastSaved && (
                <span className="flex items-center gap-1 text-success-600">
                  <Save className="h-3 w-3" />
                  تم الحفظ
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <QuizCountdown
              active={attemptStarted && !isSubmitted && !viewingReview && questions.length > 0}
              durationMinutes={quiz.durationMinutes}
              onExpire={(): void => { void handleSubmit(); }}
            />
            {attemptStarted && !isSubmitted ? (
              <Button
                variant="primary"
                size="md"
                onClick={(): void => { void handleSubmit(); }}
                disabled={!allAnswered}
                loading={submitting}
              >
                تسليم الاختبار
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {selectedAttempt && attemptReview ? (
        <QuizAttemptReviewView
          attempt={selectedAttempt}
          review={attemptReview}
          view={attemptView}
          onViewChange={setAttemptView}
          onBack={handleBackFromAttempt}
        />
      ) : isSubmitted ? (
        <>
            <QuizResultsHub
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
              <GraduationCap className="h-12 w-12 text-primary-500" />
              <p className="text-sm text-neutral-500">
                اضغط "ابدأ الاختبار" لبدء المحاولة — المؤقت يبدأ بعد الضغط
              </p>
            </div>
          )}

          {attemptStarted && quiz.instructions && (
            <Card variant="outline" padding="sm">
              <CardContent>
                <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{quiz.instructions}</p>
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
                <Trophy className="mr-2 h-4 w-4" />
                تسليم الاختبار
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

      <QuizStartDialog
        open={startDialogOpen}
        quiz={quiz}
        onStart={(): void => { void handleStartAttempt(); }}
      />
    </div>
  );
}

function getCorrectAnswer(questionId: string, result: QuizResult | null): string | null {
  if (!result?.wrongAnswersList) return null;
  const wrong = result.wrongAnswersList.find((w) => w.questionId === questionId);
  return wrong?.correctAnswer ?? null;
}

function getExplanation(_questionId: string, _result: QuizResult | null): string | null {
  return null;
}

function getIsCorrect(questionId: string, selectedAnswer: string, result: QuizResult | null): boolean | null {
  if (!result || !selectedAnswer) return null;
  if (result.wrongAnswersList?.some((w) => w.questionId === questionId)) return false;
  return selectedAnswer !== "" ? true : null;
}

function QuizSkeleton(): ReactNode {
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

// Isolated countdown: updates only this component every second (not the whole page).
function QuizCountdown({
  active,
  durationMinutes,
  onExpire,
}: {
  active: boolean;
  durationMinutes: number | null;
  onExpire: () => void;
}): ReactNode {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!active) {
      setTimeLeft(null);
      return;
    }
    const totalSeconds = (durationMinutes ?? 30) * 60;
    const savedEnd = localStorage.getItem("quiz_end_time");
    let endTime: number;
    if (savedEnd) {
      endTime = parseInt(savedEnd, 10);
      if (Date.now() >= endTime) { onExpireRef.current(); return; }
    } else {
      endTime = Date.now() + totalSeconds * 1000;
      localStorage.setItem("quiz_end_time", String(endTime));
    }

    const id = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        localStorage.removeItem("quiz_end_time");
        onExpireRef.current();
      }
    }, 1000);

    return (): void => { clearInterval(id); };
  }, [active, durationMinutes]);

  if (timeLeft === null) return null;

  return (
    <div
      dir="ltr"
      className={`rounded-xl border px-4 py-2 text-sm font-bold tabular-nums ${
        timeLeft < 60
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : timeLeft < 300
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      }`}
    >
      ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
    </div>
  );
}

// Inline results after submitting: congratulation/motivation message + retry.
// The per-question icons (عرض الأخطاء/الأسئلة الصحيحة/كل الأسئلة) live inside
// each attempt's review view (QuizAttemptReviewView), not here.
function QuizResultsHub({
  result,
  attemptsLeft,
  onRetry,
}: {
  result: QuizResult | null;
  attemptsLeft: number;
  onRetry: () => void;
}): ReactNode {
  const score = result?.score ?? 0;
  const passed = result?.passed ?? false;
  const message = passed
    ? "أحسنت! لقد اجتزت الاختبار بنجاح"
    : score >= 50
      ? "قريب! واصل المحاولة وستنجح"
      : "لا بأس، كل محاولة تقربك من النجاح — حاول مرة أخرى";

  return (
    <div className="flex flex-col gap-4">
      {/* Congratulation / motivation message */}
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
              {result?.xpAwarded !== undefined && result.xpAwarded > 0 && (
                <p className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-yellow-600">
                  <Zap className="h-4 w-4" />+{result.xpAwarded} XP مكتسبة
                </p>
              )}
              {result?.nextLessonUnlocked && (
                <Badge variant="success" className="mt-2">تم فتح الدرس التالي</Badge>
              )}
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
            إعادة الامتحان
          </span>
          <span className="text-sm text-neutral-400">متبقي {attemptsLeft} محاولات</span>
        </button>
      )}
    </div>
  );
}

// Start popup shown before the timer begins: quiz details + بدء الاختبار button.
function QuizStartDialog({
  open,
  quiz,
  onStart,
}: {
  open: boolean;
  quiz: QuizData;
  onStart: () => void;
}): ReactNode {
  const shownQuestions = quiz.questionCount && quiz.questionCount > 0
    ? Math.min(quiz.questionCount, quiz._count.questions)
    : quiz._count.questions;
  return (
    <Dialog open={open} onClose={() => { /* must start to continue */ }} title={quiz.title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <GraduationCap className="h-12 w-12 text-primary-500" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            راجع تفاصيل الاختبار قبل البدء — المؤقت يبدأ فور الضغط على "ابدأ الاختبار".
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">عدد الأسئلة</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {shownQuestions} من {quiz._count.questions}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">نسبة النجاح</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{quiz.passingScore}%</span>
          </div>
          {quiz.durationMinutes !== null && quiz.durationMinutes > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">مدة الاختبار</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{quiz.durationMinutes} دقيقة</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">عدد المحاولات</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{quiz.maxAttempts}</span>
          </div>
          {quiz.xpReward > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">المكافأة</span>
              <span className="font-semibold text-yellow-600">+{quiz.xpReward} XP</span>
            </div>
          )}
        </div>

        {quiz.instructions && (
          <p className="text-sm text-neutral-500">{quiz.instructions}</p>
        )}

        <Button variant="primary" size="lg" onClick={onStart} className="w-full">
          <Play className="mr-2 h-5 w-5" />
          ابدأ الاختبار
        </Button>
      </div>
    </Dialog>
  );
}

// Vertical list of the student's attempts (المحاولة الأولى/الثانية/الثالثة) at
// the bottom of the page; clicking one opens that attempt's review.
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
        const ordinal = attemptNumberLabel(attempt.attemptNum);
        const isBest = attempt.id === bestId;
        return (
          <button
            key={attempt.id}
            type="button"
            onClick={(): void => { onOpenAttempt(attempt); }}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-start transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isBest ? "bg-success-500/10 text-success-500" : "bg-primary-500/10 text-primary-500"}`}>
              {isBest ? <Trophy className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
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

function attemptNumberLabel(attemptNum: number): string {
  const arabic = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
  return `المحاولة ${arabic[attemptNum - 1] ?? String(attemptNum)}`;
}

// Per-attempt review: attempt data at top + the 3 filter icons (عرض الأخطاء /
// الأسئلة الصحيحة / كل الأسئلة) that filter that attempt's questions.
function QuizAttemptReviewView({
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
          <div className="flex flex-col gap-3">
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
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{attemptNumberLabel(attempt.attemptNum)}</h2>
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

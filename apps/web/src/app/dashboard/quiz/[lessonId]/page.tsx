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
import {
  GraduationCap,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  Save,
  Info,
  Eye,
  ArrowLeft,
  Zap,
  Lock,
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
  score: number | null;
  passed: boolean | null;
  attemptNum: number;
  questions: ReviewQuestion[];
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
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "wrong">("all");
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
      const res = await api.get<{ eligible: boolean; reason: string | null }>(
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
      const res = await api.get<{ attemptNum: number }[]>(`/quizzes/${lessonId}/history`);
      return res.data ?? [];
    },
    enabled: !!quiz,
    staleTime: 30_000,
    retry: false,
  });

  const usedAttempts = history?.length ?? 0;
  const attemptsLeft = quiz ? Math.max(0, quiz.maxAttempts - usedAttempts) : 0;

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
        setResultFilter("all");
        setResultDialogOpen(true);
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
            setResultFilter("all");
            setResultDialogOpen(true);
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

  const handleViewReview = async (): Promise<void> => {
    try {
      const res = await api.get<ReviewData>(`/quizzes/${lessonId}/review`);
      if (res.data) {
        setReview(res.data);
        setViewingReview(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المراجعة");
    }
  };

  const handleBackToResult = (): void => {
    setViewingReview(false);
    setReview(null);
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
                        {q.studentAnswer ?? "(فارغ)"}
                      </span>
                    </p>
                    {!q.isCorrect && q.correctAnswer && (
                      <p>
                        <span className="text-neutral-500">الإجابة الصحيحة: </span>
                        <span className="font-medium text-success-600">{q.correctAnswer}</span>
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
              active={!isSubmitted && !viewingReview && questions.length > 0}
              durationMinutes={quiz.durationMinutes}
              onExpire={(): void => { void handleSubmit(); }}
            />
            {isSubmitted && quiz.showAnswers && (
              <Button variant="outline" size="sm" onClick={(): void => { void handleViewReview(); }}>
                <Eye className="mr-2 h-4 w-4" />
                مراجعة الإجابات
              </Button>
            )}
            {isSubmitted ? (
              quiz.allowRetry && attemptsLeft > 0 ? (
                <Button variant="outline" size="sm" onClick={(): void => { void handleRetry(); }}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  إعادة المحاولة
                </Button>
              ) : null
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={(): void => { void handleSubmit(); }}
                disabled={!allAnswered}
                loading={submitting}
              >
                تسليم الاختبار
              </Button>
            )}
          </div>
        </div>
      </div>

      {quiz.instructions && (
        <Card variant="outline" padding="sm">
          <CardContent>
            <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{quiz.instructions}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result !== null && (
        <Card
          variant={result.passed ? "gradient" : "outline"}
          padding="md"
          className={result.passed ? "" : "border-warning-500/50"}
        >
          <CardContent>
            <div className="flex flex-col items-center gap-3 text-center">
              {result.passed ? (
                <CheckCircle className="h-12 w-12 text-success-500" />
              ) : (
                <XCircle className="h-12 w-12 text-warning-500" />
              )}
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">النتيجة: {result.score}%</h2>
                <p className="text-sm text-neutral-500">
                  {result.correctAnswers} صحيحة / {result.wrongAnswers} خاطئة من أصل {result.totalQuestions} سؤال
                </p>
                <Badge variant={result.passed ? "success" : "warning"} className="mt-2">
                  {result.passed ? "ناجح" : "حاول مرة أخرى"}
                </Badge>
                {result.xpAwarded !== undefined && result.xpAwarded > 0 && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-yellow-600">
                    <Zap className="h-4 w-4" />+{result.xpAwarded} XP مكتسبة
                  </p>
                )}
                {result.nextLessonUnlocked && (
                  <Badge variant="success" className="mt-2">
                    تم فتح الدرس التالي
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {!isSubmitted && questions.length > 0 && (
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

      <QuizResultDialog
        open={resultDialogOpen}
        result={result}
        filter={resultFilter}
        onFilterChange={setResultFilter}
        onClose={(): void => { setResultDialogOpen(false); }}
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

// Result dialog after submitting: shows the percentage and lets the student
// filter the questions by الصواب / الخطأ / كل الأسئلة.
function QuizResultDialog({
  open,
  result,
  filter,
  onFilterChange,
  onClose,
}: {
  open: boolean;
  result: QuizResult | null;
  filter: "all" | "correct" | "wrong";
  onFilterChange: (f: "all" | "correct" | "wrong") => void;
  onClose: () => void;
}): ReactNode {
  const details = result?.details ?? [];

  const filtered = details.filter((d) => {
    if (filter === "correct") return d.isCorrect;
    if (filter === "wrong") return !d.isCorrect;
    return true;
  });

  const filterButtons: { key: "all" | "correct" | "wrong"; label: string; count: number }[] = [
    { key: "all", label: "كل الأسئلة", count: details.length },
    { key: "correct", label: "الصواب", count: details.filter((d) => d.isCorrect).length },
    { key: "wrong", label: "الخطأ", count: details.filter((d) => !d.isCorrect).length },
  ];

  return (
    <Dialog open={open} onClose={onClose} title="نتيجة الاختبار">
      <div className="flex flex-col gap-4">
        {/* Score headline */}
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          {result?.passed ? (
            <CheckCircle className="h-10 w-10 text-success-500" />
          ) : (
            <XCircle className="h-10 w-10 text-warning-500" />
          )}
          <p className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
            {result?.score ?? 0}%
          </p>
          <p className="text-sm text-neutral-500">
            {result?.correctAnswers ?? 0} صحيحة / {result?.wrongAnswers ?? 0} خاطئة من أصل {result?.totalQuestions ?? 0} سؤال
          </p>
          <Badge variant={result?.passed ? "success" : "warning"}>
            {result?.passed ? "ناجح" : "حاول مرة أخرى"}
          </Badge>
        </div>

        {/* Filter buttons */}
        <div className="grid grid-cols-3 gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={filter === btn.key ? "primary" : "outline"}
              size="sm"
              onClick={(): void => { onFilterChange(btn.key); }}
            >
              {btn.label} ({btn.count})
            </Button>
          ))}
        </div>

        {/* Filtered questions */}
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">لا توجد أسئلة في هذا التصنيف</p>
        ) : (
          <div className="max-h-[50vh] flex flex-col gap-2 overflow-y-auto pe-1">
            {filtered.map((d, idx) => (
              <div
                key={d.id}
                className={`rounded-xl border p-3 text-sm ${
                  d.isCorrect
                    ? "border-success-500/50 bg-success-500/5"
                    : "border-danger-500/50 bg-danger-500/5"
                }`}
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {idx + 1}. {d.question}
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-neutral-500">
                  <p>
                    <span>إجابتك: </span>
                    <span className={d.isCorrect ? "text-success-600 font-medium" : "text-danger-600 font-medium"}>
                      {d.studentAnswer ?? "(فارغ)"}
                    </span>
                  </p>
                  {!d.isCorrect && d.correctAnswer && (
                    <p>
                      <span>الإجابة الصحيحة: </span>
                      <span className="font-medium text-success-600">{d.correctAnswer}</span>
                    </p>
                  )}
                  {d.explanation && <p className="italic text-neutral-400">{d.explanation}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

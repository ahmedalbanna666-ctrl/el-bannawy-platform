"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
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
  _count: { questions: number };
}

interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string | null;
  displayOrder: number;
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
  wrongAnswersList?: { questionId: string; studentAnswer: string; correctAnswer: string }[];
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

const QMAP: Record<string, string> = {
  MULTIPLE_CHOICE: "MC",
  MULTIPLE_RESPONSE: "MR",
  TRUE_FALSE: "T/F",
  FILL_IN_BLANKS: "Fill",
  MATCHING: "Match",
  ORDERING: "Order",
};

export default function QuizPage(): ReactNode {
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [viewingReview, setViewingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [prereqError, setPrereqError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuiz = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setPrereqError(null);
      const [qzRes, qRes, resultRes] = await Promise.all([
        api.get<QuizData>(`/quizzes/${lessonId}`),
        api.get<{ questions: QuizQuestion[] }>(`/quizzes/${lessonId}/questions`),
        api.get<QuizResult>(`/quizzes/${lessonId}/result`),
      ]);

      if (qzRes.data) setQuiz(qzRes.data);
      if (qRes.data?.questions) setQuestions(qRes.data.questions);
      if (resultRes.data) setResult(resultRes.data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("403")) {
          setPrereqError(err.message);
        } else if (!err.message.includes("404")) {
          setError(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void fetchQuiz();
  }, [fetchQuiz]);

  useEffect(() => {
    if (result || viewingReview) return;
    const hasAnswers = Object.keys(answers).some((k) => (answers[Number(k)] ?? "").trim() !== "");
    if (!hasAnswers) return;

    saveTimerRef.current = setInterval(() => {
      const saveData = questions
        .map((q, i) => {
          const ans = answers[i] ?? "";
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
  }, [answers, questions, lessonId, result, viewingReview]);

  const handleAnswerChange = (questionIndex: number, value: string): void => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const handleStartAttempt = async (): Promise<void> => {
    try {
      setPrereqError(null);
      await api.post(`/quizzes/${lessonId}/start`);
      setResult(null);
      setReview(null);
      setViewingReview(false);
      setAnswers({});
      void fetchQuiz();
    } catch (err) {
      if (err instanceof Error && err.message.includes("403")) {
        setPrereqError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "فشل بدء المحاولة");
      }
    }
  };

  const handleSubmit = async (): Promise<void> => {
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسليم الاختبار");
    } finally {
      setSubmitting(false);
    }
  };

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

  const allAnswered = questions.length > 0 && questions.every((_, i) => (answers[i] ?? "").trim() !== "");
  const isSubmitted = result !== null && result.passed !== null;

  if (viewingReview && review) {
    return (
      <div className="flex flex-col gap-6">
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
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{q.question}</p>
                    {q.isCorrect ? (
                      <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-success-500" />
                    ) : (
                      <XCircle className="ml-auto h-5 w-5 shrink-0 text-danger-500" />
                    )}
                  </div>
                  <div className="ps-8 space-y-1 text-sm">
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
    <div className="flex flex-col gap-6">
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
                {quiz._count.questions} سؤال
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                نسبة النجاح {quiz.passingScore}%
              </span>
              <span>الحد الأقصى {quiz.maxAttempts} محاولات</span>
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
          <div className="flex gap-2">
            {isSubmitted && quiz.showAnswers && (
              <Button variant="outline" size="sm" onClick={(): void => { void handleViewReview(); }}>
                <Eye className="mr-2 h-4 w-4" />
                مراجعة الإجابات
              </Button>
            )}
            {isSubmitted ? (
              quiz.allowRetry && (
                <Button variant="outline" size="sm" onClick={(): void => { void handleRetry(); }}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  إعادة المحاولة
                </Button>
              )
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

      <div className="flex flex-col gap-4">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={index}
            selectedAnswer={answers[index] ?? ""}
            isSubmitted={isSubmitted}
            result={result}
            onAnswerChange={handleAnswerChange}
          />
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
    </div>
  );
}

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  selectedAnswer: string;
  isSubmitted: boolean;
  result: QuizResult | null;
  onAnswerChange: (index: number, value: string) => void;
}

function QuestionCard({ question, index, selectedAnswer, isSubmitted, result, onAnswerChange }: QuestionCardProps): ReactNode {
  const options: string[] = ((): string[] => {
    if (!question.options) return [];
    try {
      return JSON.parse(question.options) as string[];
    } catch {
      return [];
    }
  })();

  const wrongAnswer = result?.wrongAnswersList?.find((w) => w.questionId === question.id);
  const isWrong = wrongAnswer !== undefined;
  const isCorrect = result !== null && !isWrong && selectedAnswer !== "";

  return (
    <Card
      variant="outline"
      padding="sm"
      className={
        isSubmitted
          ? isWrong
            ? "border-danger-500/50 bg-danger-500/5"
            : isCorrect
              ? "border-success-500/50 bg-success-500/5"
              : ""
          : ""
      }
    >
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              {index + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{question.question}</p>
                <Badge variant="secondary">{QMAP[question.type] ?? question.type}</Badge>
              </div>
            </div>
          </div>

          {question.type === "TRUE_FALSE" ? (
            <div className="flex gap-3 ps-8">
              {["صح", "خطأ"].map((label) => {
                const optValue = label === "صح" ? "true" : "false";
                const isSelected = selectedAnswer === optValue;
                const isCorrectOpt = isSubmitted && wrongAnswer?.correctAnswer === optValue;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={(): void => {
                      if (!isSubmitted) onAnswerChange(index, optValue);
                    }}
                    disabled={isSubmitted}
                    className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors ${
                      isSubmitted
                        ? isCorrectOpt
                          ? "border-success-500 bg-success-500/10 text-success-700 dark:text-success-300"
                          : isSelected
                            ? "border-danger-500 bg-danger-500/10 text-danger-700 dark:text-danger-300"
                            : "border-neutral-200 text-neutral-400 dark:border-neutral-700"
                        : isSelected
                          ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300"
                          : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : options.length > 0 ? (
            <div className="flex flex-col gap-2 ps-8">
              {options.map((option, optIndex) => {
                const optValue = String(optIndex);
                const isSelected = selectedAnswer === optValue;
                const isCorrectOpt = isSubmitted && wrongAnswer?.correctAnswer === optValue;
                return (
                  <button
                    key={optIndex}
                    type="button"
                    onClick={(): void => {
                      if (!isSubmitted) onAnswerChange(index, optValue);
                    }}
                    disabled={isSubmitted}
                    className={`rounded-lg border px-4 py-2.5 text-start text-sm transition-colors ${
                      isSubmitted
                        ? isCorrectOpt
                          ? "border-success-500 bg-success-500/10 text-success-700 dark:text-success-300"
                          : isSelected
                            ? "border-danger-500 bg-danger-500/10 text-danger-700 dark:text-danger-300"
                            : "border-neutral-200 text-neutral-400 dark:border-neutral-700"
                        : isSelected
                          ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300"
                          : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {option}
                    {isSubmitted && isCorrectOpt && !isSelected && (
                      <CheckCircle className="ms-2 inline h-4 w-4 text-success-500" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ps-8">
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e): void => {
                  if (!isSubmitted) onAnswerChange(index, e.target.value);
                }}
                disabled={isSubmitted}
                placeholder="اكتب إجابتك..."
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${
                  isSubmitted
                    ? isWrong
                      ? "border-danger-500 bg-danger-500/5 text-danger-700 dark:text-danger-300"
                      : isCorrect
                        ? "border-success-500 bg-success-500/5 text-success-700 dark:text-success-300"
                        : "border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800"
                    : "border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                }`}
              />
              {isSubmitted && wrongAnswer !== undefined && (
                <p className="mt-1 text-xs text-danger-500">الإجابة الصحيحة: {wrongAnswer.correctAnswer}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuizSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
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

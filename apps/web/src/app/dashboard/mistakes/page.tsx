"use client";

import { type ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BookOpen, ScrollText, GraduationCap, AlertTriangle, Clock, CheckCircle2, Play, RotateCcw, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  useMistakes,
  useMistakeFilters,
  useCreateMiniExam,
  useSubmitMiniExam,
  type WrongAnswerItem,
  type MistakeSource,
  type MistakeQueryParams,
  type MiniExamSummary,
} from "@/lib/mistakes-api";

const SOURCE_LABEL: Record<MistakeSource, string> = {
  ASSESSMENT: "تقييم",
  QUIZ: "اختبار",
  HOMEWORK: "واجب",
  STORY: "قصة",
};

const SOURCE_ICON: Record<MistakeSource, ReactNode> = {
  ASSESSMENT: <GraduationCap className="h-4 w-4" />,
  QUIZ: <BookOpen className="h-4 w-4" />,
  HOMEWORK: <BookOpen className="h-4 w-4" />,
  STORY: <ScrollText className="h-4 w-4" />,
};

function SkeletonCard(): ReactNode {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-4 w-3/4" />
        <Skeleton className="mb-1 h-3 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </CardContent>
    </Card>
  );
}

function PageSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default function MistakesPage(): ReactNode {
  const [view, setView] = useState<"review" | "exam" | "results">("review");
  const [examId, setExamId] = useState<string | null>(null);
  const [params, setParams] = useState<MistakeQueryParams>({ scope: "all", page: 1, limit: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [examAnswers, setExamAnswers] = useState<Record<string, string | null>>({});
  const [quizEnded, setQuizEnded] = useState(false);

  const { data: mistakesData, isLoading, isError, error, refetch } = useMistakes(params);
  const { data: filters } = useMistakeFilters();
  const createExam = useCreateMiniExam();
  const submitExam = useSubmitMiniExam();

  const items = mistakesData?.items ?? [];
  const total = mistakesData?.total ?? 0;
  const page = mistakesData?.page ?? 1;
  const limit = mistakesData?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  const handleCreateExam = useCallback(() => {
    createExam.mutate(
      {
        questionCount,
        durationMinutes,
        unitId: params.unitId,
        lessonId: params.lessonId,
        storyId: params.storyId,
        chapterId: params.chapterId,
        source: params.source,
        search: params.search,
      },
      {
        onSuccess: (result) => {
          setExamId(result.id);
          setExamAnswers({});
          setQuizEnded(false);
          setCreateOpen(false);
          setView("exam");
        },
      },
    );
  }, [createExam, questionCount, durationMinutes, params]);

  const handleSubmitExam = useCallback(() => {
    if (!examId) return;
    const answers = Object.entries(examAnswers).map(([qid, ans]) => ({ questionId: qid, answer: ans ?? null }));
    submitExam.mutate(
      { examId, dto: { answers, timeExpired: quizEnded } },
      { onSuccess: () => { setView("results"); } },
    );
  }, [examId, examAnswers, submitExam, quizEnded]);

  const handleBackToReview = useCallback(() => {
    setView("review");
    setExamId(null);
    setExamAnswers({});
    setQuizEnded(false);
  }, []);

  if (view === "exam" || view === "results") {
    return (
      <ExamOrResultsView
        examId={examId}
        view={view}
        examAnswers={examAnswers}
        setExamAnswers={setExamAnswers}
        quizEnded={quizEnded}
        setQuizEnded={setQuizEnded}
        onSubmit={handleSubmitExam}
        onBack={handleBackToReview}
        submitting={submitExam.isPending}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">تعلم من أخطائك</h1>
        <Button leftIcon={<Play className="h-4 w-4" />} onClick={() => { setCreateOpen((o) => !o); }}>
          اختبار تدريبي
        </Button>
      </div>

      {createOpen && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">إنشاء اختبار تدريبي</h3>
            <p className="text-sm text-muted-foreground">اختر عدد الأسئلة والمدة الزمنية للاختبار</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm">عدد الأسئلة</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => { setQuestionCount(Number(e.target.value)); }}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm">المدة (دقائق)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={durationMinutes}
                onChange={(e) => { setDurationMinutes(Number(e.target.value)); }}
                className="w-24"
              />
            </div>
            {createExam.isError && (
              <p className="text-sm text-red-500">{createExam.error.message}</p>
            )}
            <div className="flex gap-3">
              <Button onClick={handleCreateExam} loading={createExam.isPending}>ابدأ الاختبار</Button>
              <Button variant="outline" onClick={() => { setCreateOpen(false); }}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <FilterBar params={params} setParams={setParams} filters={filters} />

      {isLoading && <PageSkeleton />}
      {!isLoading && isError && (
        <ErrorState title="فشل تحميل الأخطاء" description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"} onRetry={() => void refetch()} />
      )}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState icon={<AlertTriangle className="h-12 w-12" />} title="لا توجد أخطاء" description={params.scope === "today" ? "لم ترتكب أي أخطاء اليوم" : "لم ترتكب أي أخطاء بعد"} />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <MistakeCard key={`${item.source}-${item.questionId}`} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 })); }}>السابق</Button>
              <span className="text-sm text-muted-foreground">{page} من {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 })); }}>التالي</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterBar({
  params, setParams, filters,
}: {
  params: MistakeQueryParams;
  setParams: (u: (p: MistakeQueryParams) => MistakeQueryParams) => void;
  filters?: { units: { id: string; title: string }[]; lessons: { id: string; title: string }[]; stories: { id: string; title: string }[]; chapters: { id: string; title: string }[]; sources: MistakeSource[] };
}): ReactNode {
  const [searchText, setSearchText] = useState(params.search ?? "");
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={params.scope ?? "all"} onChange={(e) => { setParams((p) => ({ ...p, scope: e.target.value as "all" | "today" | "term", page: 1 })); }}>
          <option value="all">جميع الفترات</option>
          <option value="today">اليوم</option>
          <option value="term">هذا الترم</option>
        </select>
        {filters && filters.sources.length > 0 && (
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={params.source ?? ""} onChange={(e) => { setParams((p) => ({ ...p, source: (e.target.value || undefined) as MistakeSource | undefined, page: 1 })); }}>
            <option value="">جميع المصادر</option>
            {filters.sources.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
        )}
        {filters && filters.units.length > 0 && (
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={params.unitId ?? ""} onChange={(e) => { setParams((p) => ({ ...p, unitId: e.target.value || undefined, lessonId: undefined, page: 1 })); }}>
            <option value="">جميع الوحدات</option>
            {filters.units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
          </select>
        )}
        {filters && filters.stories.length > 0 && (
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={params.storyId ?? ""} onChange={(e) => { setParams((p) => ({ ...p, storyId: e.target.value || undefined, chapterId: undefined, page: 1 })); }}>
            <option value="">جميع القصص</option>
            {filters.stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        <Input placeholder="بحث..." value={searchText} onChange={(e) => { setSearchText(e.target.value); }} onKeyDown={(e): void => { if (e.key === "Enter") setParams((p) => ({ ...p, search: searchText || undefined, page: 1 })); }} className="h-9 w-40 text-sm" />
      </CardContent>
    </Card>
  );
}

function MistakeCard({ item }: { item: WrongAnswerItem }): ReactNode {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="primary" className="flex items-center gap-1 text-xs">
            {SOURCE_ICON[item.source]}{SOURCE_LABEL[item.source]}
          </Badge>
          {item.unitTitle && <span className="text-xs text-muted-foreground">{item.unitTitle}</span>}
          {item.lessonTitle && <span className="text-xs text-muted-foreground">{item.lessonTitle}</span>}
          {item.storyTitle && <span className="text-xs text-muted-foreground">{item.storyTitle}</span>}
        </div>
        <p className="mb-3 text-sm font-medium">{item.question}</p>
        <div className="flex flex-wrap gap-4 text-xs">
          {item.correctAnswer && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              الإجابة الصحيحة: {item.correctAnswer}
            </span>
          )}
          {item.explanation && <span className="text-muted-foreground"><span className="font-medium">شرح:</span> {item.explanation}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ExamOrResultsView({
  examId, view, examAnswers, setExamAnswers, quizEnded, setQuizEnded, onSubmit, onBack, submitting,
}: {
  examId: string | null;
  view: "exam" | "results";
  examAnswers: Record<string, string | null>;
  setExamAnswers: (v: Record<string, string | null>) => void;
  quizEnded: boolean;
  setQuizEnded: (v: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}): ReactNode {
  const [exam, setExam] = useState<MiniExamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!examId) return;
    void api.get<MiniExamSummary>(`/mistakes/mini-exam/${examId}`)
      .then((res) => {
        if (res.data) setExam(res.data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [examId]);

  useEffect(() => {
    if (!exam || view !== "exam") return;
    const totalSec = exam.durationMinutes * 60;
    let remaining = totalSec;
    timerRef.current = setInterval((): void => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setQuizEnded(true);
      }
    }, 1000);
    return (): void => { clearInterval(timerRef.current); };
  }, [exam, view, setQuizEnded]);

  if (loading || !exam) return <PageSkeleton />;

  const questions = exam.questions;
  const answeredCount = questions.filter((q) => examAnswers[q.questionId]).length;
  const allAnswered = answeredCount === questions.length;

  if (view === "results") {
    const score = exam.score;
    const max = exam.maxScore;
    return (
      <div className="mx-auto max-w-xl flex flex-col gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-center text-lg font-semibold">نتيجة الاختبار</h3>
            <p className="text-center text-sm text-muted-foreground">تم التقييم</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <div className="text-4xl font-bold">{score}/{max}</div>
            <Badge variant={exam.passed ? "success" : "danger"}>{exam.passed ? "ناجح" : "راجع إجاباتك"}</Badge>
          </CardContent>
          <CardFooter className="justify-center">
            <Button leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onBack}>العودة للأخطاء</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>رجوع</Button>
        <div className="flex items-center gap-2 font-mono text-lg" dir="ltr">
          <Clock className="h-5 w-5" />
          {quizEnded ? "انتهى الوقت" : "مؤقت"}
        </div>
        <Badge variant="primary">{answeredCount}/{questions.length}</Badge>
      </div>

      {questions.map((q, idx) => (
        <Card key={q.questionId}>
          <CardHeader>
            <h3 className="text-base font-medium"><span className="ml-2 text-muted-foreground">{idx + 1}.</span>{q.question}</h3>
            <p className="text-xs text-muted-foreground">{SOURCE_LABEL[q.source as MistakeSource]}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {q.options.map((opt, oi) => (
              <Button
                key={oi}
                variant={examAnswers[q.questionId] === opt.text ? "primary" : "outline"}
                className="justify-start text-sm"
                onClick={() => { setExamAnswers({ ...examAnswers, [q.questionId]: opt.text }); }}
              >
                {opt.text}
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button className="w-full" size="lg" onClick={onSubmit} disabled={submitting || !allAnswered} loading={submitting}>
        {allAnswered ? "إنهاء الاختبار" : "أكمل جميع الأسئلة"}
      </Button>
    </div>
  );
}

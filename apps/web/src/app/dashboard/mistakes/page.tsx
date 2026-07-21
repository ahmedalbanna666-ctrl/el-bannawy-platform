"use client";

import { type ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BookOpen, ScrollText, GraduationCap, AlertTriangle, Clock, CheckCircle2, Play, RotateCcw, ArrowLeft, Layers, X, Target } from "lucide-react";
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

const SOURCE_COLOR: Record<MistakeSource, "primary" | "info" | "warning" | "success"> = {
  ASSESSMENT: "info",
  QUIZ: "primary",
  HOMEWORK: "warning",
  STORY: "success",
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

function UnitPicker({
  units,
  selected,
  onChange,
}: {
  units: { id: string; title: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);

  const toggle = (id: string): void => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setOpen((o) => !o); }}>
        <Layers className="h-4 w-4" />
        الوحدات
        {selected.length > 0 && (
          <Badge variant="primary" className="mr-1 px-1.5 py-0">{selected.length}</Badge>
        )}
      </Button>
      {open && (
        <div className="absolute z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">اختر الوحدات</span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => { onChange([]); }}
                className="text-xs font-medium text-primary-500 hover:text-primary-600"
              >
                مسح الكل
              </button>
            )}
          </div>
          <div className="flex max-h-60 flex-wrap gap-2 overflow-auto">
            {units.length === 0 ? (
              <p className="text-xs text-neutral-500">لا توجد وحدات تحتوي على أخطاء</p>
            ) : (
              units.map((u) => {
                const active = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { toggle(u.id); }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      active
                        ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300",
                    )}
                  >
                    {u.title}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MistakesPage(): ReactNode {
  const [view, setView] = useState<"review" | "exam" | "results">("review");
  const [examId, setExamId] = useState<string | null>(null);
  const [params, setParams] = useState<MistakeQueryParams>({ scope: "all", unitIds: [], page: 1, limit: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [examUnitIds, setExamUnitIds] = useState<string[]>([]);
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
  const sourceCounts = mistakesData?.sourceCounts ?? {};

  const units = filters?.units ?? [];
  const selectedUnits = params.unitIds ?? [];

  const handleCreateExam = useCallback(() => {
    createExam.mutate(
      {
        questionCount,
        durationMinutes,
        unitId: examUnitIds.length === 1 ? examUnitIds[0] : undefined,
        unitIds: examUnitIds.length > 0 ? examUnitIds : undefined,
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
  }, [createExam, questionCount, durationMinutes, examUnitIds, params.source, params.search]);

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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">تعلم من أخطائك</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          راجع إجاباتك الخاطئة وتمرن عليها لتحسين مستواك
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card variant="elevated" padding="sm">
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{total}</p>
                <p className="text-xs text-neutral-500">إجمالي الأخطاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {(Object.keys(sourceCounts) as MistakeSource[]).map((src) => (
          <Card key={src} variant="elevated" padding="sm">
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  src === "QUIZ" && "bg-primary-500/10 text-primary-500",
                  src === "ASSESSMENT" && "bg-info-500/10 text-info-500",
                  src === "HOMEWORK" && "bg-warning-500/10 text-warning-500",
                  src === "STORY" && "bg-success-500/10 text-success-500",
                )}>
                  {SOURCE_ICON[src]}
                </div>
                <div>
                  <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{sourceCounts[src]}</p>
                  <p className="text-xs text-neutral-500">{SOURCE_LABEL[src]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unit selection + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UnitPicker
          units={units}
          selected={selectedUnits}
          onChange={(ids) => { setParams((p) => ({ ...p, unitIds: ids, page: 1 })); }}
        />
        <Button leftIcon={<Play className="h-4 w-4" />} onClick={() => {
          setExamUnitIds(selectedUnits);
          setCreateOpen((o) => !o);
        }}>
          اختبار تدريبي
        </Button>
      </div>

      {createOpen && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">إنشاء اختبار تدريبي</h3>
            <p className="text-sm text-neutral-500">اختر الوحدات التي تريد التدرب على أخطائك فيها</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">الوحدات</label>
              <UnitPicker
                units={units}
                selected={examUnitIds}
                onChange={setExamUnitIds}
              />
              {examUnitIds.length === 0 && (
                <p className="mt-2 text-xs text-neutral-500">لم تختر وحدات — سيشمل الاختبار كل أخطائك.</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm text-neutral-700 dark:text-neutral-300">عدد الأسئلة</label>
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
              <label className="w-32 text-sm text-neutral-700 dark:text-neutral-300">المدة (دقائق)</label>
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
        <EmptyState
          icon={<CheckCircle2 className="h-12 w-12 text-success-500" />}
          title="لا توجد أخطاء"
          description={selectedUnits.length > 0 ? "لا توجد أخطاء في الوحدات المختارة" : params.scope === "today" ? "لم ترتكب أي أخطاء اليوم" : "لم ترتكب أي أخطاء بعد — أحسنت!"}
        />
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
              <span className="text-sm text-neutral-500">{page} من {totalPages}</span>
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
        {filters && filters.stories.length > 0 && (
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={params.storyId ?? ""} onChange={(e) => { setParams((p) => ({ ...p, storyId: e.target.value || undefined, chapterId: undefined, page: 1 })); }}>
            <option value="">جميع القصص</option>
            {filters.stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        <div className="relative mr-auto">
          <Input
            placeholder="بحث في الأسئلة..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); }}
            onKeyDown={(e): void => { if (e.key === "Enter") setParams((p) => ({ ...p, search: searchText || undefined, page: 1 })); }}
            className="h-9 w-44 text-sm"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => { setSearchText(""); setParams((p) => ({ ...p, search: undefined, page: 1 })); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MistakeCard({ item }: { item: WrongAnswerItem }): ReactNode {
  const hasWrongAnswer = item.studentAnswer !== null && item.studentAnswer !== "" && item.studentAnswer !== item.correctAnswer;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={SOURCE_COLOR[item.source]} className="flex items-center gap-1 text-xs">
            {SOURCE_ICON[item.source]}{SOURCE_LABEL[item.source]}
          </Badge>
          {item.unitTitle && (
            <Badge variant="secondary" className="text-xs">{item.unitTitle}</Badge>
          )}
          {item.lessonTitle && <span className="text-xs text-neutral-400">{item.lessonTitle}</span>}
          {item.storyTitle && <span className="text-xs text-neutral-400">{item.storyTitle}</span>}
        </div>

        <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.question}</p>

        <div className="flex flex-col gap-2 text-xs">
          {hasWrongAnswer && (
            <span className="flex items-center gap-1 text-red-500">
              <X className="h-3.5 w-3.5" />
              إجابتك: {item.studentAnswer}
            </span>
          )}
          {item.correctAnswer && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              الإجابة الصحيحة: {item.correctAnswer}
            </span>
          )}
          {item.explanation && (
            <span className="flex items-start gap-1 text-neutral-500 dark:text-neutral-400">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span><span className="font-medium">شرح:</span> {item.explanation}</span>
            </span>
          )}
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
            <p className="text-center text-sm text-neutral-500">تم التقييم</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <div className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">{score}/{max}</div>
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
            <h3 className="text-base font-medium"><span className="ml-2 text-neutral-400">{idx + 1}.</span>{q.question}</h3>
            <p className="text-xs text-neutral-400">{SOURCE_LABEL[q.source as MistakeSource]}</p>
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

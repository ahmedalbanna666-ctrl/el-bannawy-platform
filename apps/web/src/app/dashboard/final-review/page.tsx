"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  BookMarked,
  Play,
  Clock,
  HelpCircle,
  Lock,
  CheckCircle2,
} from "lucide-react";

interface LessonSummary {
  id: string;
  title: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  sequentialMode: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
}

interface Unit {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  lessons: LessonSummary[];
}

interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  grades: {
    id: string;
    name: string;
    displayOrder: number;
    units: Unit[];
  }[];
}

interface ReviewItem {
  id: string;
  label: string;
  coverage: string;
  questionCount: number;
  durationMinutes: number;
}

type ReviewStatus = "completed" | "current" | "locked";

function getReviewStatus(index: number, _total: number): ReviewStatus {
  if (index === 0) return "current";
  if (index === 1) return "completed";
  return "locked";
}

export default function FinalReviewPage(): ReactNode {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurriculum = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<Stage[]>("/curriculum");
      if (response.data) setStages(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المراجعة النهائية");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCurriculum();
  }, [fetchCurriculum]);

  const allUnits = stages.flatMap((stage) =>
    stage.grades.flatMap((grade) => grade.units),
  );

  const reviews: ReviewItem[] = ((): ReviewItem[] => {
    if (allUnits.length === 0) return [];
    const items: ReviewItem[] = [];
    for (let i = 0; i < allUnits.length; i += 2) {
      const unitA = allUnits[i];
      const hasSecond = i + 1 < allUnits.length;
      const unitB = hasSecond ? allUnits[i + 1] : null;
      const coverage = unitB
        ? `Unit ${String(unitA.displayOrder)} + Unit ${String(unitB.displayOrder)}`
        : `Unit ${String(unitA.displayOrder)}`;
      items.push({
        id: `review-${String(i / 2 + 1)}`,
        label: `مراجعة رقم ${String(i / 2 + 1)}`,
        coverage,
        questionCount: 20 + (unitB ? 5 : 0),
        durationMinutes: 40 + (unitB ? 10 : 0),
      });
    }
    items.push({
      id: "review-final",
      label: "مراجعة شاملة",
      coverage: "كل المنهج",
      questionCount: 60,
      durationMinutes: 90,
    });
    return items;
  })();

  if (loading) return <FinalReviewSkeleton />;
  if (error) return <ErrorState title="فشل تحميل المراجعة النهائية" description={error} />;

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="المراجعة النهائية غير متاحة"
        description="ستصبح المراجعة النهائية متاحة خلال فترة المراجعة الرسمية"
        icon={<BookMarked className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          المراجعة النهائية
        </h1>
        <p className="mt-1 text-sm text-neutral-500">استعد للاختبارات بمراجعة شاملة</p>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.map((review, idx) => {
          const status = getReviewStatus(idx, reviews.length);

          const borderColor =
            status === "completed"
              ? "border-success-500/60"
              : status === "current"
                ? "border-primary-500/60"
                : "border-neutral-200 dark:border-neutral-700";

          return (
            <Card
              key={review.id}
              variant="outline"
              padding="md"
              className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderColor} ${
                status === "locked" ? "opacity-50" : "cursor-pointer"
              }`}
              onClick={(): void => {
                if (status === "locked") return;
                router.push(`/dashboard/quiz/${allUnits[0]?.id ?? "review"}`);
              }}
              onKeyDown={(e): void => {
                if (status === "locked") return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/dashboard/quiz/${allUnits[0]?.id ?? "review"}`);
                }
              }}
              role={status === "locked" ? undefined : "button"}
              tabIndex={status === "locked" ? undefined : 0}
            >
              <CardContent>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      status === "completed"
                        ? "bg-success-500/10"
                        : status === "current"
                          ? "bg-primary-500/10"
                          : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="h-6 w-6 text-success-500" />
                    ) : status === "locked" ? (
                      <Lock className="h-6 w-6 text-neutral-400" />
                    ) : (
                      <BookMarked className="h-6 w-6 text-primary-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {review.label}
                      </h3>
                      {status === "completed" && (
                        <Badge variant="success" className="text-[10px]">مكتملة</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{review.coverage}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {review.questionCount} سؤال
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {review.durationMinutes} دقيقة
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={status === "current" ? "primary" : "outline"}
                    disabled={status === "locked"}
                    className="shrink-0"
                  >
                    <Play className="h-4 w-4" />
                    {status === "completed" ? "إعادة" : "ابدأ المراجعة"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FinalReviewSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

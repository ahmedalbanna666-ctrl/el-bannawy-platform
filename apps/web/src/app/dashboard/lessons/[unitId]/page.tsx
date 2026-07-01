"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Play,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
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

interface UnitDetail {
  id: string;
  title: string;
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
    units: UnitDetail[];
  }[];
}

type LessonStatus = "completed" | "current" | "locked";

function getLessonStatus(index: number): LessonStatus {
  if (index < 2) return "completed";
  if (index === 2) return "current";
  return "locked";
}

const STATUS_BORDER: Record<LessonStatus, string> = {
  completed: "border-primary-500/60",
  current: "border-success-500/60 shadow-[0_0_18px_rgba(16,185,129,0.12)]",
  locked: "border-neutral-200 dark:border-neutral-700 opacity-50",
};

export default function LessonListPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const unitId = params.unitId as string;

  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUnit = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<Stage[]>("/curriculum");
      if (!response.data) {
        setError("فشل تحميل بيانات الوحدة");
        return;
      }

      let found: UnitDetail | null = null;
      for (const stage of response.data) {
        for (const grade of stage.grades) {
          const match = grade.units.find((u) => u.id === unitId);
          if (match) {
            found = match;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        setError("الوحدة غير موجودة");
        return;
      }

      setUnit(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل بيانات الوحدة");
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void fetchUnit();
  }, [fetchUnit]);

  if (loading) return <LessonListSkeleton />;
  if (error) return <ErrorState title="خطأ" description={error} />;
  if (!unit) {
    return (
      <EmptyState
        title="الوحدة غير موجودة"
        description="الوحدة التي تبحث عنها غير متوفرة"
        icon={<Play className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Unit {unit.displayOrder}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">اختر الدرس الذي تريد دراسته</p>
      </div>

      <div className="flex flex-col gap-3">
        {unit.lessons.map((lesson, idx) => {
          const status = getLessonStatus(idx);
          const isLocked = status === "locked";

          return (
            <Card
              key={lesson.id}
              variant="outline"
              padding="md"
              className={`transition-all duration-200 ${
                isLocked
                  ? "cursor-not-allowed"
                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
              } ${STATUS_BORDER[status]}`}
              onClick={(): void => {
                if (isLocked) return;
                router.push(`/dashboard/lessons/detail/${lesson.id}`);
              }}
              onKeyDown={(e): void => {
                if (isLocked) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/dashboard/lessons/detail/${lesson.id}`);
                }
              }}
              role={isLocked ? undefined : "button"}
              tabIndex={isLocked ? -1 : 0}
            >
              <CardContent>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      status === "completed"
                        ? "bg-primary-500/10"
                        : status === "current"
                          ? "bg-success-500/10"
                          : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary-500" />
                    ) : status === "locked" ? (
                      <Lock className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <Play className="h-5 w-5 text-success-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        {String(lesson.displayOrder).padStart(2, "0")}
                      </span>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {lesson.title}
                      </h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lesson.estimatedDuration} min
                      </span>
                      {lesson.quizEnabled && <span>• اختبار</span>}
                      {lesson.homeworkEnabled && <span>• واجب</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {status === "completed" && (
                      <Badge variant="success" className="text-[10px]">
                        مكتمل
                      </Badge>
                    )}
                    {status === "current" && (
                      <Badge variant="success" className="text-[10px] bg-success-500/15 text-success-600">
                        الدرس الحالي
                      </Badge>
                    )}
                    {status === "locked" && (
                      <span className="text-[11px] text-neutral-400">مغلق</span>
                    )}
                    {!isLocked && (
                      <ArrowRight className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="md"
        onClick={(): void => { router.push("/dashboard/units"); }}
        className="mx-auto"
      >
        رجوع للوحدات
      </Button>
    </div>
  );
}

function LessonListSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mx-auto h-12 w-40 rounded-xl" />
    </div>
  );
}

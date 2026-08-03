"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { UnitLockOverlay } from "@/components/coins/unit-lock-overlay";
import { LibraryBig, Play, Clock, Lock, ArrowRight } from "lucide-react";

interface LessonSummary {
  id: string;
  title: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  locked: boolean;
  lockedOverride: boolean | null;
  sequentialMode: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
}

interface Unit {
  id: string;
  title: string;
  displayOrder: number;
  isPremium: boolean;
  unlocked: boolean;
  termId: string | null;
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

const LECTURE_ORDINALS = [
  "الأولى",
  "الثانية",
  "الثالثة",
  "الرابعة",
  "الخامسة",
  "السادسة",
  "السابعة",
  "الثامنة",
  "التاسعة",
  "العاشرة",
  "الحادية عشرة",
  "الثانية عشرة",
  "الثالثة عشرة",
  "الرابعة عشرة",
  "الخامسة عشرة",
  "السادسة عشرة",
  "السابعة عشرة",
  "الثامنة عشرة",
  "التاسعة عشرة",
  "العشرون",
];

function lectureName(index: number): string {
  return index < LECTURE_ORDINALS.length
    ? `المحاضرة ${LECTURE_ORDINALS[index]}`
    : `المحاضرة ${String(index + 1)}`;
}

export function FinalReviewLecturesView(): ReactNode {
  const router = useRouter();
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  const { data: stages, isLoading, isError, error } = useQuery({
    queryKey: ["curriculum", "FINAL_REVIEW"],
    queryFn: async () => {
      const res = await api.get<Stage[]>("/curriculum?unitType=FINAL_REVIEW");
      return res.data ?? [];
    },
    staleTime: 300_000,
  });

  const lectures = (stages ?? [])
    .flatMap((stage) => stage.grades.flatMap((grade) => grade.units))
    .flatMap((unit) => unit.lessons.map((lesson) => ({ unit, lesson })))
    .sort((a, b) => a.lesson.displayOrder - b.lesson.displayOrder);

  if (isLoading) return <LecturesSkeleton />;
  if (isError) return <ErrorState title="فشل تحميل المحاضرات" description={error instanceof Error ? error.message : "حدث خطأ"} />;

  if (lectures.length === 0) {
    return (
      <EmptyState
        title="لا توجد محاضرات متاحة"
        description="يتم إعداد محاضرات المراجعة النهائية حالياً"
        icon={<LibraryBig className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          محاضرات المراجعات
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          قائمة محاضرات المراجعة النهائية — اضغط على المحاضرة للانتقال إلى محتواها
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {lectures.map(({ unit, lesson }, idx) => {
          const locked = (unit.isPremium && !unit.unlocked) || lesson.locked;

          const openLecture = (): void => {
            if (locked) {
              setOpenUnitId(unit.id);
              return;
            }
            router.push(`/dashboard/lessons/detail/${lesson.id}`);
          };

          return (
            <Card
              key={lesson.id}
              variant="outline"
              padding="md"
              className={`transition-all duration-200 ${
                locked
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
              } border-neutral-200 dark:border-neutral-700`}
              onClick={openLecture}
              onKeyDown={(e): void => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openLecture();
                }
              }}
              role={locked ? undefined : "button"}
              tabIndex={locked ? -1 : 0}
            >
              <CardContent>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      locked ? "bg-neutral-200 dark:bg-neutral-700" : "bg-success-500/10"
                    }`}
                  >
                    {locked ? (
                      <Lock className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <Play className="h-5 w-5 text-success-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-primary-500">
                        {lectureName(idx)}
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
                    {locked && (
                      <span className="text-[11px] text-neutral-400">مغلق</span>
                    )}
                    {!locked && (
                      <ArrowRight className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
                    )}
                  </div>
                </div>
              </CardContent>

              {openUnitId === unit.id && (
                <UnitLockOverlay
                  unitId={unit.id}
                  unitTitle={unit.title}
                  termId={unit.termId ?? undefined}
                  open
                  onOpenChange={(o): void => { setOpenUnitId(o ? unit.id : null); }}
                />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LecturesSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

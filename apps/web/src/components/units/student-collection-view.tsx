"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { UnitLockOverlay } from "@/components/coins/unit-lock-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Clock, Lock, ArrowRight } from "lucide-react";
import {
  type UnitTypeValue,
  getUnitTypeCopy,
  getDetailHref,
} from "@/lib/unit-type-config";

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
  description: string | null;
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

interface StudentCollectionViewProps {
  readonly unitType: UnitTypeValue;
}

export function StudentCollectionView({
  unitType,
}: StudentCollectionViewProps): ReactNode {
  const router = useRouter();
  const copy = getUnitTypeCopy(unitType);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  const { data: stages, isLoading, isError, error } = useQuery({
    queryKey: ["curriculum", unitType],
    queryFn: async () => {
      const res = await api.get<Stage[]>(`/curriculum?unitType=${unitType}`);
      return res.data ?? [];
    },
    staleTime: 300_000,
  });

  const allUnits = (stages ?? []).flatMap((stage) =>
    stage.grades.flatMap((grade) => grade.units),
  );

  const sortedUnits = [...allUnits].sort((a, b) => a.displayOrder - b.displayOrder);

  if (isLoading) return <CollectionSkeleton />;
  if (isError) return <ErrorState title={`فشل تحميل ${copy.plural}`} description={error instanceof Error ? error.message : "حدث خطأ"} />;

  if (sortedUnits.length === 0) {
    return (
      <EmptyState
        title={copy.emptyTitle}
        description={copy.emptyDescription}
        icon={<copy.icon className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {copy.studentTitle}
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">{copy.studentSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedUnits.map((unit) => {
          const locked = unit.isPremium && !unit.unlocked;
          const duration = unit.lessons.reduce((acc, l) => acc + l.estimatedDuration, 0);

          const open = (): void => {
            if (locked) {
              setOpenUnitId(unit.id);
              return;
            }
            router.push(getDetailHref(unitType, unit.id));
          };

          return (
            <Card
              key={unit.id}
              variant="elevated"
              padding="none"
              className="flex flex-col"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
                        <copy.icon className="h-4.5 w-4.5 text-primary-500" />
                      </span>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {unit.title}
                      </h3>
                    </div>
                  </div>
                  {locked && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {unit.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {unit.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-4 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {String(unit.lessons.length)} {copy.childPlural}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {String(duration)} دقيقة
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={open}
                >
                  <ArrowRight className="h-4 w-4" />
                  {copy.startLabel}
                </Button>
              </CardContent>

              {locked && (
                <UnitLockOverlay
                  unitId={unit.id}
                  unitTitle={unit.title}
                  termId={unit.termId ?? undefined}
                  open={openUnitId === unit.id}
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

function CollectionSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

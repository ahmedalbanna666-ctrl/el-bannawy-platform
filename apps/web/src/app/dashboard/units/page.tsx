"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BookOpen, ChevronDown, ChevronRight, Lock, Play, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function UnitsPage(): ReactNode {
  const [stages, setStages] = useState<Stage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCurriculum(): Promise<void> {
      try {
        const response = await api.get<Stage[]>("/curriculum");
        if (response.data) {
          setStages(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load curriculum");
      } finally {
        setLoading(false);
      }
    }
    void fetchCurriculum();
  }, []);

  const toggleUnit = (unitId: string): void => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  if (loading) {
    return <UnitsSkeleton />;
  }

  if (error) {
    return <ErrorState title="Failed to load curriculum" description={error} />;
  }

  if (stages.length === 0) {
    return (
      <EmptyState
        title="No curriculum available"
        description="Curriculum content is being created."
        icon={<BookOpen className="h-16 w-16" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Curriculum</h1>
        <p className="mt-1 text-sm text-neutral-500">Browse all units and track your progress</p>
      </div>

      {stages.map((stage) => (
        <div key={stage.id}>
          <h2 className="mb-3 text-lg font-semibold text-neutral-700 dark:text-neutral-300">{stage.name}</h2>

          {stage.grades.map((grade) => (
            <div key={grade.id} className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">{grade.name}</h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grade.units.map((unit) => {
                  const isExpanded = expandedUnits.has(unit.id);

                  return (
                    <Card key={unit.id} variant="elevated" padding="md">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                              <BookOpen className="h-5 w-5 text-primary-500" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                                Unit {unit.displayOrder}
                              </h4>
                              <p className="text-sm text-neutral-500">{unit.title}</p>
                            </div>
                          </div>
                          <span className="text-xs text-neutral-400">{unit.lessons.length} lessons</span>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={(): void => { toggleUnit(unit.id); }}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{isExpanded ? "Hide Lessons" : "Show Lessons"}</span>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>

                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {unit.lessons.map((lesson) => (
                              <a
                                key={lesson.id}
                                href={`/dashboard/lessons/${lesson.id}`}
                                className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/10">
                                  {lesson.isPremium ? (
                                    <Star className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <Play className="h-4 w-4 text-success-500" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                    {lesson.displayOrder}. {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                                    <Clock className="h-3 w-3" />
                                    <span>{lesson.estimatedDuration} min</span>
                                    {lesson.quizEnabled && <span>• Quiz</span>}
                                    {lesson.homeworkEnabled && <span>• Homework</span>}
                                  </div>
                                </div>
                                {lesson.isPremium && (
                                  <Lock className="h-4 w-4 text-yellow-500" />
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function UnitsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

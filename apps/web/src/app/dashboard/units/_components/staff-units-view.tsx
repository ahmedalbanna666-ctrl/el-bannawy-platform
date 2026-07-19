"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContext } from "@/lib/academic-context-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BookOpen, ArrowRight, Layers, Clock } from "lucide-react";

interface UnitView {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly displayOrder: number;
  readonly published: boolean;
  readonly updatedAt: string;
  readonly grade: {
    readonly id: string;
    readonly name: string;
    readonly stage: { readonly id: string; readonly name: string };
  };
  readonly _count: { readonly lessons: number };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StaffUnitsView(): ReactNode {
  const router = useRouter();
  const academicContext = useAcademicContext();

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (academicContext.gradeId) params.set("gradeId", academicContext.gradeId);
    if (academicContext.academicYearId) params.set("academicYearId", academicContext.academicYearId);
    if (academicContext.termId) params.set("termId", academicContext.termId);
    if (academicContext.educationalSystem) params.set("educationalSystem", academicContext.educationalSystem);
    return params.toString();
  }, [academicContext]);

  const { data: units, isLoading, isError, error } = useQuery({
    queryKey: ["staff-units", filterParams],
    queryFn: async () => {
      const endpoint = `/curriculum/units${filterParams ? `?${filterParams}` : ""}`;
      const res = await api.get<UnitView[]>(endpoint);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const sortedUnits = useMemo(
    () => [...(units ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [units],
  );

  if (isLoading) return <UnitsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الوحدات"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          الوحدات التعليمية
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          عرض الوحدات التعليمية — صلاحية قراءة فقط
        </p>
      </div>

      {sortedUnits.length === 0 ? (
        <EmptyState
          title="لا توجد وحدات"
          description="لم يتم إنشاء أي وحدات تعليمية بعد."
          icon={<BookOpen className="h-16 w-16" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedUnits.map((unit) => (
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
                      <span className="text-[11px] font-semibold text-neutral-400">
                        #{String(unit.displayOrder)}
                      </span>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {unit.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {unit.grade.stage.name} — {unit.grade.name}
                    </p>
                  </div>
                  <Badge
                    variant={unit.published ? "success" : "warning"}
                    className="shrink-0 text-[10px]"
                  >
                    {unit.published ? "منشور" : "مسودة"}
                  </Badge>
                </div>

                {unit.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {unit.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-4 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {String(unit._count.lessons)} دروس
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeDate(unit.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={(): void => { router.push(`/dashboard/units/${unit.id}`); }}
                  >
                    <ArrowRight className="h-4 w-4" />
                    عرض
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UnitsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

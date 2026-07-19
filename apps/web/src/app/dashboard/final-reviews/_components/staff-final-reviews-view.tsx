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
import { BookMarked, ArrowRight, Layers, Clock } from "lucide-react";

interface FinalReviewView {
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
  readonly _count: { readonly sections: number };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StaffFinalReviewsView(): ReactNode {
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

  const { data: reviews, isLoading, isError, error } = useQuery({
    queryKey: ["staff-final-reviews", filterParams],
    queryFn: async () => {
      const endpoint = `/final-reviews/management${filterParams ? `?${filterParams}` : ""}`;
      const res = await api.get<FinalReviewView[]>(endpoint);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const sortedReviews = useMemo(
    () => [...(reviews ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [reviews],
  );

  if (isLoading) return <FinalReviewsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل المراجعات النهائية"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          المراجعات النهائية
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          عرض المراجعات النهائية — صلاحية قراءة فقط
        </p>
      </div>

      {sortedReviews.length === 0 ? (
        <EmptyState
          title="لا توجد مراجعات"
          description="لم يتم إنشاء أي مراجعات بعد."
          icon={<BookMarked className="h-16 w-16" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedReviews.map((review) => (
            <Card
              key={review.id}
              variant="elevated"
              padding="none"
              className="flex flex-col"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400">
                        #{String(review.displayOrder)}
                      </span>
                      <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {review.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {review.grade.stage.name} — {review.grade.name}
                    </p>
                  </div>
                  <Badge
                    variant={review.published ? "success" : "warning"}
                    className="shrink-0 text-[10px]"
                  >
                    {review.published ? "منشور" : "مسودة"}
                  </Badge>
                </div>

                {review.description && (
                  <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {review.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-4 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {String(review._count.sections)} أقسام
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeDate(review.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={(): void => { router.push(`/dashboard/final-reviews/${review.id}`); }}
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

function FinalReviewsSkeleton(): ReactNode {
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

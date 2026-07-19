"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BookMarked, Play, Clock, HelpCircle, Lock, CheckCircle2, ArrowLeft } from "lucide-react";

interface Section {
  id: string; title: string; description: string | null;
  questionCount: number; durationMinutes: number;
  displayOrder: number; published: boolean;
}

interface FinalReview {
  id: string; title: string; description: string | null;
  displayOrder: number; published: boolean;
  sections: Section[];
}

export default function FinalReviewPage(): ReactNode {
  const router = useRouter();
  const { isAdmin, isTeacher, isStaff } = usePermissions();

  useEffect(() => {
    if (isAdmin || isTeacher || isStaff) {
      router.replace("/dashboard/final-reviews");
    }
  }, [isAdmin, isTeacher, isStaff, router]);

  const { data: reviews, isLoading, isError, error } = useQuery({
    queryKey: ["final-reviews", "student"],
    queryFn: async () => { const r = await api.get<FinalReview[]>("/final-reviews"); return r.data ?? []; },
    staleTime: 300_000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (isError) return <ErrorState title="فشل تحميل المراجعة" description={error instanceof Error ? error.message : "حدث خطأ"} />;
  if (!reviews || reviews.length === 0) return <EmptyState title="المراجعة النهائية غير متاحة" description="ستصبح المراجعة النهائية متاحة خلال فترة المراجعة الرسمية" icon={<BookMarked className="h-16 w-16" />} />;

  return (
    <div className="flex flex-col gap-6">
      <button onClick={(): void => { router.push("/dashboard"); }} className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 w-fit"><ArrowLeft className="h-4 w-4" />العودة للرئيسية</button>
      <div><h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">المراجعة النهائية</h1><p className="mt-1 text-sm text-neutral-500">استعد للاختبارات بمراجعة شاملة</p></div>
      <div className="flex flex-col gap-3">
        {reviews.flatMap(r => r.sections).map((s, i) => {
          const status = i === 0 ? "current" as const : i === 1 ? "completed" as const : "locked" as const;
          const isLocked = status === "locked";
          return (
            <Card key={s.id} variant="outline" padding="md" className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${status === "completed" ? "border-success-500/60" : status === "current" ? "border-primary-500/60" : "border-neutral-200 dark:border-neutral-700"} ${isLocked ? "opacity-50" : "cursor-pointer"}`}>
              <CardContent><div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${status === "completed" ? "bg-success-500/10" : status === "current" ? "bg-primary-500/10" : "bg-neutral-200 dark:bg-neutral-700"}`}>
                  {status === "completed" ? <CheckCircle2 className="h-6 w-6 text-success-500" /> : isLocked ? <Lock className="h-6 w-6 text-neutral-400" /> : <BookMarked className="h-6 w-6 text-primary-500" />}
                </div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{s.title}</h3>{status === "completed" && <Badge variant="success" className="text-[10px]">مكتملة</Badge>}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400"><span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" />{s.questionCount} سؤال</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.durationMinutes} دقيقة</span></div>
                </div>
                <Button size="sm" variant={status === "current" ? "primary" : "outline"} disabled={isLocked} className="shrink-0"><Play className="h-4 w-4" />{status === "completed" ? "إعادة" : "ابدأ المراجعة"}</Button>
              </div></CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

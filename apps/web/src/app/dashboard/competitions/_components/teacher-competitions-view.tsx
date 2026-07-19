"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CompetitionFormDialog } from "./competition-form-dialog";
import { Gamepad2, Plus, Trophy, Users, Sparkles } from "lucide-react";

export interface TeacherCompetition {
  id: string;
  title: string;
  description: string | null;
  mode: "QUIZ" | "XP_SPRINT";
  status: "DRAFT" | "OPEN" | "CLOSED" | "FINALIZED";
  gradeId: string;
  xpReward: number | null;
  coinReward: number | null;
  participantCount?: number;
}

const STATUS_LABELS: Record<TeacherCompetition["status"], string> = {
  DRAFT: "مسودة",
  OPEN: "مفتوحة",
  CLOSED: "مغلقة",
  FINALIZED: "مكتملة",
};

export function TeacherCompetitionsView(): ReactNode {
  const userId = useAuthStore((s) => s.user?.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["teacher-competitions", userId],
    queryFn: async (): Promise<TeacherCompetition[]> => {
      const res = await api.get<TeacherCompetition[]>("/competitions/teacher");
      return res.data ?? [];
    },
    enabled: Boolean(userId),
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TeacherCompetition["status"];
    }): Promise<void> => {
      await api.patch(`/competitions/teacher/${id}/status`, { status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-competitions", userId] });
    },
  });

  const finalize = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.post(`/competitions/teacher/${id}/finalize`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher-competitions", userId] });
    },
  });

  if (isLoading) return <TeacherSkeleton />;
  if (isError) {
    return (
      <ErrorState
        title="تعذر تحميل المسابقات"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
        onRetry={() => void refetch()}
      />
    );
  }

  const list = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/10">
          <Gamepad2 className="h-6 w-6 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            المسابقات
          </h1>
          <p className="text-sm text-neutral-500">
            أنشئ المسابقات وتنافس مع طلابك
          </p>
        </div>
        <Button className="ms-auto" onClick={() => { setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          مسابقة جديدة
        </Button>
      </div>

      {list.length === 0 ? (
                  <EmptyState
          icon={<Gamepad2 className="h-16 w-16" />}
          title="لا توجد مسابقات بعد"
          description="ابدأ بإنشاء مسابقة جديدة لتحدي طلابك."
          actionLabel="إنشاء مسابقة"
          onAction={() => { setFormOpen(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} variant="elevated" padding="none">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {c.mode === "QUIZ" ? (
                      <Trophy className="h-5 w-5 text-primary-500" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-primary-500" />
                    )}
                    <h3 className="font-bold text-neutral-900 dark:text-neutral-100">
                      {c.title}
                    </h3>
                  </div>
                  <Badge
                    variant={
                      c.status === "OPEN"
                        ? "primary"
                        : c.status === "FINALIZED"
                          ? "secondary"
                          : "secondary"
                    }
                  >
                    {STATUS_LABELS[c.status]}
                  </Badge>
                </div>

                {c.description && (
                  <p className="text-xs text-neutral-500">{c.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-[11px] text-neutral-500">
                  <Badge variant="secondary">
                    {c.mode === "QUIZ" ? "معركة أسئلة" : "سباق نقاط"}
                  </Badge>
                  {c.xpReward ? <span>XP: {c.xpReward}</span> : null}
                  {c.coinReward ? <span>عملات: {c.coinReward}</span> : null}
                  {c.participantCount !== undefined ? (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.participantCount}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { router.push(`/dashboard/competitions/${c.id}`); }}
                  >
                    التفاصيل
                  </Button>
                  {c.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => { setStatus.mutate({ id: c.id, status: "OPEN" }); }}
                      disabled={setStatus.isPending}
                    >
                      فتح المسابقة
                    </Button>
                  )}
                  {c.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setStatus.mutate({ id: c.id, status: "CLOSED" }); }}
                      disabled={setStatus.isPending}
                    >
                      إغلاق
                    </Button>
                  )}
                  {(c.status === "OPEN" || c.status === "CLOSED") && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { finalize.mutate(c.id); }}
                      disabled={finalize.isPending}
                    >
                      إنهاء وترتيب الجوائز
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CompetitionFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); }}
        onCreated={(id) => { router.push(`/dashboard/competitions/${id}`); }}
      />
    </div>
  );
}

function TeacherSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

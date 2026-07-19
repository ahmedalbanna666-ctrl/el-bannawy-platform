"use client";

import { type ReactNode, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  Trophy,
  Sparkles,
  Users,
  Crown,
  Medal,
  ArrowRight,
} from "lucide-react";

interface CompetitionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface CompetitionDetail {
  id: string;
  title: string;
  description: string | null;
  mode: "QUIZ" | "XP_SPRINT";
  status: "DRAFT" | "OPEN" | "CLOSED" | "FINALIZED";
  gradeId: string;
  xpReward: number | null;
  coinReward: number | null;
  questions?: CompetitionQuestion[];
  participantStatus?: "INVITED" | "JOINED" | "SUBMITTED" | null;
  score?: number | null;
  correctCount?: number | null;
}

interface LeaderboardEntry {
  studentId: string;
  studentName: string;
  rank: number;
  score: number;
  xpGained: number;
  coinsRewarded: number;
}

const STATUS_LABELS: Record<CompetitionDetail["status"], string> = {
  DRAFT: "مسودة",
  OPEN: "مفتوحة",
  CLOSED: "مغلقة",
  FINALIZED: "مكتملة",
};

export default function CompetitionDetailPage(): ReactNode {
  const params = useParams<{ competitionId: string }>();
  const id = params.competitionId;
  const { isTeacher, isAdmin } = usePermissions();
  const canManage = isTeacher || isAdmin;
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<number, number>>({});

  const {
    data: competition,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["competition-detail", id],
    queryFn: async (): Promise<CompetitionDetail> => {
      const res = await api.get<CompetitionDetail>(`/competitions/${id}`);
      if (!res.data) throw new Error("بيانات المسابقة غير متوفرة");
      return res.data;
    },
    enabled: Boolean(id),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["competition-leaderboard", id],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await api.get<LeaderboardEntry[]>(
        `/competitions/${id}/leaderboard`,
      );
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const accept = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post(`/competitions/student/${id}/accept`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["competition-detail", id] });
    },
  });

  const submit = useMutation({
    mutationFn: async (): Promise<void> => {
      const payload = {
        answers: Object.entries(answers).map(([q, s]) => ({
          questionIndex: Number(q),
          selectedIndex: s,
        })),
      };
      await api.post(`/competitions/student/${id}/submit`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["competition-detail", id] });
    },
  });

  const invite = useMutation({
    mutationFn: async (studentIds: string[]): Promise<void> => {
      await api.post(`/competitions/teacher/${id}/invite`, { studentIds });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["competition-detail", id] });
    },
  });

  if (isLoading) return <DetailSkeleton />;
  if (isError || !competition) {
    return (
      <ErrorState
        title="تعذر تحميل المسابقة"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
        onRetry={() => void refetch()}
      />
    );
  }

  const isQuiz = competition.mode === "QUIZ";
  const canSubmit =
    !canManage &&
    competition.status === "OPEN" &&
    competition.participantStatus === "JOINED" &&
    isQuiz;
  const hasSubmitted = competition.participantStatus === "SUBMITTED";

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="secondary"
        size="sm"
        className="w-fit"
        onClick={() => {
          history.back();
        }}
      >
        <ArrowRight className="h-4 w-4" />
        رجوع
      </Button>

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/10">
          {isQuiz ? (
            <Trophy className="h-6 w-6 text-primary-500" />
          ) : (
            <Sparkles className="h-6 w-6 text-primary-500" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {competition.title}
          </h1>
          {competition.description && (
            <p className="mt-1 text-sm text-neutral-500">{competition.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500">
            <Badge
              variant={
                competition.status === "OPEN"
                  ? "primary"
                  : competition.status === "FINALIZED"
                    ? "secondary"
                    : "secondary"
              }
            >
              {STATUS_LABELS[competition.status]}
            </Badge>
            <Badge variant="secondary">
              {isQuiz ? "معركة أسئلة" : "سباق نقاط"}
            </Badge>
            {competition.xpReward ? (
              <span>XP: {String(competition.xpReward)}</span>
            ) : null}
            {competition.coinReward ? (
              <span>عملات: {String(competition.coinReward)}</span>
            ) : null}
          </div>
        </div>
      </div>

      {!canManage && (
        <StudentActions
          status={competition.status}
          participantStatus={competition.participantStatus}
          score={competition.score}
          correctCount={competition.correctCount}
          onAccept={() => {
            accept.mutate();
          }}
          accepting={accept.isPending}
          onSelect={(q, o) => { setAnswers((p) => ({ ...p, [q]: o })); }}
          answers={answers}
          questions={competition.questions ?? []}
          canSubmit={canSubmit}
          hasSubmitted={hasSubmitted}
          onSubmit={() => {
            submit.mutate();
          }}
          submitting={submit.isPending}
        />
      )}

      {canManage && (
        <TeacherActions
          status={competition.status}
          onInvite={(studentIds) => {
            invite.mutate(studentIds);
          }}
          inviting={invite.isPending}
        />
      )}

      <Leaderboard entries={leaderboard ?? []} />
    </div>
  );
}

interface StudentActionsProps {
  status: CompetitionDetail["status"];
  participantStatus?: string | null;
  score?: number | null;
  correctCount?: number | null;
  onAccept: () => void;
  accepting: boolean;
  onSelect: (q: number, o: number) => void;
  answers: Record<number, number>;
  questions: CompetitionQuestion[];
  canSubmit: boolean;
  hasSubmitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

function StudentActions({
  status,
  participantStatus,
  score,
  correctCount,
  onAccept,
  accepting,
  onSelect,
  answers,
  questions,
  canSubmit,
  hasSubmitted,
  onSubmit,
  submitting,
}: StudentActionsProps): ReactNode {
  if (status !== "OPEN") {
    return (
      <Card variant="elevated" padding="none">
        <CardContent className="p-5 text-sm text-neutral-500">
          هذه المسابقة غير مفتوحة حالياً للإجابة.
        </CardContent>
      </Card>
    );
  }

  if (participantStatus === "INVITED") {
    return (
      <Button onClick={onAccept} disabled={accepting}>
        قبول التحدي والانضمام
      </Button>
    );
  }

  if (hasSubmitted) {
    return (
      <Card variant="elevated" padding="none">
        <CardContent className="flex items-center gap-3 p-5">
          <CheckCircle />
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              تم تسليم إجابتك
            </p>
            {score !== undefined && score !== null && (
              <p className="text-sm text-primary-600">
                نتيجتك: {String(score)} نقطة ({String(correctCount ?? 0)} إجابة صحيحة)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canSubmit) return null;

  return (
    <Card variant="elevated" padding="none">
      <CardContent className="flex flex-col gap-4 p-5">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">
          أجب على الأسئلة
        </h2>
        {questions.map((q, qi) => (
          <div key={qi} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {String(qi + 1)}. {q.question}
            </p>
            <div className="flex flex-col gap-1">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                >
                  <input
                    type="radio"
                    name={`q-${String(qi)}`}
                    checked={answers[qi] === oi}
                    onChange={() => { onSelect(qi, oi); }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button
          onClick={onSubmit}
          disabled={submitting || Object.keys(answers).length < questions.length}
        >
          {submitting ? "جارٍ التسليم..." : "تسليم الإجابات"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CheckCircle(): ReactNode {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
      <Trophy className="h-5 w-5" />
    </div>
  );
}

interface TeacherActionsProps {
  status: CompetitionDetail["status"];
  onInvite: (studentIds: string[]) => void;
  inviting: boolean;
}

function TeacherActions({
  status,
  onInvite,
  inviting,
}: TeacherActionsProps): ReactNode {
  const [studentId, setStudentId] = useState("");

  return (
    <Card variant="elevated" padding="none">
      <CardContent className="flex flex-col gap-3 p-5">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">
          دعوة الطلاب
        </h2>
        <p className="text-xs text-neutral-500">
          أدخل معرّف الطالب لدعوته للمشاركة في هذه المسابقة (ضمن نفس الصف).
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            placeholder="معرّف الطالب"
            value={studentId}
            onChange={(e) => { setStudentId(e.target.value); }}
          />
          <Button
            disabled={inviting || !studentId.trim()}
            onClick={() => {
              if (studentId.trim()) {
                onInvite([studentId.trim()]);
                setStudentId("");
              }
            }}
          >
            <Users className="h-4 w-4" />
            دعوة
          </Button>
        </div>
        {status === "OPEN" && (
          <p className="text-xs text-neutral-400">
            يمكنك إغلاق المسابقة وإنهاؤها من صفحة القائمة الرئيسية للمسابقات.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

function Leaderboard({ entries }: LeaderboardProps): ReactNode {
  return (
    <Card variant="elevated" padding="none">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">
            لوحة المتصدرين
          </h2>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-neutral-500">لا توجد نتائج بعد.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((e) => (
              <div
                key={e.studentId}
                className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/10 text-xs font-bold text-primary-600">
                  {e.rank === 1 ? (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  ) : e.rank === 2 ? (
                    <Medal className="h-4 w-4 text-neutral-400" />
                  ) : (
                    e.rank
                  )}
                </div>
                <span className="flex-1 truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {e.studentName}
                </span>
                <span className="text-sm font-semibold text-primary-600">
                  {String(e.score)} نقطة
                </span>
                {e.xpGained ? (
                  <span className="text-[11px] text-neutral-400">
                    +{String(e.xpGained)} XP
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

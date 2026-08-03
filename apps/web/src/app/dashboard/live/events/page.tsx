"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gift, MessageCircleQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/live/event-card";
import { LiveEmpty } from "@/components/live/live-empty";
import { LiveError } from "@/components/live/live-error";
import { useLiveSessions, type LiveSessionItem } from "@/lib/live-api";

export default function EventsPage(): ReactNode {
  const router = useRouter();
  const { data: sessions, isLoading, isError, refetch } = useLiveSessions();
  const [questionTarget, setQuestionTarget] = useState<LiveSessionItem | null>(null);

  const events = useMemo(
    () =>
      (sessions ?? [])
        .filter(
          (s) =>
            ["PUBLISHED", "SCHEDULED", "OPEN"].includes(s.status) &&
            new Date(s.startTime) > new Date(),
        )
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [sessions],
  );

  const handleJoin = (session: LiveSessionItem): void => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button
          onClick={(): void => { router.push("/dashboard/live"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للحصص المباشرة
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              فعاليات مباشرة مجانية
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              جلسات أسبوعية مجانية — انضم واسأل معلمك مباشرة.
            </p>
          </div>
        </div>
      </div>

      {isError && (
        <LiveError
          kind="offline"
          onAction={(): void => { void refetch(); }}
          secondaryLabel="العودة"
          onSecondary={(): void => { router.push("/dashboard/live"); }}
        />
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-3xl border border-neutral-200 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <LiveEmpty
          tone="violet"
          icon={<Gift className="h-10 w-10" />}
          title="لا توجد فعاليات مجدولة"
          description="تابع الإشعارات لمعرفة الفعاليات المجانية القادمة."
        />
      )}

      {!isLoading && !isError && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((session) => (
            <EventCard
              key={session.id}
              session={session}
              onJoin={handleJoin}
              onQuestions={setQuestionTarget}
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(questionTarget)} onClose={() => { setQuestionTarget(null); }} title="اطرح سؤالاً">
        <DialogContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
                <MessageCircleQuestion className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {questionTarget?.title}
                </p>
                <p className="text-xs text-neutral-500">
                  {questionTarget?.teacher.fullName}
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              ستتمكن من طرح أسئلتك مباشرة للمعلم أثناء البث. اضغط «انضم الآن» من بطاقة الفعالية لحضور البث.
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="primary" size="sm" onClick={() => { setQuestionTarget(null); }}>
            فهمت
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

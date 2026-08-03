"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useReferralOverview, type ReferralHistoryItem } from "@/lib/referral/referral-api";
import {
  Gift,
  Users,
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Share2,
  MessageCircle,
} from "lucide-react";

const STATUS_BADGE: Record<string, { variant: "warning" | "success" | "danger"; label: string }> = {
  PENDING: { variant: "warning", label: "بانتظار اشتراك الصديق" },
  APPROVED: { variant: "success", label: "تمت المكافأة" },
  REJECTED: { variant: "danger", label: "مرفوضة" },
};

function ReferralHistoryCard({ item }: { item: ReferralHistoryItem }): ReactNode {
  const badge = STATUS_BADGE[item.status] ?? { variant: "secondary" as const, label: item.status };
  const statusIcon =
    item.status === "APPROVED" ? <CheckCircle2 className="h-4 w-4 text-success-500" /> :
    item.status === "REJECTED" ? <XCircle className="h-4 w-4 text-danger-500" /> :
    <Clock className="h-4 w-4 text-warning-500" />;

  return (
    <Card variant="outline" padding="md">
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
              <Users className="h-5 w-5 text-primary-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                {item.referred?.fullName ?? "طالب جديد"}
              </p>
              <p className="text-xs text-neutral-500">
                {new Date(item.createdAt).toLocaleDateString("ar-SA")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {item.rewardCoins > 0 && (
              <Badge variant="primary">
                <Coins className="h-3 w-3" /> {item.rewardCoins} عملة
              </Badge>
            )}
            <Badge variant={badge.variant} className="gap-1">
              {statusIcon}
              {badge.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentReferralPage(): ReactNode {
  const { data: overview, isLoading, isError, refetch } = useReferralOverview();
  const [copied, setCopied] = useState(false);

  const sharePayload = useMemo(() => {
    if (!overview?.link) return null;
    return {
      title: "انضم إليّ على منصة البناوي",
      text: `سجّل حسابك الآن باستخدام كود الدعوة ${overview.code} واحصل على مكافآت!`,
      url: overview.link,
    };
  }, [overview]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!overview?.link) return;
    try {
      await navigator.clipboard.writeText(overview.link);
      setCopied(true);
      toast("تم نسخ رابط الدعوة");
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  }, [overview]);

  const handleShare = useCallback(async (): Promise<void> => {
    if (!sharePayload) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(sharePayload);
        return;
      } catch {
        // fall back to copy
      }
    }
    await handleCopy();
  }, [sharePayload, handleCopy]);

  if (isError) {
    return <ErrorState title="فشل تحميل صفحة الدعوات" onRetry={() => { void refetch(); }} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">ادعُ أصدقاءك</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          شارك كود دعوتك واحصل على مكافآت عند اشتراك أصدقائك
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : overview ? (
        <>
          <Card variant="elevated" padding="lg">
            <CardContent>
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
                  <Gift className="h-8 w-8 text-primary-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">كود الدعوة الخاص بك</h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    شارك الكود مع أصدقائك ليحصلوا على حساب جديد وتكسب مكافأة
                  </p>
                </div>

                <div className="w-full rounded-2xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 px-4 py-4">
                  <code dir="ltr" className="text-center font-mono text-3xl font-black tracking-[0.35em] text-primary-600 dark:text-primary-400">
                    {overview.code}
                  </code>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <Button variant="primary" fullWidth onClick={() => { void handleShare(); }}>
                    <Share2 className="h-5 w-5" /> مشاركة الرابط
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => { void handleCopy(); }}>
                    {copied ? <CheckCircle2 className="h-5 w-5 text-success-500" /> : <Copy className="h-5 w-5" />}
                    {copied ? "تم النسخ" : "نسخ الرابط"}
                  </Button>
                </div>

                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                    <p className="text-xl font-black text-primary-500">{overview.stats.totalInvitations}</p>
                    <p className="text-xs text-neutral-500">دعوة أُرسلت</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                    <p className="text-xl font-black text-warning-500">{overview.stats.pending}</p>
                    <p className="text-xs text-neutral-500">بانتظار الاشتراك</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                    <p className="text-xl font-black text-success-500">{overview.stats.approved}</p>
                    <p className="text-xs text-neutral-500">مكتملة</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                    <p className="text-xl font-black text-amber-500">{overview.stats.coinsEarned}</p>
                    <p className="text-xs text-neutral-500">عملة مكتسبة</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-500" />
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">أصدقاؤك المدعوون</h2>
              </div>
              <Badge variant="secondary">{overview.stats.totalInvitations}</Badge>
            </div>

            {overview.history.length === 0 ? (
              <EmptyState
                icon={<MessageCircle className="h-16 w-16" />}
                title="لا يوجد مدعوون بعد"
                description="شارك رابطك مع أصدقائك وابدأ في كسب المكافآت"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {overview.history.map((item) => (
                  <ReferralHistoryCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  useAdminCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useAdminReferrals,
  useReferralStats,
  useUpdateReferralStatus,
  type ReferralCampaignItem,
  type AdminReferralItem,
} from "@/lib/referral/referral-api";
import {
  Megaphone,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Coins,
  Clock,
  Percent,
  Calendar,
  Eye,
} from "lucide-react";

const STATUS_BADGE: Record<string, { variant: "warning" | "success" | "danger"; label: string }> = {
  PENDING: { variant: "warning", label: "بانتظار الاشتراك" },
  APPROVED: { variant: "success", label: "مكتملة" },
  REJECTED: { variant: "danger", label: "مرفوضة" },
};

const WEEK_DAYS = [
  { id: 0, label: "الأحد" },
  { id: 1, label: "الاثنين" },
  { id: 2, label: "الثلاثاء" },
  { id: 3, label: "الأربعاء" },
  { id: 4, label: "الخميس" },
  { id: 5, label: "الجمعة" },
  { id: 6, label: "السبت" },
];

function parseShowDays(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((d) => typeof d === "number")) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return [0, 1, 2, 3, 4, 5, 6];
}

function CampaignFormDialog({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign?: ReferralCampaignItem | null;
}): ReactNode {
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [message, setMessage] = useState(campaign?.message ?? "");
  const [unitRewardPercent, setUnitRewardPercent] = useState(String(campaign?.unitRewardPercent ?? 5));
  const [termRewardPercent, setTermRewardPercent] = useState(String(campaign?.termRewardPercent ?? 10));
  const [maxViewsPerDay, setMaxViewsPerDay] = useState(String(campaign?.maxViewsPerDay ?? 1));
  const [showDays, setShowDays] = useState<number[]>(parseShowDays(campaign?.showDaysPerWeek ?? "[0,1,2,3,4,5,6]"));
  const [startsAt, setStartsAt] = useState(campaign?.startsAt ? campaign.startsAt.slice(0, 16) : "");
  const [endsAt, setEndsAt] = useState(campaign?.endsAt ? campaign.endsAt.slice(0, 16) : "");
  const { mutateAsync: create, isPending: creating } = useCreateCampaign();
  const { mutateAsync: update, isPending: updating } = useUpdateCampaign();
  const isEdit = !!campaign;

  const toggleDay = useCallback((day: number): void => {
    setShowDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!title.trim() || !message.trim()) return;
    const payload = {
      title: title.trim(),
      message: message.trim(),
      unitRewardPercent: Math.max(0, Number(unitRewardPercent) || 0),
      termRewardPercent: Math.max(0, Number(termRewardPercent) || 0),
      maxViewsPerDay: Math.max(1, Number(maxViewsPerDay) || 1),
      showDaysPerWeek: JSON.stringify(showDays),
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    };
    try {
      if (isEdit) {
        await update({ id: campaign.id, data: payload });
        toast("تم تحديث الحملة");
      } else {
        await create(payload);
        toast("تم إنشاء الحملة");
      }
      onClose();
    } catch {
      /* handled */
    }
  }, [title, message, unitRewardPercent, termRewardPercent, maxViewsPerDay, showDays, startsAt, endsAt, isEdit, campaign, create, update, onClose]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold">{isEdit ? "تعديل الحملة" : "إنشاء حملة جديدة"}</h2>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input label="عنوان الحملة" value={title} onChange={(e) => { setTitle(e.target.value); }} required />
          <Textarea label="الرسالة" value={message} onChange={(e) => { setMessage(e.target.value); }} required />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="مكافأة الوحدة (%)"
              type="number"
              min={0}
              max={100}
              value={unitRewardPercent}
              onChange={(e) => { setUnitRewardPercent(e.target.value); }}
            />
            <Input
              label="مكافأة الترم (%)"
              type="number"
              min={0}
              max={100}
              value={termRewardPercent}
              onChange={(e) => { setTermRewardPercent(e.target.value); }}
            />
          </div>

          <Input
            label="أقصى عدد مرات ظهور يومياً"
            type="number"
            min={1}
            max={30}
            value={maxViewsPerDay}
            onChange={(e) => { setMaxViewsPerDay(e.target.value); }}
          />

          <div>
            <label className="mb-2 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">أيام الظهور</label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { toggleDay(d.id); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    showDays.includes(d.id)
                      ? "bg-primary-500 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="تاريخ البدء" type="datetime-local" value={startsAt} onChange={(e) => { setStartsAt(e.target.value); }} />
            <Input label="تاريخ الانتهاء" type="datetime-local" value={endsAt} onChange={(e) => { setEndsAt(e.target.value); }} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" loading={creating || updating} onClick={() => { void handleSubmit(); }} disabled={!title.trim() || !message.trim()}>
            {isEdit ? "حفظ التغييرات" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignsTab(): ReactNode {
  const { data: campaigns, isLoading, isError, refetch } = useAdminCampaigns();
  const { mutateAsync: deleteCampaign } = useDeleteCampaign();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReferralCampaignItem | null>(null);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;
    try {
      await deleteCampaign(id);
      toast("تم حذف الحملة");
    } catch {
      /* handled */
    }
  }, [deleteCampaign]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">حملات دعوة الأصدقاء</h1>
          <p className="mt-1 text-sm text-neutral-500">أنشئ حملات إعلانية تظهر للطلاب للترويج لكود الدعوة</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> إنشاء حملة
        </Button>
      </div>

      {isError && <ErrorState title="فشل تحميل الحملات" onRetry={() => { void refetch(); }} />}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} variant={c.active ? "elevated" : "outline"} padding="md">
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                        <Megaphone className="h-5 w-5 text-primary-500" />
                      </div>
                      <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{c.title}</h3>
                    </div>
                    <Badge variant={c.active ? "success" : "secondary"}>{c.active ? "نشطة" : "موقوفة"}</Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{c.message}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> وحدة {c.unitRewardPercent}% / ترم {c.termRewardPercent}%</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {c.maxViewsPerDay}/يوم</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c._count?.referrals ?? 0} دعوة</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> أنشئت {new Date(c.createdAt).toLocaleDateString("ar-SA")}</span>
                    {c.startsAt && <span>تبدأ {new Date(c.startsAt).toLocaleDateString("ar-SA")}</span>}
                    {c.endsAt && <span>تنتهي {new Date(c.endsAt).toLocaleDateString("ar-SA")}</span>}
                  </div>

                  <div className="flex gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                    <Button variant="outline" size="xs" onClick={() => { setEditTarget(c); setDialogOpen(true); }}>
                      تعديل
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => { void handleDelete(c.id); }}>
                      <Trash2 className="h-3 w-3" /> حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Megaphone className="h-16 w-16" />} title="لا توجد حملات" description="أنشئ أول حملة دعوة لتظهر للطلاب" />
      )}

      {dialogOpen && <CampaignFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditTarget(null); }} campaign={editTarget} />}
    </div>
  );
}

function ReferralsTab(): ReactNode {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAdminReferrals(statusFilter, page, 20);
  const { mutateAsync: updateStatus } = useUpdateReferralStatus();

  const handleResolve = useCallback(async (item: AdminReferralItem, status: "APPROVED" | "REJECTED"): Promise<void> => {
    if (status === "REJECTED" && !window.confirm("هل أنت متأكد من رفض هذه الدعوة؟")) return;
    try {
      await updateStatus({ id: item.id, status });
      toast(status === "APPROVED" ? "تمت الموافقة على الدعوة" : "تم رفض الدعوة");
    } catch {
      /* handled */
    }
  }, [updateStatus]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">دعوات الأصدقاء</h1>
        <p className="mt-1 text-sm text-neutral-500">مراجعة دعوات الطلاب ومكافآت الاشتراك</p>
      </div>

      <div className="flex gap-2">
        {[{ key: undefined, label: "الكل" }, { key: "PENDING", label: "بانتظار الاشتراك" }, { key: "APPROVED", label: "مكتملة" }, { key: "REJECTED", label: "مرفوضة" }].map((f) => (
          <button
            key={f.label}
            onClick={() => { setStatusFilter(f.key); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.key ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError && <ErrorState title="فشل تحميل الدعوات" onRetry={() => { void refetch(); }} />}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.data.map((item) => {
            const badge = STATUS_BADGE[item.status] ?? { variant: "secondary" as const, label: item.status };
            const statusIcon =
              item.status === "APPROVED" ? <CheckCircle2 className="h-4 w-4 text-success-500" /> :
              item.status === "REJECTED" ? <XCircle className="h-4 w-4 text-danger-500" /> :
              <Clock className="h-4 w-4 text-warning-500" />;
            return (
              <Card key={item.id} variant="outline" padding="md">
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
                        <Users className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {item.referred.fullName} <span className="text-xs font-normal text-neutral-400">← {item.referrer.fullName}</span>
                        </p>
                        <p className="text-sm text-neutral-500">
                          {item.purchasedType === "TERM" ? "اشتراك ترم" : item.purchasedType === "UNIT" ? "اشتراك وحدة" : "بانتظار أول اشتراك"}
                          {item.purchasedAmount !== null && ` • ${String(item.purchasedAmount)} ج`}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                          <span>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</span>
                          {item.rewardCoins > 0 && (
                            <span className="flex items-center gap-1 text-amber-500"><Coins className="h-3 w-3" /> {item.rewardCoins} عملة</span>
                          )}
                          {item.campaign && <span className="flex items-center gap-1"><Megaphone className="h-3 w-3" /> {item.campaign.title}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={badge.variant} className="gap-1">
                        {statusIcon}
                        {badge.label}
                      </Badge>
                      {item.status === "PENDING" && (
                        <>
                          <Button variant="success" size="xs" onClick={() => { void handleResolve(item, "APPROVED"); }}>
                            <CheckCircle2 className="h-3 w-3" /> موافقة
                          </Button>
                          <Button variant="danger" size="xs" onClick={() => { void handleResolve(item, "REJECTED"); }}>
                            <XCircle className="h-3 w-3" /> رفض
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); }}>
                السابق
              </Button>
              <span className="text-sm text-neutral-500">صفحة {page} من {data.meta.totalPages}</span>
              <Button variant="outline" size="xs" disabled={page >= data.meta.totalPages} onClick={() => { setPage((p) => p + 1); }}>
                التالي
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon={<Users className="h-16 w-16" />} title="لا توجد دعوات" description="لم يتم تسجيل أي دعوات بعد" />
      )}
    </div>
  );
}

function StatsTab(): ReactNode {
  const { data: stats, isLoading, isError, refetch } = useReferralStats();

  if (isError) {
    return <ErrorState title="فشل تحميل الإحصائيات" onRetry={() => { void refetch(); }} />;
  }

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  const items = [
    { label: "إجمالي الدعوات", value: stats.total, color: "text-primary-500" },
    { label: "بانتظار الاشتراك", value: stats.pending, color: "text-warning-500" },
    { label: "مكتملة", value: stats.approved, color: "text-success-500" },
    { label: "مرفوضة", value: stats.rejected, color: "text-danger-500" },
    { label: "عملات المكافآت", value: stats.coinsEarned, color: "text-amber-500" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">إحصائيات الدعوات</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <Card key={item.label} variant="outline" padding="md">
            <CardContent>
              <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
              <p className="mt-1 text-sm text-neutral-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card variant="outline" padding="md">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">معدل التحويل</p>
              <p className="text-xs text-neutral-500">نسبة الدعوات المكتملة من إجمالي الدعوات</p>
            </div>
            <p className="text-3xl font-black text-primary-500">{stats.conversionRate}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TABS = [
  { id: "campaigns", label: "الحملات" },
  { id: "referrals", label: "الدعوات" },
  { id: "stats", label: "الإحصائيات" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminReferralsPage(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabId>("campaigns");

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">دعوة الأصدقاء</h1>
        <p className="text-sm text-neutral-500">إدارة حملات الدعوة ومكافآت الاشتراك ودعوات الطلاب</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "campaigns" && <CampaignsTab />}
      {activeTab === "referrals" && <ReferralsTab />}
      {activeTab === "stats" && <StatsTab />}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useLivePricing,
  useUpdateLivePricing,
  usePaymentApprovals,
  useReviewPayment,
  PRODUCT_META,
  LIVE_PRODUCT_SESSIONS,
  liveProductCode,
  type LiveProductCode,
} from "@/lib/live-shop-api";
import {
  Banknote,
  CheckCircle2,
  Coins,
  Eye,
  ImageOff,
  Save,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";

const PRICING_ROWS: { code: LiveProductCode; tone: string }[] = [
  { code: "PRIVATE_PLAN_A", tone: "text-cyan-500" },
  { code: "PRIVATE_PLAN_B", tone: "text-cyan-500" },
  { code: "GROUP_PLAN_A", tone: "text-purple-500" },
  { code: "GROUP_PLAN_B", tone: "text-purple-500" },
  { code: "ONE_TIME", tone: "text-amber-500" },
  { code: "FREE", tone: "text-emerald-500" },
];

function PricingTab(): ReactNode {
  const { data: prices, isLoading } = useLivePricing();
  const { mutateAsync: save, isPending } = useUpdateLivePricing();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const draftValue = (code: LiveProductCode): string =>
    draft[code] ?? (prices ? String(prices[code]) : "");

  const handleSave = async (): Promise<void> => {
    const payload: Record<string, number> = {};
    for (const { code } of PRICING_ROWS) {
      const raw = draftValue(code).trim();
      const num = Number(raw);
      if (!raw || !Number.isFinite(num) || num < 0) {
        toast.error(`سعر غير صالح: ${PRODUCT_META[code].label}`);
        return;
      }
      payload[code] = num;
    }
    try {
      await save(payload);
      setDraft({});
      toast.success("تم حفظ أسعار الباقات");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ الأسعار");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          تحكم في أسعار باقات الحصص المباشرة — تُطبّق فور الحفظ.
        </p>
        <Button
          variant="primary"
          size="sm"
          loading={isPending}
          onClick={() => { void handleSave(); }}
          leftIcon={<Save className="h-4 w-4" />}
        >
          حفظ الأسعار
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : prices ? (
        <div className="grid gap-3 md:grid-cols-2">
          {PRICING_ROWS.map(({ code, tone }) => {
            const meta = PRODUCT_META[code];
            return (
              <div
                key={code}
                className="flex items-center gap-4 rounded-2xl border border-neutral-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-white/5 ${tone}`}>
                  {code.startsWith("PRIVATE") ? (
                    <Wallet className="h-6 w-6" />
                  ) : code.startsWith("GROUP") ? (
                    <Banknote className="h-6 w-6" />
                  ) : code === "ONE_TIME" ? (
                    <Coins className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {meta.label}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {LIVE_PRODUCT_SESSIONS[code]} حصص · {meta.short}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={draftValue(code)}
                    onChange={(e) => { setDraft((d) => ({ ...d, [code]: e.target.value })); }}
                    className="w-24 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm tabular-nums focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <span className="text-xs font-medium text-neutral-400">EGP</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Coins className="h-16 w-16" />} title="تعذر تحميل الأسعار" />
      )}
    </div>
  );
}

function ApprovalCard({ item }: { item: NonNullable<ReturnType<typeof usePaymentApprovals>["data"]>[number] }): ReactNode {
  const { mutateAsync: review, isPending } = useReviewPayment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");

  const code = liveProductCode(item.productType);
  const meta = code ? PRODUCT_META[code] : null;

  const handleReview = async (): Promise<void> => {
    if (decision === "REJECTED" && !note.trim()) {
      setError("يرجى كتابة سبب الرفض");
      return;
    }
    setError(null);
    try {
      await review({ paymentId: item.id, decision, adminNote: note.trim() || undefined });
      setDialogOpen(false);
      setNote("");
      toast.success(decision === "APPROVED" ? "تمت الموافقة وتفعيل الاشتراك" : "تم رفض العملية");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر مراجعة العملية");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {item.user.fullName}
            </span>
            <span dir="ltr" className="text-xs text-neutral-400">{item.user.mobileNumber ?? ""}</span>
            <Badge variant="warning">قيد المراجعة</Badge>
          </div>
          <div className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p>المنتج: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{meta?.label ?? item.productType}</span></p>
            <p>
              المبلغ: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{item.amount} {item.currency}</span>
            </p>
            <p>
              رقم العملية: <span dir="ltr" className="font-mono">{item.proofGatewayRef ?? "—"}</span>
            </p>
            <p>
              رقم المُرسِل: <span dir="ltr" className="font-mono">{item.proofSenderNumber ?? "—"}</span>
            </p>
            <p>
              رقم التحويل: <span dir="ltr" className="font-mono">{item.proofTransactionRef ?? "—"}</span>
            </p>
            <p className="text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString("ar-EG")}</p>
          </div>

          {item.proofScreenshot ? (
            <a
              href={item.proofScreenshot}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative mt-2 block w-fit overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
              aria-label="فتح صورة الإيصال"
            >
              <img
                src={item.proofScreenshot}
                alt="إيصال التحويل"
                className="h-24 w-36 object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Eye className="h-5 w-5 text-white" />
              </span>
            </a>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
              <ImageOff className="h-3.5 w-3.5" /> لم يرفق الطالب إيصالاً
            </p>
          )}
        </div>

        <div className="shrink-0 sm:self-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setDecision("APPROVED"); setError(null); setDialogOpen(true); }}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            مراجعة العملية
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={() => { if (!isPending) setDialogOpen(false); }} title="مراجعة تحويل انستا باي">
        <DialogContent>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {item.user.fullName}
            </span>
            <Badge variant="warning">قيد المراجعة</Badge>
          </div>
          <div className="mt-1 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p>المنتج: {meta?.label ?? item.productType}</p>
            <p>المبلغ: <span className="font-semibold">{item.amount} {item.currency}</span></p>
            <p>
              رقم العملية: <span dir="ltr" className="font-mono">{item.proofGatewayRef ?? "—"}</span>
            </p>
            <p>
              رقم المُرسِل: <span dir="ltr" className="font-mono">{item.proofSenderNumber ?? "—"}</span>
            </p>
            <p>
              رقم التحويل: <span dir="ltr" className="font-mono">{item.proofTransactionRef ?? "—"}</span>
            </p>
          </div>

          {item.proofScreenshot ? (
            <a href={item.proofScreenshot} target="_blank" rel="noopener noreferrer" className="block" aria-label="فتح الإيصال بالحجم الكامل">
              <img
                src={item.proofScreenshot}
                alt="إيصال التحويل"
                className="max-h-64 w-full rounded-lg border border-neutral-200 bg-neutral-50 object-contain dark:border-neutral-700 dark:bg-neutral-900"
              />
            </a>
          ) : (
            <p className="flex items-center gap-1.5 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <ImageOff className="h-4 w-4" /> لم يرفق الطالب إيصالاً
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => { setDecision("APPROVED"); setError(null); }}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  decision === "APPROVED"
                    ? "border-success-400/60 bg-success-500/10 text-success-600 dark:text-success-300"
                    : "border-neutral-200 text-neutral-500 dark:border-white/10 dark:text-neutral-400"
                }`}
              >
                <CheckCircle2 className="mb-1 h-5 w-5" />
                موافقة
              </button>
              <button
                onClick={() => { setDecision("REJECTED"); setError(null); }}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  decision === "REJECTED"
                    ? "border-danger-400/60 bg-danger-500/10 text-danger-600 dark:text-danger-300"
                    : "border-neutral-200 text-neutral-500 dark:border-white/10 dark:text-neutral-400"
                }`}
              >
                <XCircle className="mb-1 h-5 w-5" />
                رفض
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                ملاحظة (مطلوبة عند الرفض)
              </label>
              <Textarea
                placeholder="اكتب ملاحظة للطالب..."
                value={note}
                onChange={(e) => { setNote(e.target.value); setError(null); }}
                rows={2}
              />
              {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setNote(""); setError(null); }} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            variant={decision === "APPROVED" ? "primary" : "danger"}
            size="sm"
            loading={isPending}
            onClick={() => { void handleReview(); }}
          >
            {decision === "APPROVED" ? "موافقة وتفعيل الاشتراك" : "رفض العملية"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function ApprovalsTab(): ReactNode {
  const { data: approvals, isLoading } = usePaymentApprovals();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        مراجعة تحويلات انستا باي وتفعيل الاشتراكات بعد التأكد من الإيصال.
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : approvals && approvals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {approvals.map((item) => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ShieldCheck className="h-16 w-16" />}
          title="لا توجد عمليات بانتظار المراجعة"
          description="ستظهر تحويلات انستا باي هنا بعد إرسال الطلاب لإثبات الدفع."
        />
      )}
    </div>
  );
}

const TABS = [
  { id: "pricing", label: "أسعار الباقات" },
  { id: "approvals", label: "مراجعة انستا باي" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LiveAdminCommercePage(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabId>("pricing");

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          متجر الحصص المباشرة
        </h1>
        <p className="text-sm text-neutral-500">
          إدارة أسعار الباقات ومراجعة تحويلات انستا باي
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pricing" ? <PricingTab /> : <ApprovalsTab />}
    </div>
  );
}

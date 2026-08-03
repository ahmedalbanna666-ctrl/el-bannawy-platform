"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Coins, ShoppingCart, Ticket, History, ArrowLeft, CheckCircle2, Gift,
  Copy, Send, X, Upload,
} from "lucide-react";
import {
  useCoinPackages,
  useCoinWallet,
  useRedeemCode,
  useMyPurchases,
  useMyUnlocks,
  type CoinPackageItem,
} from "@/lib/coins/coins-api";
import {
  useTransferNumbers,
  useSubmitOrder,
  useMyOrders,
  type TransferNumber,
} from "@/lib/coins/manual-payment-api";

const TABS = [
  { key: "packages", label: "باقات العملات", icon: ShoppingCart },
  { key: "redeem", label: "رمز التفعيل", icon: Ticket },
  { key: "history", label: "السجل", icon: History },
] as const;

const GATEWAY_LABELS: Record<string, string> = {
  INSTAPAY: "انستا باي",
  WALLET: "محفظة إلكترونية",
};

function CoinBalance({ balance }: { balance: number }): ReactNode {
  return (
    <Card variant="gradient" padding="md">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
              <Coins className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-white/70">رصيد العملات</p>
              <p className="text-2xl font-bold text-white">{balance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderModal({ pkg, numbers, onClose, onSubmit }: {
  pkg: CoinPackageItem;
  numbers: TransferNumber[];
  onClose: () => void;
  onSubmit: (dto: { packageId: string; amount: number; coinAmount: number; gateway: string; transferNumber: string; senderNumber: string; transactionRef: string; screenshot?: string }) => Promise<void>;
}): ReactNode {
  const [gateway, setGateway] = useState("INSTAPAY");
  const [selectedNumbers, setSelectedNumbers] = useState<TransferNumber[]>([]);
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = numbers.filter((n) => n.gateway === gateway);
  const canSubmit = selectedNumbers.length > 0 && senderNumber.trim().length > 0 && transactionRef.trim().length > 0;

  const handleCopy = async (text: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => { setCopiedId(null); }, 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-800 max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">طلب شراء {pkg.name}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">المبلغ</p>
          <p className="text-2xl font-bold text-amber-500">{pkg.price.toLocaleString()} EGP</p>
          <p className="text-xs text-neutral-400">تحصل على <span className="font-bold">{pkg.coinAmount.toLocaleString()}</span> عملة</p>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">طريقة الدفع</label>
          <div className="flex gap-2">
            {["INSTAPAY", "WALLET"].map((g) => (
              <button key={g} onClick={() => { setGateway(g); setSelectedNumbers([]); }}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  gateway === g
                    ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-600"
                }`}>
                {GATEWAY_LABELS[g] ?? g}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">اختر رقم التحويل</label>
            <div className="flex flex-col gap-2">
              {filtered.map((n) => {
                const isSelected = selectedNumbers.some((s) => s.id === n.id);
                return (
                  <button key={n.id} onClick={() => { setSelectedNumbers(isSelected ? [] : [n]); }}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-right transition-all ${
                      isSelected
                        ? "border-primary-500 bg-primary-500/5"
                        : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-600 dark:hover:border-neutral-500"
                    }`}>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{n.label}</p>
                      <p className="text-xs text-neutral-500" dir="ltr">{n.number}</p>
                      {n.accountName && <p className="text-[10px] text-neutral-400">{n.accountName}</p>}
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <div onClick={(e) => { e.stopPropagation(); void handleCopy(n.number, n.id); }}
                          role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); void handleCopy(n.number, n.id); } }}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                          {copiedId === n.id ? <CheckCircle2 className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-primary-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Input label="رقم المُرسِل" placeholder="رقم هاتفك أو محفظتك"
            value={senderNumber} onChange={(e) => { setSenderNumber(e.target.value); }} dir="ltr" />
          <Input label="رقم العملية (Transaction ID)" placeholder="أدخل رقم العملية من الإيصال"
            value={transactionRef} onChange={(e) => { setTransactionRef(e.target.value); }} dir="ltr" />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">إيصال التحويل</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 transition-colors hover:border-primary-400 hover:text-primary-500 dark:border-neutral-600 dark:hover:border-primary-400">
              <Upload className="h-4 w-4" />
              <span>{screenshotName || "اختر صورة الإيصال"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setScreenshotName(file.name);
                const reader = new FileReader();
                reader.onload = (): void => { setScreenshot(reader.result as string); };
                reader.readAsDataURL(file);
              }} />
            </label>
            {screenshot && (
              <img src={screenshot} alt="الإيصال" className="mt-2 max-h-32 rounded-lg object-cover" />
            )}
          </div>
          <p className="text-xs text-neutral-400">بعد تأكيد الطلب، سيقوم فريق الدعم بمراجعة طلبك وإضافة العملات إلى محفظتك عند الموافقة.</p>
        </div>

        <div className="mt-5 flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>إلغاء</Button>
          <Button variant="primary" fullWidth loading={submitting} disabled={!canSubmit}
            onClick={(): void => {
              void (async (): Promise<void> => {
                setSubmitting(true);
                try {
                  await onSubmit({
                    packageId: pkg.id, amount: pkg.price, coinAmount: pkg.coinAmount,
                    gateway, transferNumber: selectedNumbers[0]?.number ?? "",
                    senderNumber, transactionRef, screenshot: screenshot ?? undefined,
                  });
                } finally { setSubmitting(false); }
              })();
            }}>
            <Send className="h-4 w-4" /> تأكيد الطلب
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrderSuccessModal({ onClose }: { onClose: () => void }): ReactNode {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-neutral-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-500/10">
          <CheckCircle2 className="h-8 w-8 text-success-500" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">تم إرسال الطلب</h3>
        <p className="mt-2 text-sm text-neutral-500">سيقوم فريق الدعم بمراجعة طلبك في أقرب وقت. ستتم إضافة العملات إلى محفظتك فور الموافقة.</p>
        <Button variant="primary" fullWidth className="mt-6" onClick={onClose}>حسناً</Button>
      </div>
    </div>
  );
}

function PackagesTab(): ReactNode {
  const { data: packages, isLoading, isError, refetch } = useCoinPackages();
  const { data: wallet, refetch: refetchWallet } = useCoinWallet();
  const { data: numbers } = useTransferNumbers();
  const { mutateAsync: submitOrder } = useSubmitOrder();
  const [buyingPkg, setBuyingPkg] = useState<CoinPackageItem | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = useCallback(async (dto: { packageId: string; amount: number; coinAmount: number; gateway: string; transferNumber: string; senderNumber: string; transactionRef: string; screenshot?: string }) => {
    await submitOrder(dto);
    setBuyingPkg(null);
    setShowSuccess(true);
    await refetchWallet();
  }, [submitOrder, refetchWallet]);

  if (isError) return <ErrorState title="فشل تحميل الباقات" onRetry={() => { void refetch(); }} />;

  return (
    <div className="flex flex-col gap-4">
      {wallet && <CoinBalance balance={wallet.balance} />}

      {buyingPkg && numbers && (
        <OrderModal pkg={buyingPkg} numbers={numbers} onClose={() => { setBuyingPkg(null); }}
          onSubmit={async (dto) => { await handleSubmit(dto); }} />
      )}
      {showSuccess && <OrderSuccessModal onClose={() => { setShowSuccess(false); }} />}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="outline" padding="md">
              <CardContent>
                <div className="flex flex-col items-center gap-3 animate-pulse">
                  <div className="h-16 w-16 rounded-2xl bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-5 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-8 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : packages && packages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} variant="elevated" padding="md">
              <CardContent>
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                    <Coins className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{pkg.name}</h3>
                    {pkg.description && <p className="mt-1 text-sm text-neutral-500">{pkg.description}</p>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-amber-500">{pkg.coinAmount.toLocaleString()}</span>
                    <span className="text-sm text-neutral-400">عملة</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    بسعر <span className="font-bold text-primary-500">{pkg.price.toLocaleString()} EGP</span>
                  </div>
                  <Button variant="primary" size="sm" fullWidth
                    onClick={() => { setBuyingPkg(pkg); }}>
                    <ShoppingCart className="h-4 w-4" /> اشتر الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Gift className="h-16 w-16" />} title="لا توجد باقات متاحة حالياً" description="سيتم إضافة باقات قريباً" />
      )}
    </div>
  );
}

function RedeemTab(): ReactNode {
  const [code, setCode] = useState("");
  const { mutateAsync: redeem, isPending } = useRedeemCode();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleRedeem = useCallback(async () => {
    if (!code.trim()) return;
    setError(""); setSuccess(false);
    try {
      await redeem(code.trim());
      setSuccess(true); setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تفعيل الرمز");
    }
  }, [code, redeem]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card variant="elevated" padding="lg">
        <CardContent>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <Ticket className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">تفعيل رمز</h3>
              <p className="mt-1 text-sm text-neutral-500">أدخل رمز التفعيل للحصول على عملات مجانية</p>
            </div>
            <div className="w-full space-y-3">
              <Input label="رمز التفعيل" placeholder="أدخل الرمز" value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); setSuccess(false); }}
                dir="ltr" className="text-center font-mono text-lg" />
              {error && <p className="text-sm text-danger-500">{error}</p>}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
                  <CheckCircle2 className="h-5 w-5" />
                  تم تفعيل الرمز بنجاح! تم إضافة العملات إلى محفظتك.
                </div>
              )}
              <Button variant="primary" size="md" fullWidth loading={isPending} disabled={!code.trim()} onClick={() => { void handleRedeem(); }}>
                {isPending ? "جاري التفعيل..." : "تفعيل"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab(): ReactNode {
  const { data: purchases, isLoading: purchasesLoading } = useMyPurchases();
  const { data: manualOrders, isLoading: ordersLoading } = useMyOrders();
  const { data: unlocks, isLoading: unlocksLoading } = useMyUnlocks();
  const isLoading = purchasesLoading || unlocksLoading || ordersLoading;

  const allOrders = [
    ...(manualOrders?.map((o) => ({
      id: o.id, type: "manual" as const, coinAmount: o.coinAmount, amount: o.amount,
      createdAt: o.createdAt, status: o.status, gateway: o.gateway,
    })) ?? []),
    ...(purchases?.map((p) => ({
      id: p.id, type: "auto" as const, coinAmount: p.coinAmount, amount: p.price,
      createdAt: p.createdAt, status: "COMPLETED" as const, gateway: "" as const,
    })) ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-sm font-bold text-neutral-700 dark:text-neutral-300">سجل الطلبات والمشتريات</h3>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : allOrders.length > 0 ? (
          <div className="flex flex-col gap-2">
            {allOrders.map((o) => (
              <div key={`${o.type}-${o.id}`}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {o.type === "manual" ? "تحويل يدوي" : "شراء مباشر"}
                      {o.type === "manual" && (
                        <Badge variant={o.status === "APPROVED" ? "success" : o.status === "REJECTED" ? "danger" : "warning"} className="mr-2">
                          {o.status === "APPROVED" ? "مقبول" : o.status === "REJECTED" ? "مرفوض" : "قيد المراجعة"}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-500">+{o.coinAmount}</p>
                  <p className="text-xs text-neutral-400">{o.amount} EGP</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">لا توجد مشتريات</p>
        )}
      </section>
      <section>
        <h3 className="mb-3 text-sm font-bold text-neutral-700 dark:text-neutral-300">عمليات فتح المحتوى</h3>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : unlocks && unlocks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {unlocks.map((u) => (
              <div key={u.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {u.targetType === "UNIT" ? "وحدة" : "درس"} {u.targetId.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-neutral-500">
                      عبر {u.unlockMethod === "COINS" ? "عملات" : u.unlockMethod === "CODE" ? "رمز" : "أخرى"}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-neutral-500">{new Date(u.createdAt).toLocaleDateString("ar-SA")}</p>
                  {u.coinAmount && <p className="text-xs text-danger-500">-{u.coinAmount}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">لا يوجد محتوى مفتوح</p>
        )}
      </section>
    </div>
  );
}

export default function ShopPage(): ReactNode {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"packages" | "redeem" | "history">("packages");

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button onClick={() => { router.push("/dashboard"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">المتجر</h1>
        <p className="mt-1 text-sm text-neutral-500">اشتر العملات وافتح المحتوى التعليمي</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              }`}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "packages" && <PackagesTab />}
      {activeTab === "redeem" && <RedeemTab />}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}

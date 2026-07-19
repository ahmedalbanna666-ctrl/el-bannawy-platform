"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins,
  ShoppingCart,
  Ticket,
  History,
  ArrowLeft,
  CheckCircle2,
  Gift,
  Star,
} from "lucide-react";
import {
  useCoinPackages,
  useCoinWallet,
  usePurchasePackage,
  useVerifyCoinPurchase,
  useRedeemCode,
  useMyPurchases,
  useMyUnlocks,
  type CoinPackageItem,
} from "@/lib/coins/coins-api";

const TABS = [
  { key: "packages", label: "باقات العملات", icon: ShoppingCart },
  { key: "redeem", label: "رمز التفعيل", icon: Ticket },
  { key: "history", label: "السجل", icon: History },
] as const;

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

const PAYMENT_METHODS = [
  { id: "paymob", label: "Paymob" },
  { id: "fawry", label: "Fawry" },
  { id: "instapay", label: "Instapay" },
  { id: "vodafone_cash", label: "Vodafone Cash" },
  { id: "orange_cash", label: "Orange Cash" },
  { id: "etisalat_cash", label: "Etisalat Cash" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

function PackageCard({
  pkg,
  onBuy,
  isBuying,
  method,
  onMethodChange,
}: {
  pkg: CoinPackageItem;
  onBuy: (id: string, method: PaymentMethod) => void;
  isBuying: boolean;
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
}): ReactNode {
  return (
    <Card variant="elevated" padding="md">
      <CardContent>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Coins className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {pkg.name}
            </h3>
            {pkg.description && (
              <p className="mt-1 text-sm text-neutral-500">{pkg.description}</p>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-amber-500">{pkg.coinAmount.toLocaleString()}</span>
            <span className="text-sm text-neutral-400">عملة</span>
          </div>
          <div className="text-sm text-neutral-500">
            بسعر <span className="font-bold text-primary-500">{pkg.price.toLocaleString()} EGP</span>
          </div>
          <select
            value={method}
            onChange={(e) => { onMethodChange(e.target.value as PaymentMethod); }}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            loading={isBuying}
            onClick={() => { onBuy(pkg.id, method); }}
          >
            <ShoppingCart className="h-4 w-4" />
            اشتر الآن
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PackagesTab(): ReactNode {
  const { data: packages, isLoading, isError, refetch } = useCoinPackages();
  const { data: wallet, refetch: refetchWallet } = useCoinWallet();
  const { mutateAsync: purchase } = usePurchasePackage();
  const { mutateAsync: verify } = useVerifyCoinPurchase();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("paymob");

  const handleBuy = useCallback(
    async (id: string, selectedMethod: PaymentMethod) => {
      setBusyId(id);
      try {
        const res = await purchase({ packageId: id, paymentMethod: selectedMethod });
        const data = res.data;
        if (!data) return;

        const isSimulation = data.paymentUrl.includes("/api/");
        if (isSimulation) {
          await verify({ checkoutId: data.checkoutId, paymentMethod: selectedMethod });
          await refetchWallet();
        } else {
          window.location.href = data.paymentUrl;
        }
      } catch {
        // handled
      } finally {
        setBusyId(null);
      }
    },
    [purchase, verify, refetchWallet],
  );

  if (isError) {
    return <ErrorState title="فشل تحميل الباقات" onRetry={() => { void refetch(); }} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {wallet && <CoinBalance balance={wallet.balance} />}
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
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onBuy={(id, m) => { void handleBuy(id, m); }}
                isBuying={busyId === pkg.id}
                method={method}
                onMethodChange={setMethod}
              />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={<Gift className="h-16 w-16" />}
          title="لا توجد باقات متاحة حالياً"
          description="سيتم إضافة باقات قريباً"
        />
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
    setError("");
    setSuccess(false);
    try {
      await redeem(code.trim());
      setSuccess(true);
      setCode("");
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
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                تفعيل رمز
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                أدخل رمز التفعيل للحصول على عملات مجانية
              </p>
            </div>
            <div className="w-full space-y-3">
              <Input
                label="رمز التفعيل"
                placeholder="أدخل الرمز"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); setSuccess(false); }}
                dir="ltr"
                className="text-center font-mono text-lg"
              />
              {error && (
                <p className="text-sm text-danger-500">{error}</p>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
                  <CheckCircle2 className="h-5 w-5" />
                  تم تفعيل الرمز بنجاح! تم إضافة العملات إلى محفظتك.
                </div>
              )}
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={isPending}
                disabled={!code.trim()}
                onClick={() => { void handleRedeem(); }}
              >
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
  const { data: unlocks, isLoading: unlocksLoading } = useMyUnlocks();

  const isLoading = purchasesLoading || unlocksLoading;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-sm font-bold text-neutral-700 dark:text-neutral-300">
          عمليات الشراء
        </h3>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : purchases && purchases.length > 0 ? (
          <div className="flex flex-col gap-2">
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {p.package?.name ?? "باقة عملات"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(p.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-500">+{p.coinAmount}</p>
                  <p className="text-xs text-neutral-400">{p.price} EGP</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">لا توجد مشتريات</p>
        )}
      </section>
      <section>
        <h3 className="mb-3 text-sm font-bold text-neutral-700 dark:text-neutral-300">
          عمليات فتح المحتوى
        </h3>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : unlocks && unlocks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {unlocks.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary-500" />
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
                  <p className="text-xs text-neutral-500">
                    {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                  {u.coinAmount && (
                    <p className="text-xs text-danger-500">-{u.coinAmount}</p>
                  )}
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
        <button
          onClick={() => { router.push("/dashboard"); }}
          className="mb-3 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للرئيسية
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          المتجر
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          اشتر العملات وافتح المحتوى التعليمي
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
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

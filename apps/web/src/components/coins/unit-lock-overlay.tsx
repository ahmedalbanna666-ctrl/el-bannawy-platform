"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useCoinWallet } from "@/lib/coins/coins-api";
import { useUnitUnlock } from "@/lib/coins/coins-access";
import {
  Lock,
  Coins,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";

interface UnitLockOverlayProps {
  unitId: string;
  unitTitle: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UnitLockOverlay({
  unitId,
  unitTitle,
  open: controlledOpen,
  onOpenChange,
}: UnitLockOverlayProps): ReactNode {
  const router = useRouter();
  const { data: wallet } = useCoinWallet();
  const { unlock, redeem, unlocking, redeeming, cost } = useUnitUnlock(unitId);
  const [code, setCode] = useState("");

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean): void => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const balance = wallet?.balance ?? 0;
  const insufficient = balance < cost;

  const handleUnlock = useCallback(() => {
    setFeedback(null);
    unlock((err) => {
      if (err) {
        setFeedback({ type: "error", message: err instanceof Error ? err.message : "تعذر فتح الوحدة" });
        return;
      }
      setFeedback({ type: "success", message: "تم فتح الوحدة بنجاح" });
      setTimeout(() => { setOpen(false); }, 800);
    });
  }, [unlock]);

  const handleRedeem = useCallback(() => {
    if (!code.trim()) return;
    setFeedback(null);
    redeem(code.trim(), (err, result) => {
      if (err) {
        setFeedback({ type: "error", message: err instanceof Error ? err.message : "رمز غير صالح" });
        return;
      }
      if (result?.unlocked) {
        setFeedback({ type: "success", message: "تم فتح الوحدة بالرمز بنجاح" });
        setTimeout(() => { setOpen(false); }, 800);
      } else {
        setFeedback({ type: "error", message: "هذا الرمز غير مخصص لفتح هذه الوحدة" });
      }
    });
  }, [code, redeem]);

  const handleBuyCoins = useCallback(() => {
    router.push("/dashboard/shop");
  }, [router]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setFeedback(null); setOpen(true); }}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 ring-1 ring-amber-500/20 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
      >
        <Lock className="h-3.5 w-3.5" />
        وحدة مقفلة
      </button>

      <Dialog
        open={open}
        onClose={() => { setOpen(false); }}
        title={`فتح الوحدة: ${unitTitle}`}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
            <Lock className="mt-0.5 h-8 w-8 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1 text-start">
              <p className="font-bold text-neutral-900 dark:text-neutral-100">هذه الوحدة مقفلة (مدفوعة)</p>
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                اختر إحدى الطريقتين لفتحها والوصول إلى جميع دروسها.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-sm font-semibold ${
                feedback.type === "success"
                  ? "bg-success-500/10 text-success-600"
                  : "bg-danger-500/10 text-danger-600"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {feedback.message}
            </div>
          )}

          {/* Option 1: Pay with coins */}
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">الدفع بالعملات</p>
                <p className="text-xs text-neutral-500">
                  رصيدك: <span className="font-semibold text-amber-500">{balance.toLocaleString()}</span>
                </p>
              </div>
            </div>

            {insufficient ? (
              <Button variant="primary" onClick={handleBuyCoins} className="w-full">
                <ShoppingCart className="h-4 w-4" />
                اشحن رصيدك من المتجر
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleUnlock}
                loading={unlocking}
                className="w-full"
              >
                <Coins className="h-4 w-4" />
                اشتري بـ {cost} عملة
              </Button>
            )}
          </div>

          {/* Option 2: Enter activation code */}
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <KeyRound className="h-5 w-5 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">رمز تفعيل</p>
                <p className="text-xs text-neutral-500">أدخل رمز التفعيل المرسل من معلمك</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                dir="ltr"
                placeholder="أدخل الرمز"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); }}
                className="flex-1 font-mono text-sm tracking-widest"
              />
              <Button
                variant="primary"
                onClick={handleRedeem}
                loading={redeeming}
                disabled={!code.trim() || redeeming}
                className="shrink-0"
              >
                تفعيل
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}

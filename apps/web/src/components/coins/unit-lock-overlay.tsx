"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useCoinWallet } from "@/lib/coins/coins-api";
import { useUnitUnlock, UNIT_UNLOCK_COST } from "@/lib/coins/coins-access";
import { usePermissions } from "@/lib/use-permissions";
import {
  Lock,
  Coins,
  Gift,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface UnitLockOverlayProps {
  unitId: string;
  unitTitle: string;
}

export function UnitLockOverlay({ unitId, unitTitle }: UnitLockOverlayProps): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const canUnlock = can("coins.unlock");
  const { data: wallet } = useCoinWallet();
  const { unlock, request, unlocking, requesting } = useUnitUnlock(unitId);

  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const balance = wallet?.balance ?? 0;
  const insufficient = balance < UNIT_UNLOCK_COST;

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

  const handleRequest = useCallback(() => {
    setFeedback(null);
    request((err) => {
      if (err) {
        setFeedback({ type: "error", message: err instanceof Error ? err.message : "تعذر إرسال الطلب" });
        return;
      }
      setFeedback({ type: "success", message: "تم إرسال طلب الفتح المجاني" });
    });
  }, [request]);

  const handleRedeem = useCallback(() => {
    router.push("/dashboard/shop?tab=redeem");
  }, [router]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setFeedback(null); setOpen(true); }}
        className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 ring-1 ring-amber-500/20 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
      >
        <Lock className="h-3.5 w-3.5" />
        وحدة مقفلة
      </button>

      <Dialog open={open} onClose={() => { setOpen(false); }} title={`فتح الوحدة: ${unitTitle}`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
            <Lock className="h-8 w-8 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold text-neutral-900 dark:text-neutral-100">هذه الوحدة مدفوعة</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                افتحها بـ {UNIT_UNLOCK_COST} عملة للوصول لكل دروسها.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-4 py-3 text-sm dark:bg-neutral-700/50">
            <span className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Coins className="h-4 w-4 text-amber-500" />
              رصيدك الحالي
            </span>
            <span className="font-bold text-amber-500">{balance.toLocaleString()} عملة</span>
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

          {canUnlock && (
            <Button
              variant="primary"
              onClick={handleUnlock}
              loading={unlocking}
              disabled={insufficient || unlocking}
              className="w-full"
            >
              <Coins className="h-4 w-4" />
              {insufficient ? "رصيد غير كافٍ" : `فتح بـ ${String(UNIT_UNLOCK_COST)} عملة`}
            </Button>
          )}

          {canUnlock && (
            <Button
              variant="outline"
              onClick={handleRequest}
              loading={requesting}
              disabled={requesting}
              className="w-full"
            >
              <Gift className="h-4 w-4" />
              طلب فتح مجاني من الإدارة
            </Button>
          )}

          <Button variant="ghost" onClick={handleRedeem} className="w-full">
            <KeyRound className="h-4 w-4" />
            لديك رمز تفعيل؟ استخدمه هنا
          </Button>
        </div>
      </Dialog>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LiveErrorKind = "failed" | "full" | "payment" | "teacher" | "offline";

interface LiveErrorProps {
  kind?: LiveErrorKind;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

const defaultCopy: Record<
  LiveErrorKind,
  { title: string; description: string; actionLabel: string }
> = {
  failed: {
    title: "فشل الحجز",
    description: "حدث خطأ غير متوقع أثناء الحجز. حاول مرة أخرى.",
    actionLabel: "إعادة المحاولة",
  },
  full: {
    title: "الحصة ممتلئة",
    description: "المقاعد المتبقية نفدت لهذه الحصة.",
    actionLabel: "انضم لقائمة الانتظار",
  },
  payment: {
    title: "يجب الدفع أولاً",
    description: "هذه الحصة تتطلب اشتراكاً أو دفعاً. أكمل الدفع لتأكيد الحجز.",
    actionLabel: "الانتقال للدفع",
  },
  teacher: {
    title: "المعلم غير متاح",
    description: "هذه المواعيد لم تعد متاحة لهذا المعلم.",
    actionLabel: "اختيار موعد آخر",
  },
  offline: {
    title: "لا يوجد اتصال بالإنترنت",
    description: "تحقق من اتصالك ثم أعد المحاولة.",
    actionLabel: "إعادة المحاولة",
  },
};

/** Actionable error state for booking failures. */
export function LiveError({
  kind = "failed",
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
}: LiveErrorProps): ReactNode {
  const copy = defaultCopy[kind];
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-danger-500/20 bg-danger-500/[0.04] px-6 py-12 text-center dark:bg-danger-400/[0.05]",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/10 text-danger-500">
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-60" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-danger-500" />
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
          {title ?? copy.title}
        </h3>
        <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
          {description ?? copy.description}
        </p>
      </div>
      {(onAction ?? onSecondary) && (
        <div className="flex flex-col gap-2">
          {onAction && (
            <Button variant="danger" size="lg" onClick={onAction} className="rounded-2xl">
              {actionLabel ?? copy.actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button variant="ghost" size="md" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mobile-first sticky bottom action bar with a large primary CTA. */
export function BottomCta({
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  hint,
  className,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  hint?: string;
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 border-t border-neutral-200/60 bg-white/80 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-lg sm:mx-0 sm:rounded-t-2xl sm:border-neutral-200 dark:border-white/10 dark:bg-[#0c121e]/85",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-2">
        {hint && (
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
        )}
        <div className="flex items-stretch gap-2">
          {secondaryLabel && onSecondary && (
            <Button
              variant="outline"
              size="lg"
              onClick={onSecondary}
              disabled={primaryLoading}
              className="flex-1"
            >
              {secondaryLabel}
            </Button>
          )}
          <Button
            size="lg"
            fullWidth={!secondaryLabel}
            onClick={onPrimary}
            loading={primaryLoading}
            disabled={primaryDisabled}
            className="h-14 flex-1 rounded-2xl text-base shadow-lg shadow-primary-500/20"
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  key: string;
  label: string;
}

/** Premium pill-style stepper for multi-step flows. */
export function StepIndicator({
  steps,
  current,
}: {
  steps: readonly Step[];
  current: number;
}): ReactNode {
  return (
    <div className="flex items-center justify-center gap-1 overflow-x-auto py-1" dir="ltr">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex shrink-0 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-all duration-300",
                  done
                    ? "border-primary-400/40 bg-primary-500/15 text-primary-600 dark:text-primary-300"
                    : active
                      ? "border-primary-400/60 bg-primary-500/20 text-primary-700 shadow-[0_0_16px_rgba(6,182,212,0.35)] dark:text-primary-200"
                      : "border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-500",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                <span className="whitespace-nowrap">{step.label}</span>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px w-6 sm:w-10",
                  i < current ? "bg-primary-400/60" : "bg-neutral-200 dark:bg-white/10",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

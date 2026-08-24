"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

const BOX: Record<SpinnerSize, string> = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const BORDER: Record<SpinnerSize, string> = {
  xs: "border-2",
  sm: "border-2",
  md: "border-[3px]",
  lg: "border-4",
  xl: "border-4",
};

export interface SpinnerProps {
  readonly size?: SpinnerSize;
  readonly className?: string;
  readonly label?: string;
}

export function Spinner({
  size = "md",
  className,
  label = "جاري التحميل",
}: SpinnerProps): ReactNode {
  const box = BOX[size];
  const border = BORDER[size];
  const innerBorder = size === "xs" || size === "sm" ? "border-2" : "border-[3px]";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 text-primary-500",
        box,
        className,
      )}
    >
      {/* Static track */}
      <span className={cn("absolute inset-0 rounded-full border-current opacity-20", border)} />
      {/* Outer rotating arc */}
      <span
        className={cn(
          "absolute inset-0 animate-[elbannawy-spin_0.9s_linear_infinite] rounded-full border-current border-b-transparent",
          border,
        )}
      />
      {/* Inner counter-rotating arc */}
      <span
        className={cn(
          "absolute inset-[18%] animate-[elbannawy-spin-reverse_1.4s_linear_infinite] rounded-full border-current border-t-transparent opacity-50",
          innerBorder,
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface PageLoaderProps {
  readonly label?: string;
  readonly fullScreen?: boolean;
  readonly className?: string;
}

export function PageLoader({
  label = "جاري التحميل...",
  fullScreen = false,
  className,
}: PageLoaderProps): ReactNode {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-5",
        fullScreen ? "min-h-screen" : "min-h-[60vh]",
        className,
      )}
    >
      <Spinner size="xl" />
      {label && (
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      )}
    </div>
  );
}

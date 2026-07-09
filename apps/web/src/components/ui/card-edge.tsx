import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  primary: "bg-primary-600/50",
  orange: "bg-warning-500/50",
} as const;

interface CardEdgeProps {
  variant: "primary" | "orange" | "hidden";
  className?: string;
}

export type { CardEdgeProps };

export function CardEdge({ variant, className }: CardEdgeProps): ReactNode {
  if (variant === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-y-0 end-0 w-[3px] rounded-e-2xl",
        STYLES[variant],
        className,
      )}
    />
  );
}

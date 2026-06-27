import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  retryLabel = "Try Again",
  onRetry,
  className,
}: ErrorStateProps): ReactNode {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className,
      )}
    >
      <div className="text-danger-400">
        <AlertTriangle className="h-16 w-16" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
        {title}
      </h3>
      <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export type { ErrorStateProps };

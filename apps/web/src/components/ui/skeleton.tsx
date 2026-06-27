import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): React.ReactNode {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700",
        className,
      )}
      aria-hidden="true"
    />
  );
}

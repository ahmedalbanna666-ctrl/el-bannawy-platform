import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RouteSkeletonProps {
  readonly title?: boolean;
  readonly cardCount?: number;
  readonly rowCount?: number;
  readonly tableRows?: number;
  readonly className?: string;
}

export function RouteSkeleton({
  title = true,
  cardCount = 0,
  rowCount = 0,
  tableRows = 0,
  className,
}: RouteSkeletonProps): React.ReactNode {
  return (
    <div
      className={cn("space-y-6 p-4 md:p-6", className)}
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      {title ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : null}

      {cardCount > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : null}

      {rowCount > 0 ? (
        <div className="space-y-3">
          {Array.from({ length: rowCount }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : null}

      {tableRows > 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: tableRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

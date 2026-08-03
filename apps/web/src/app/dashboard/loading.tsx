import { type ReactNode } from "react";

export default function DashboardLoading(): ReactNode {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-neutral-800" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-neutral-800" />
          <div className="h-3 w-24 animate-pulse rounded-lg bg-neutral-800" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-800" />
        ))}
      </div>
    </div>
  );
}

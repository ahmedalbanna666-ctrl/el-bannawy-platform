"use client";

import { type ReactNode } from "react";

interface DashboardErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps): ReactNode {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <div className="rounded-full bg-danger-500/10 p-4">
        <svg className="h-10 w-10 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white">حدث خطأ غير متوقع</h2>
      <p className="max-w-md text-center text-sm text-neutral-400">
        {error.message || "نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-primary-500 px-6 py-3 font-bold text-white transition-all hover:bg-primary-600"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

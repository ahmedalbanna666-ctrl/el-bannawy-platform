import Link from "next/link";
import { type ReactNode } from "react";

export default function DashboardNotFound(): ReactNode {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <div className="rounded-full bg-warning-500/10 p-4">
        <svg className="h-10 w-10 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white">الصفحة غير موجودة</h2>
      <p className="max-w-md text-center text-sm text-neutral-400">
        عذرًا، الصفحة التي تبحث عنها غير متوفرة. قد يكون الرابط غير صحيح أو تم حذف الصفحة.
      </p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-primary-500 px-6 py-3 font-bold text-white transition-all hover:bg-primary-600"
      >
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}

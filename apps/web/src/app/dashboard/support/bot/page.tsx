"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Shield, Zap, BookOpen } from "lucide-react";
import { SupportBotChat } from "@/components/support/support-bot-chat";

export default function SupportBotPage(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/support"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-primary-500/40 hover:text-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">المساعد الذكي</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">إجابات فورية حسب منهجك</p>
        </div>
      </div>

      <SupportBotChat />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <Shield className="h-4 w-4 text-success-500" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">آمن وخاص</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <Zap className="h-4 w-4 text-warning-500" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">رد فوري</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <BookOpen className="h-4 w-4 text-primary-500" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">حسب دروسك</span>
        </div>
      </div>
    </div>
  );
}

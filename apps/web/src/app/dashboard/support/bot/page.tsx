"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SupportBotChat } from "@/components/support/support-bot-chat";

export default function SupportBotPage(): ReactNode {
  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3 md:h-[calc(100vh-6rem)]">
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/dashboard/support"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-primary-500/40 hover:text-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">المساعد الذكي</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">مساعدك الشخصي — اسأل عن أي شيء</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <SupportBotChat />
      </div>
    </div>
  );
}

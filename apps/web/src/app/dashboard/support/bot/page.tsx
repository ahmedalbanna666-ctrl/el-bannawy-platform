"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bot } from "lucide-react";
import { SupportBotChat } from "@/components/support/support-bot-chat";

export default function SupportBotPage(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/support"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-primary-500/40 hover:text-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            <Bot className="h-5 w-5 text-primary-500" />
            المساعد الذكي
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">اسأل عن دروسك وواجباتك واحصل على إجابة فورية</p>
        </div>
      </div>

      <SupportBotChat />

      <p className="text-center text-xs text-neutral-400">
        المساعد يجيب حسب محتوى دروسك. لمشاكل تقنية استخدم{" "}
        <Link href="/dashboard/support/complaint" className="text-primary-500 hover:underline">
          إرسال شكوى
        </Link>
      </p>
    </div>
  );
}

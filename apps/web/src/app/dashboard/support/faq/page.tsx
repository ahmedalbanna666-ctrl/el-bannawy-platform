"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, HelpCircle, ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "كيف يمكنني شراء العملات؟",
    answer: "اذهب إلى المتجر من القائمة الجانبية، اختر باقة العملات المناسبة وقم بالشراء. ستُضاف العملات إلى رصيدك فوراً.",
  },
  {
    question: "كيف أفتح وحدة مدفوعة؟",
    answer: "يمكنك فتح الوحدة باستخدام رصيد العملات، أو عبر رمز تفعيل، أو بإرسال طلب فتح مجاني يراجعه فريق الإدارة.",
  },
  {
    question: "لماذا تظهر بعض الدروس مقفلة؟",
    answer: "الدروس تُفتح تباعاً حسب تقدمك. أكمل اختبار الدرس السابق لتتمكن من فتح الدرس الذي يليه.",
  },
  {
    question: "نسيت رمز تفعيل الوحدة؟",
    answer: "راجع صفحة الرموز لديك أو تواصل مع الإدارة عبر صفحة إرسال شكوى وسنساعدك في استرجاعه.",
  },
  {
    question: "كيف أتواصل مع معلّمي؟",
    answer: "يمكنك إرسال شكوى عبر صفحة الدعم وسيتولّى فريق الدعم أو معلّمك الرد في أقرب وقت.",
  },
];

function FaqRow({ item }: { item: FaqItem }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={(): void => { setOpen((v) => !v); }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
      >
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="border-t border-neutral-200 px-4 py-3 text-sm leading-relaxed text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function FaqPage(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/support"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:border-primary-500/40 hover:text-primary-500 dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            <HelpCircle className="h-5 w-5 text-primary-500" />
            الأسئلة الشائعة
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">إجابات لأكثر الأسئلة شيوعاً</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {FAQS.map((item) => (
          <FaqRow key={item.question} item={item} />
        ))}
      </div>
    </div>
  );
}

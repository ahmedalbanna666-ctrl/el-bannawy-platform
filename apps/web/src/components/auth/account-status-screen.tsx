"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PauseCircle, Ban, MessageCircle, ShieldAlert, Trash2 } from "lucide-react";

export interface AccountStatusData {
  status: string;
  whatsapp: string | null;
  message: string | null;
}

function buildWhatsAppLink(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "").replace(/^0/, "");
  return `https://wa.me/${digits}`;
}

/** Full-screen state shown when a student's account is suspended / banned / deleted. */
export function AccountStatusScreen({ status, whatsapp, message }: AccountStatusData): ReactNode {
  const isSuspended = status === "SUSPENDED";
  const isBanned = status === "BANNED";
  const waLink = whatsapp ? buildWhatsAppLink(whatsapp) : null;

  const Icon = isSuspended ? PauseCircle : isBanned ? Ban : Trash2;
  const title = isSuspended ? "حسابك موقوف مؤقتاً" : isBanned ? "تم حظر حسابك" : "تم حذف هذا الحساب";
  const iconClass = isSuspended
    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    : "bg-danger-500/15 text-danger-600 dark:text-danger-400";

  return (
    <div className="flex flex-col items-center gap-4 p-2 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${iconClass}`}>
        <Icon className="h-8 w-8" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {message ?? "يرجى التواصل مع الدعم الفني لمعرفة سبب الإيقاف."}
        </p>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          للتواصل مع الدعم الفني أو استعادة حسابك:
        </p>
      </div>

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
        >
          <MessageCircle className="h-5 w-5" />
          تواصل عبر واتساب
        </a>
      )}

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        إذا كانت هذه الرسالة غير صحيحة، تواصل مع إدارة المنصة.
      </div>

      <Link
        href="/"
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-transparent px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        العودة لصفحة الدخول
      </Link>
    </div>
  );
}

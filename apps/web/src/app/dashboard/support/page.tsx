"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LifeBuoy,
  Bot,
  AlertTriangle,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  ChevronLeft,
} from "lucide-react";
import { useTickets } from "@/lib/support/support-api";
import { useGradeSupportContacts } from "@/lib/support/grade-support-api";

interface HubCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  variant?: "default" | "warning";
}

function HubCard({ href, icon, title, description, badge, variant = "default" }: HubCardProps): ReactNode {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-4 rounded-2xl border bg-white p-6 transition-all hover:shadow-md dark:bg-neutral-900 ${
        variant === "warning"
          ? "border-warning-500/20 hover:border-warning-500/40 hover:bg-warning-500/5"
          : "border-neutral-200 hover:border-primary-500/40 hover:bg-primary-500/5 dark:border-neutral-700"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            variant === "warning" ? "bg-warning-500/10 text-warning-500" : "bg-primary-500/10 text-primary-500"
          }`}
        >
          {icon}
        </div>
        {badge && (
          <Badge variant={variant === "warning" ? "warning" : "primary"}>{badge}</Badge>
        )}
      </div>
      <div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary-500">
        <span>عرض</span>
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

function ContactFooter(): ReactNode {
  const { data: contacts, isLoading } = useGradeSupportContacts();

  const contact =
    contacts && contacts.length > 0
      ? {
          email: contacts[0].supportEmail ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@el-bannawy.com",
          phone: contacts[0].supportPhone ?? process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+201000000000",
          whatsapp: contacts[0].supportWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "201000000000",
        }
      : null;

  if (isLoading) {
    return (
      <div className="flex justify-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="flex flex-col items-center gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-700">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">تواصل معنا مباشرة</p>
      <div className="flex gap-4">
        <a
          href={`mailto:${contact.email}`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 transition-colors hover:bg-primary-500 hover:text-white"
          aria-label="البريد الإلكتروني"
        >
          <Mail className="h-5 w-5" />
        </a>
        <a
          href={`https://wa.me/${contact.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-success-500/10 text-success-500 transition-colors hover:bg-success-500 hover:text-white"
          aria-label="واتساب"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <a
          href={`tel:${contact.phone}`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-500/10 text-warning-500 transition-colors hover:bg-warning-500 hover:text-white"
          aria-label="اتصال"
        >
          <Phone className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}

export default function SupportPage(): ReactNode {
  const { data: tickets } = useTickets();
  const openCount = tickets?.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <LifeBuoy className="h-6 w-6 text-primary-500" />
          الدعم الفني
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          اختر الخدمة التي تحتاجها وسنساعدك في أقرب وقت
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HubCard
          href="/dashboard/support/bot"
          icon={<Bot className="h-6 w-6" />}
          title="المساعد الذكي"
          description="اسأل عن دروسك وواجباتك واحصل على إجابة فورية"
          badge="متاح 24/7"
        />
        <HubCard
          href="/dashboard/support/complaint"
          icon={<AlertTriangle className="h-6 w-6" />}
          title="إرسال شكوى أو مشكلة"
          description="واجهت مشكلة؟ أخبرنا وسنحلها خلال 24 ساعة"
          badge={openCount > 0 ? `${openCount} قيد المتابعة` : undefined}
          variant="warning"
        />
        <HubCard
          href="/dashboard/support/faq"
          icon={<HelpCircle className="h-6 w-6" />}
          title="الأسئلة الشائعة"
          description="إجابات لأكثر الأسئلة شيوعاً"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ContactFooter />
        </CardContent>
      </Card>
    </div>
  );
}

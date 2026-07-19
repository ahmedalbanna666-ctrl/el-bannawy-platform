"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  ChevronDown,
  Send,
  CheckCircle2,
  Headphones,
  Inbox,
  Smartphone,
} from "lucide-react";
import {
  useTickets,
  useTicket,
  useCreateTicket,
  useAddMessage,
  useUpdateTicket,
  useResolveTicket,
  useCloseTicket,
  type TicketItem,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/support-api";
import { useGradeSupportContacts } from "@/lib/support/grade-support-api";

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "مفتوح",
  IN_PROGRESS: "قيد المعالجة",
  RESOLVED: "تم الحل",
  CLOSED: "مغلق",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "منخفض",
  MEDIUM: "متوسط",
  HIGH: "عالٍ",
  URGENT: "عاجل",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL: "عام",
  TECHNICAL: "فني",
  BILLING: "مدفوعات",
  CONTENT: "محتوى",
  ACCOUNT: "الحساب",
  OTHER: "أخرى",
};

const STATUS_VARIANT: Record<
  TicketStatus,
  "primary" | "secondary" | "success"
> = {
  OPEN: "primary",
  IN_PROGRESS: "secondary",
  RESOLVED: "success",
  CLOSED: "secondary",
};

const PRIORITY_VARIANT: Record<
  TicketPriority,
  "secondary" | "primary" | "warning" | "danger"
> = {
  LOW: "secondary",
  MEDIUM: "primary",
  HIGH: "warning",
  URGENT: "danger",
};

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "كيف يمكنني شراء العملات؟",
    answer:
      "اذهب إلى المتجر من القائمة الجانبية، اختر باقة العملات المناسبة وقم بالشراء. ستُضاف العملات إلى رصيدك فوراً.",
  },
  {
    question: "كيف أفتح وحدة مدفوعة؟",
    answer:
      "يمكنك فتح الوحدة باستخدام رصيد العملات، أو عبر رمز تفعيل، أو بإرسال طلب فتح مجاني يراجعه فريق الإدارة.",
  },
  {
    question: "لماذا تظهر بعض الدروس مقفلة؟",
    answer:
      "الدروس تُفتح تباعاً حسب تقدمك. أكمل اختبار الدرس السابق لتتمكن من فتح الدرس الذي يليه.",
  },
  {
    question: "نسيت رمز تفعيل الوحدة؟",
    answer:
      "راجع صفحة الرموز لديك أو تواصل مع الإدارة عبر نموذج الدعم أدناه وسنساعدك في استرجاعه.",
  },
  {
    question: "كيف أتواصل مع معلّمي؟",
    answer:
      "يمكنك إرسال تذكرة عبر نموذج الدعم المباشر، وسيتولّى فريق الدعم أو معلّمك الرد في أقرب وقت.",
  },
];

interface ContactCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  href: string;
}

function ContactCard({ icon, title, value, href }: ContactCardProps): ReactNode {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-primary-500/40 hover:bg-primary-500/5 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-500/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{title}</p>
        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {value}
        </p>
      </div>
    </a>
  );
}

function FaqRow({ item }: { item: FaqItem }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={(): void => { setOpen((v) => !v); }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
      >
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {item.question}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="border-t border-neutral-200 px-4 py-3 text-sm leading-relaxed text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          {item.answer}
        </p>
      )}
    </div>
  );
}

function CreateTicketForm(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const createTicket = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [sent, setSent] = useState(false);

  const handleSubmit = (): void => {
    if (!description.trim()) return;
    createTicket.mutate(
      { subject, description, category, priority },
      {
        onSuccess: () => {
          setSent(true);
          setSubject("");
          setDescription("");
        },
      },
    );
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-success-500" />
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          تم إرسال تذكرتك بنجاح
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          سيتواصل فريق الدعم معك في أقرب وقت. يمكنك متابعة حالة التذكرة أدناه.
        </p>
        <Button variant="outline" onClick={(): void => { setSent(false); }}>
          إرسال تذكرة أخرى
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            الموضوع
          </label>
          <Input
            value={subject}
            onChange={(e): void => { setSubject(e.target.value); }}
            placeholder="مثال: مشكلة في فتح وحدة"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="القسم"
            value={category}
            onChange={(e): void => { setCategory(e.target.value as TicketCategory); }}
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Select
            label="الأولوية"
            value={priority}
            onChange={(e): void => { setPriority(e.target.value as TicketPriority); }}
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          رسالتك
        </label>
        <Textarea
          value={description}
          onChange={(e): void => { setDescription(e.target.value); }}
          placeholder="اكتب تفاصيل مشكلتك أو استفسارك هنا..."
          rows={5}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-400">{user?.fullName}</p>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!description.trim() || createTicket.isPending}
          className="self-start"
        >
          <Send className="h-4 w-4" />
          {createTicket.isPending ? "جارٍ الإرسال..." : "إرسال التذكرة"}
        </Button>
      </div>
    </div>
  );
}

function StudentTickets(): ReactNode {
  const { data, isLoading, isError, refetch } = useTickets();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="تعذّر تحميل تذكراتك" onRetry={(): void => { void refetch(); }} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title="لا توجد تذكرات"
        description="لم ترسل أي تذاكر دعم بعد. استخدم النموذج أعلاه لإرسال تذكرة."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((ticket) => (
        <div
          key={ticket.id}
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {ticket.subject}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {CATEGORY_LABELS[ticket.category]} ·{" "}
                {new Date(ticket.createdAt).toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={STATUS_VARIANT[ticket.status]}>
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant={PRIORITY_VARIANT[ticket.priority]}>
                {PRIORITY_LABELS[ticket.priority]}
              </Badge>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {ticket.description}
          </p>
          {ticket.messages && ticket.messages.length > 0 && (
            <p className="mt-2 text-xs text-primary-500">
              {ticket.messages.length} رسالة في المحادثة
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function AgentTicketQueue(): ReactNode {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useTickets(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const selected = useTicket(selectedId);

  const updateTicket = useUpdateTicket();
  const addMessage = useAddMessage();
  const resolveTicket = useResolveTicket();
  const closeTicket = useCloseTicket();

  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [resolution, setResolution] = useState("");

  const onSendReply = (): void => {
    if (!selectedId || !reply.trim()) return;
    addMessage.mutate(
      { ticketId: selectedId, body: reply, internal },
      {
        onSuccess: () => {
          setReply("");
          setInternal(false);
        },
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-3">
        <Select
          placeholder="كل الحالات"
          value={statusFilter}
          onChange={(e): void => { setStatusFilter(e.target.value); }}
          options={[
            { value: "", label: "كل الحالات" },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="تعذّر تحميل التذاكر" onRetry={(): void => { void refetch(); }} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Inbox className="h-8 w-8" />} title="لا توجد تذاكر" />
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={(): void => { setSelectedId(ticket.id); }}
                className={`rounded-xl border p-3 text-right transition-colors ${
                  selectedId === ticket.id
                    ? "border-primary-500 bg-primary-500/5"
                    : "border-neutral-200 hover:border-primary-500/40 dark:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {ticket.subject}
                  </p>
                  <Badge variant={STATUS_VARIANT[ticket.status]}>
                    {STATUS_LABELS[ticket.status]}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {ticket.user?.fullName ?? "مستخدم"} ·{" "}
                  {PRIORITY_LABELS[ticket.priority]}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {!selectedId ? (
          <EmptyState
            icon={<Headphones className="h-8 w-8" />}
            title="اختر تذكرة"
            description="اختر تذكرة من القائمة لعرض المحادثة والرد عليها."
          />
        ) : selected.isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : selected.isError || !selected.data ? (
          <ErrorState
            title="تعذّر تحميل التذكرة"
            onRetry={(): void => { void selected.refetch(); }}
          />
        ) : (
          <TicketThread
            ticket={selected.data}
            reply={reply}
            setReply={setReply}
            internal={internal}
            setInternal={setInternal}
            resolution={resolution}
            setResolution={setResolution}
            onSendReply={onSendReply}
            onSetStatus={(status): void => {
              updateTicket.mutate({ ticketId: selected.data.id, status });
            }}
            onResolve={(): void => {
              resolveTicket.mutate({
                ticketId: selected.data.id,
                resolution: resolution || "تم حل المشكلة.",
              });
            }}
            onClose={(): void => {
              closeTicket.mutate(selected.data.id);
            }}
            sending={addMessage.isPending}
          />
        )}
      </div>
    </div>
  );
}

interface TicketThreadProps {
  ticket: TicketItem;
  reply: string;
  setReply: (v: string) => void;
  internal: boolean;
  setInternal: (v: boolean) => void;
  resolution: string;
  setResolution: (v: string) => void;
  onSendReply: () => void;
  onSetStatus: (status: TicketStatus) => void;
  onResolve: () => void;
  onClose: () => void;
  sending: boolean;
}

function TicketThread(props: TicketThreadProps): ReactNode {
  const {
    ticket,
    reply,
    setReply,
    internal,
    setInternal,
    resolution,
    setResolution,
    onSendReply,
    onSetStatus,
    onResolve,
    onClose,
    sending,
  } = props;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {ticket.subject}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {ticket.user?.fullName ?? "مستخدم"} · {CATEGORY_LABELS[ticket.category]} ·{" "}
              {PRIORITY_LABELS[ticket.priority]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[ticket.status]}>
              {STATUS_LABELS[ticket.status]}
            </Badge>
            <Select
              value={ticket.status}
              onChange={(e): void => { onSetStatus(e.target.value as TicketStatus); }}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
          {ticket.description}
        </div>

        <div className="flex flex-col gap-3">
          {ticket.messages?.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-3 text-sm ${
                m.internal
                  ? "border-warning-500/40 bg-warning-500/5 text-warning-700 dark:text-warning-300"
                  : m.senderRole === "AGENT"
                    ? "border-primary-500/40 bg-primary-500/5 text-neutral-800 dark:text-neutral-200"
                    : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">
                  {m.senderRole === "AGENT" ? "فريق الدعم" : "المستخدم"}
                  {m.internal ? " (ملاحظة داخلية)" : ""}
                </span>
                <span className="text-xs opacity-70">
                  {new Date(m.createdAt).toLocaleString("ar-EG")}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          ))}
          {(!ticket.messages || ticket.messages.length === 0) && (
            <p className="text-xs text-neutral-400">لا توجد رسائل بعد.</p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <Textarea
            value={reply}
            onChange={(e): void => { setReply(e.target.value); }}
            placeholder="اكتب رداً..."
            rows={3}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e): void => { setInternal(e.target.checked); }}
                className="h-4 w-4"
              />
              ملاحظة داخلية (غير مرئية للمستخدم)
            </label>
            <Button
              variant="primary"
              onClick={onSendReply}
              disabled={!reply.trim() || sending}
            >
              <Send className="h-4 w-4" />
              {sending ? "جارٍ الإرسال..." : "إرسال الرد"}
            </Button>
          </div>
        </div>

        {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
          <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              ملخص الحل
            </label>
            <Textarea
              value={resolution}
              onChange={(e): void => { setResolution(e.target.value); }}
              placeholder="اكتب ملخصاً للحل قبل إغلاق التذكرة..."
              rows={2}
            />
            <div className="flex gap-2">
              <Button variant="success" onClick={onResolve}>
                <CheckCircle2 className="h-4 w-4" />
                تعليم كمحلولة
              </Button>
              <Button variant="outline" onClick={onClose}>
                إغلاق التذكرة
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SupportPage(): ReactNode {
  const { can } = usePermissions();
  const isAgent = can(PERMISSIONS.SUPPORT_ANSWER);
  const { data: contacts, isLoading: contactsLoading } = useGradeSupportContacts();

  const contact: { email: string; phone: string; whatsapp: string } | null =
    contacts && contacts.length > 0
      ? {
          email: contacts[0].supportEmail ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@el-bannawy.com",
          phone: contacts[0].supportPhone ?? process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+201000000000",
          whatsapp: contacts[0].supportWhatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "201000000000",
        }
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <LifeBuoy className="h-6 w-6 text-primary-500" />
          الدعم الفني
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {isAgent
            ? "لوحة تحكم فريق الدعم: استعرض التذاكر الواردة وراجعها وأجب عليها."
            : "نحن هنا لمساعدتك. أرسل تذكرة دعم أو راجع الأسئلة الشائعة."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {contactsLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : contact ? (
          <>
            <ContactCard
              icon={<Mail className="h-5 w-5" />}
              title="البريد الإلكتروني"
              value={contact.email}
              href={`mailto:${contact.email}`}
            />
            <ContactCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="واتساب"
              value={contact.whatsapp}
              href={`https://wa.me/${contact.whatsapp}`}
            />
            <ContactCard
              icon={<Phone className="h-5 w-5" />}
              title="الهاتف"
              value={contact.phone}
              href={`tel:${contact.phone}`}
            />
          </>
        ) : null}
      </div>

      {isAgent ? (
        <>
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                <Headphones className="h-5 w-5 text-primary-500" />
                قائمة التذاكر
              </h2>
            </CardHeader>
            <CardContent>
              <AgentTicketQueue />
            </CardContent>
          </Card>
          <Link
            href="/dashboard/admin/support-contacts"
            className="flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-primary-500/40 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <Smartphone className="h-4 w-4" />
            إدارة بيانات التواصل للصفوف
          </Link>
        </>) : (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                أرسل تذكرة دعم
              </h2>
            </CardHeader>
            <CardContent>
              <CreateTicketForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                تذاكر الدعم الخاصة بي
              </h2>
            </CardHeader>
            <CardContent>
              <StudentTickets />
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">
          الأسئلة الشائعة
        </h2>
        <div className="flex flex-col gap-2">
          {FAQS.map((item) => (
            <FaqRow key={item.question} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

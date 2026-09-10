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
  ArrowRight,
  AlertTriangle,
  Send,
  CheckCircle2,
  Inbox,
  Headphones,
  Clock,
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

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "مفتوح",
  IN_PROGRESS: "قيد المعالجة",
  RESOLVED: "تم الحل",
  CLOSED: "مغلق",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL: "استفسار عام",
  TECHNICAL: "مشكلة تقنية",
  BILLING: "مشكلة دفع",
  CONTENT: "مشكلة في المحتوى",
  ACCOUNT: "مشكلة في الحساب",
  OTHER: "أخرى",
};

const STATUS_VARIANT: Record<TicketStatus, "primary" | "secondary" | "success"> = {
  OPEN: "primary",
  IN_PROGRESS: "secondary",
  RESOLVED: "success",
  CLOSED: "secondary",
};

const PRIORITY_VARIANT: Record<TicketPriority, "secondary" | "primary" | "warning" | "danger"> = {
  LOW: "secondary",
  MEDIUM: "primary",
  HIGH: "warning",
  URGENT: "danger",
};

function ComplaintForm({ onSuccess }: { onSuccess: () => void }): ReactNode {
  const user = useAuthStore((s) => s.user);
  const createTicket = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("TECHNICAL");
  const [sent, setSent] = useState(false);

  const handleSubmit = (): void => {
    if (!description.trim()) return;
    createTicket.mutate(
      { subject, description, category, priority: "MEDIUM" },
      {
        onSuccess: () => {
          setSent(true);
          setSubject("");
          setDescription("");
          onSuccess();
        },
      },
    );
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-success-500" />
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">تم استلام شكواك بنجاح</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          سيراجعها فريق الدعم وسيتواصل معك خلال 24 ساعة. يمكنك متابعة حالتها أدناه.
        </p>
        <Button variant="outline" onClick={(): void => { setSent(false); }}>
          إرسال شكوى أخرى
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          عنوان المشكلة
        </label>
        <Input
          value={subject}
          onChange={(e): void => { setSubject(e.target.value); }}
          placeholder="مثال: لا أستطيع فتح درس الوحدة 3"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          نوع المشكلة
        </label>
        <Select
          value={category}
          onChange={(e): void => { setCategory(e.target.value as TicketCategory); }}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          اشرح مشكلتك بالتفصيل
        </label>
        <Textarea
          value={description}
          onChange={(e): void => { setDescription(e.target.value); }}
          placeholder="صف ما حدث، متى، وفي أي درس أو صفحة..."
          rows={5}
        />
        <p className="mt-1 text-xs text-neutral-400">كلما كان الوصف أوضح، كان الحل أسرع</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1 text-xs text-neutral-400">
          <Clock className="h-3 w-3" />
          نرد خلال 24 ساعة
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{user?.fullName}</span>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!description.trim() || createTicket.isPending}
          >
            <Send className="h-4 w-4" />
            {createTicket.isPending ? "جارٍ الإرسال..." : "إرسال الشكوى"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StudentTicketsInline(): ReactNode {
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
  if (isError) return <ErrorState title="تعذّر تحميل شكاويك" onRetry={(): void => { void refetch(); }} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title="لا توجد شكاوى"
        description="لم ترسل أي شكوى بعد. استخدم النموذج أعلاه."
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
                {ticket.subject || "بدون عنوان"}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {CATEGORY_LABELS[ticket.category]} · {new Date(ticket.createdAt).toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{ticket.description}</p>
          {ticket.messages && ticket.messages.length > 0 && (
            <p className="mt-2 text-xs text-primary-500">{ticket.messages.length} رسالة</p>
          )}
        </div>
      ))}
    </div>
  );
}

function AgentComplaintQueue(): ReactNode {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useTickets(statusFilter ? { status: statusFilter } : undefined);
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
      { onSuccess: () => { setReply(""); setInternal(false); } },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-3">
        <Select
          placeholder="كل الحالات"
          value={statusFilter}
          onChange={(e): void => { setStatusFilter(e.target.value); }}
          options={[{ value: "", label: "كل الحالات" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
        />
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="تعذّر تحميل الشكاوى" onRetry={(): void => { void refetch(); }} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Inbox className="h-8 w-8" />} title="لا توجد شكاوى" />
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={(): void => { setSelectedId(ticket.id); }}
                className={`rounded-xl border p-3 text-right transition-colors ${selectedId === ticket.id ? "border-primary-500 bg-primary-500/5" : "border-neutral-200 hover:border-primary-500/40 dark:border-neutral-700"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ticket.subject || "بدون عنوان"}</p>
                  <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABELS[ticket.status]}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{ticket.user?.fullName ?? "مستخدم"}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {!selectedId ? (
          <EmptyState icon={<Headphones className="h-8 w-8" />} title="اختر شكوى" description="اختر شكوى من القائمة لعرضها والرد عليها." />
        ) : selected.isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : selected.isError || !selected.data ? (
          <ErrorState title="تعذّر تحميل الشكوى" onRetry={(): void => { void selected.refetch(); }} />
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{selected.data.subject}</h3>
                <p className="text-xs text-neutral-500">{CATEGORY_LABELS[selected.data.category]} · {STATUS_LABELS[selected.data.status]}</p>
                <div className="mt-2 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50">{selected.data.description}</div>
              </div>
              <div className="flex flex-col gap-2">
                {selected.data.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-3 text-sm ${m.internal ? "border-warning-500/40 bg-warning-500/5" : m.senderRole === "AGENT" ? "border-primary-500/40 bg-primary-500/5" : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"}`}
                  >
                    <div className="mb-1 flex justify-between text-xs opacity-70">
                      <span>{m.senderRole === "AGENT" ? "فريق الدعم" : "الطالب"}{m.internal ? " (داخلية)" : ""}</span>
                      <span>{new Date(m.createdAt).toLocaleString("ar-EG")}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t pt-4">
                <Textarea value={reply} onChange={(e): void => { setReply(e.target.value); }} placeholder="اكتب رداً..." rows={3} />
                <div className="flex justify-between">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={internal} onChange={(e): void => { setInternal(e.target.checked); }} />
                    ملاحظة داخلية
                  </label>
                  <Button variant="primary" onClick={onSendReply} disabled={!reply.trim() || addMessage.isPending}>
                    <Send className="h-4 w-4" /> إرسال
                  </Button>
                </div>
              </div>
              {selected.data.status !== "RESOLVED" && selected.data.status !== "CLOSED" && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  <Textarea value={resolution} onChange={(e): void => { setResolution(e.target.value); }} placeholder="ملخص الحل..." rows={2} />
                  <div className="flex gap-2">
                    <Button variant="success" onClick={(): void => { resolveTicket.mutate({ ticketId: selected.data.id, resolution: resolution || "تم الحل." }); }}>
                      <CheckCircle2 className="h-4 w-4" /> تعليم كمحلولة
                    </Button>
                    <Button variant="outline" onClick={(): void => { closeTicket.mutate(selected.data.id); }}>إغلاق</Button>
                    <Select
                      value={selected.data.status}
                      onChange={(e): void => { updateTicket.mutate({ ticketId: selected.data.id, status: e.target.value as TicketStatus }); }}
                      options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ComplaintPage(): ReactNode {
  const { can } = usePermissions();
  const isAgent = can(PERMISSIONS.SUPPORT_ANSWER);
  const [refreshKey, setRefreshKey] = useState(0);

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
            <AlertTriangle className="h-5 w-5 text-warning-500" />
            {isAgent ? "إدارة الشكاوى" : "إرسال شكوى أو مشكلة"}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {isAgent ? "استعرض شكاوى الطلاب ورد عليها" : "صف مشكلتك وسنرد عليك خلال 24 ساعة"}
          </p>
        </div>
      </div>

      {isAgent ? (
        <AgentComplaintQueue />
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <ComplaintForm key={refreshKey} onSuccess={(): void => { setRefreshKey((k) => k + 1); }} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                <Inbox className="h-5 w-5 text-primary-500" />
                شكاويّ السابقة
              </h2>
              <StudentTicketsInline />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

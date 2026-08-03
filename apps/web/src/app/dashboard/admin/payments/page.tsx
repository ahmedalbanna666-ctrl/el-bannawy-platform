"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  useAllOrders,
  useReviewOrder,
  useAllTransferNumbers,
  useCreateTransferNumber,
  useUpdateTransferNumber,
  useDeleteTransferNumber,
  getScreenshotSrc,
  type ManualPaymentOrder,
  type TransferNumber,
} from "@/lib/coins/manual-payment-api";
import { Banknote, CheckCircle2, XCircle, Eye, ImageOff, Plus, Pencil, Trash2, Copy } from "lucide-react";

const STATUS_BADGE: Record<string, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
};

const GATEWAY_LABELS: Record<string, string> = {
  INSTAPAY: "انستا باي",
  WALLET: "محفظة إلكترونية",
};

function ScreenshotThumbnail({ src, alt }: { src: string | null; alt: string }): ReactNode {
  if (!src) return null;
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative mt-2 block w-fit overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
      aria-label="فتح صورة الإيصال"
    >
      <img src={src} alt={alt} className="h-24 w-36 object-cover transition-transform group-hover:scale-105" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <Eye className="h-5 w-5 text-white" />
      </span>
    </a>
  );
}

function OrderReviewCard({
  order,
  onReview,
}: {
  order: ManualPaymentOrder;
  onReview: (id: string, status: "APPROVED" | "REJECTED", note?: string) => Promise<void>;
}): ReactNode {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"APPROVED" | "REJECTED" | null>(null);
  const screenshotSrc = getScreenshotSrc(order.screenshot);

  const handleReview = async (status: "APPROVED" | "REJECTED"): Promise<void> => {
    if (status === "REJECTED" && !note.trim()) {
      setError("يرجى كتابة سبب الرفض");
      return;
    }
    setError(null);
    setSubmitting(status);
    try {
      await onReview(order.id, status, note.trim() || undefined);
      setDialogOpen(false);
      setNote("");
    } catch {
      // handled by parent toast
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card variant="elevated" padding="md">
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {order.user?.fullName ?? "طالب"}
              </span>
              <span dir="ltr" className="text-xs text-neutral-400">{order.user?.mobileNumber ?? ""}</span>
              <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              <p>الباقة: {order.package?.name ?? "غير معروفة"}</p>
              <p>
                المبلغ: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{order.amount} EGP</span>
                {" ← "}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{order.coinAmount} عملة</span>
              </p>
              <p>طريقة الدفع: {GATEWAY_LABELS[order.gateway] ?? order.gateway}</p>
              <p>
                رقم التحويل المستقبل: <span dir="ltr" className="font-mono">{order.transferNumber}</span>
              </p>
              <p>
                رقم المُرسِل: <span dir="ltr" className="font-mono">{order.senderNumber}</span>
              </p>
              <p>
                رقم العملية: <span dir="ltr" className="font-mono">{order.transactionRef}</span>
              </p>
              <p className="text-xs text-neutral-400">{new Date(order.createdAt).toLocaleString("ar-EG")}</p>
            </div>

            {screenshotSrc ? (
              <ScreenshotThumbnail src={screenshotSrc} alt="إيصال التحويل" />
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
                <ImageOff className="h-3.5 w-3.5" /> لم يرفق الطالب إيصالاً
              </p>
            )}

            {order.adminNote && (
              <div className="mt-2 rounded-lg bg-neutral-100 p-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                ملاحظة الإدارة: {order.adminNote}
              </div>
            )}
          </div>

          {order.status === "PENDING" && (
            <div className="shrink-0 sm:self-center">
              <Button variant="primary" size="sm" onClick={() => { setDialogOpen(true); }}>
                <Eye className="h-4 w-4" /> مراجعة الطلب
              </Button>
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onClose={() => { if (!submitting) setDialogOpen(false); }} title="مراجعة طلب الدفع">
          <DialogContent>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {order.user?.fullName ?? "طالب"}
              </span>
              <Badge variant="warning">قيد المراجعة</Badge>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              <p>الباقة: {order.package?.name ?? "غير معروفة"}</p>
              <p>
                المبلغ: <span className="font-semibold">{order.amount} EGP</span> مقابل{" "}
                <span className="font-semibold">{order.coinAmount} عملة</span>
              </p>
              <p>
                رقم العملية: <span dir="ltr" className="font-mono">{order.transactionRef}</span>
              </p>
              <p>
                رقم المُرسِل: <span dir="ltr" className="font-mono">{order.senderNumber}</span>
              </p>
            </div>

            {screenshotSrc ? (
              <a href={screenshotSrc} target="_blank" rel="noopener noreferrer" className="block" aria-label="فتح الإيصال بالحجم الكامل">
                <img
                  src={screenshotSrc}
                  alt="إيصال التحويل"
                  className="max-h-64 w-full rounded-lg border border-neutral-200 object-contain bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </a>
            ) : (
              <p className="flex items-center gap-1.5 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <ImageOff className="h-4 w-4" /> لم يرفق الطالب إيصالاً
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                ملاحظة (مطلوبة عند الرفض)
              </label>
              <Textarea
                placeholder="اكتب ملاحظة للطالب..."
                value={note}
                onChange={(e) => { setNote(e.target.value); setError(null); }}
                rows={2}
              />
              {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setNote(""); setError(null); }} disabled={submitting !== null}>
              إلغاء
            </Button>
            <Button variant="danger" size="sm" loading={submitting === "REJECTED"} disabled={submitting !== null}
              onClick={() => { void handleReview("REJECTED"); }}>
              <XCircle className="h-4 w-4" /> رفض
            </Button>
            <Button variant="primary" size="sm" loading={submitting === "APPROVED"} disabled={submitting !== null}
              onClick={() => { void handleReview("APPROVED"); }}>
              <CheckCircle2 className="h-4 w-4" /> موافقة وإضافة العملات
            </Button>
          </DialogFooter>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function TransferNumberForm({ initial, onSave, onCancel, saving }: {
  initial?: TransferNumber;
  onSave: (dto: { gateway: string; label: string; number: string; accountName?: string }) => void | Promise<void>;
  onCancel: () => void;
  saving: boolean;
}): ReactNode {
  const [gateway, setGateway] = useState(initial?.gateway ?? "INSTAPAY");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [accountName, setAccountName] = useState(initial?.accountName ?? "");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <select value={gateway} onChange={(e) => { setGateway(e.target.value); }}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
        <option value="INSTAPAY">انستا باي</option>
        <option value="WALLET">محفظة إلكترونية</option>
      </select>
      <Input label="المسمى" placeholder="مثال: انستا باي 1" value={label} onChange={(e) => { setLabel(e.target.value); }} />
      <Input label="الرقم" placeholder="010xxxxxxxx" value={number} onChange={(e) => { setNumber(e.target.value); }} dir="ltr" />
      <Input label="اسم صاحب الحساب" placeholder="اختياري" value={accountName} onChange={(e) => { setAccountName(e.target.value); }} />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={saving} disabled={!label || !number} onClick={(): void => { void onSave({ gateway, label, number, accountName: accountName || undefined }); }}>
          {initial ? "تحديث" : "إضافة"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
      </div>
    </div>
  );
}

function TransferNumbersTab(): ReactNode {
  const { data: numbers, isLoading } = useAllTransferNumbers();
  const { mutateAsync: create } = useCreateTransferNumber();
  const { mutateAsync: update } = useUpdateTransferNumber();
  const { mutateAsync: remove } = useDeleteTransferNumber();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => { setCopiedId(null); }, 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">إدارة أرقام تحويل المحافظ الإلكترونية وانستا باي</p>
        {!showForm && !editingId && (
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); setEditingId(null); }}>
            <Plus className="h-4 w-4" /> إضافة رقم
          </Button>
        )}
      </div>

      {showForm && (
        <TransferNumberForm
          onSave={async (dto) => {
            setSaving(true);
            try { await create(dto); setShowForm(false); } finally { setSaving(false); }
          }}
          onCancel={() => { setShowForm(false); }}
          saving={saving}
        />
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : numbers && numbers.length > 0 ? (
        <div className="flex flex-col gap-3">
          {numbers.map((n) => (
            <Card key={n.id} variant={n.active ? "elevated" : "outline"} padding="md">
              <CardContent>
                {editingId === n.id ? (
                  <TransferNumberForm
                    initial={n}
                    onSave={async (dto) => {
                      setSaving(true);
                      try { await update({ id: n.id, ...dto }); setEditingId(null); } finally { setSaving(false); }
                    }}
                    onCancel={() => { setEditingId(null); }}
                    saving={saving}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {GATEWAY_LABELS[n.gateway] ?? n.gateway}
                          </span>
                          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{n.label}</p>
                          {!n.active && <span className="text-[10px] text-danger-500">غير نشط</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-neutral-500" dir="ltr">{n.number}</span>
                          {n.accountName && <span className="text-xs text-neutral-400">({n.accountName})</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { void handleCopy(n.number, n.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        {copiedId === n.id ? <CheckCircle2 className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button onClick={() => { setEditingId(n.id); setShowForm(false); }}
                        className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-neutral-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => { void remove(n.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-danger-500 dark:hover:bg-neutral-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Banknote className="h-16 w-16" />} title="لا توجد أرقام تحويل" description="أضف رقم تحويل لبدء استقبال طلبات الدفع" />
      )}
    </div>
  );
}

function PaymentOrdersTab(): ReactNode {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: orders, isLoading } = useAllOrders(filter);
  const { mutateAsync: review } = useReviewOrder();

  const filters = [
    { key: undefined, label: "الكل" },
    { key: "PENDING", label: "قيد المراجعة" },
    { key: "APPROVED", label: "تمت الموافقة" },
    { key: "REJECTED", label: "مرفوض" },
  ];

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED", note?: string): Promise<void> => {
    try {
      await review({ id, status, adminNote: note });
      toast.success(status === "APPROVED" ? "تمت الموافقة على الطلب وإضافة العملات" : "تم رفض الطلب");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء مراجعة الطلب");
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">مراجعة طلبات شراء العملات يدوياً</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.key ?? "all"} onClick={() => { setFilter(f.key); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderReviewCard key={order.id} order={order} onReview={handleReview} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Banknote className="h-16 w-16" />} title="لا توجد طلبات" description="لا توجد طلبات دفع بهذه الحالة" />
      )}
    </div>
  );
}

const TABS = [
  { id: "orders", label: "طلبات الدفع" },
  { id: "transfer", label: "أرقام التحويل" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PaymentsPage(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabId>("orders");

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">طلبات الدفع والتحويلات</h1>
        <p className="text-sm text-neutral-500">إدارة الدفع اليدوي: مراجعة الطلبات وأرقام التحويل</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "orders" ? <PaymentOrdersTab /> : <TransferNumbersTab />}
    </div>
  );
}

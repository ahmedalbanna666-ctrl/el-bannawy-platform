"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,

  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  useUnlockRequests,
  useResolveUnlockRequest,
  type UnlockRequestItem,
} from "@/lib/coins/coins-api";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";

const STATUS_BADGE: Record<string, { variant: "warning" | "success" | "danger"; label: string }> = {
  PENDING: { variant: "warning", label: "قيد المراجعة" },
  APPROVED: { variant: "success", label: "تمت الموافقة" },
  REJECTED: { variant: "danger", label: "مرفوض" },
};

function ResolveDialog({
  request,
  open,
  onClose,
}: {
  request: UnlockRequestItem;
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const [adminNote, setAdminNote] = useState("");
  const { mutateAsync: resolve, isPending } = useResolveUnlockRequest();

  const handleResolve = useCallback(async (status: string) => {
    try {
      await resolve({ id: request.id, status, adminNote: adminNote.trim() || undefined });
      onClose();
    } catch { /* */ }
  }, [request.id, adminNote, resolve, onClose]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader><h2 className="text-lg font-semibold">معالجة الطلب</h2></DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50">
            <p><strong>الطالب:</strong> {request.user?.fullName}</p>
            <p><strong>النوع:</strong> {request.targetType === "UNIT" ? "وحدة" : "درس"}</p>
            <p><strong>المعرف:</strong> {request.targetId}</p>
          </div>
          <Textarea label="ملاحظة (اختياري)" value={adminNote} onChange={(e) => { setAdminNote(e.target.value); }} placeholder="سبب الموافقة أو الرفض" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="danger" loading={isPending} onClick={() => { void handleResolve("REJECTED"); }}>
            <XCircle className="h-4 w-4" /> رفض
          </Button>
          <Button variant="success" loading={isPending} onClick={() => { void handleResolve("APPROVED"); }}>
            <CheckCircle2 className="h-4 w-4" /> موافقة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUnlockRequestsPage(): ReactNode {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: requests, isLoading, isError, refetch } = useUnlockRequests(statusFilter);
  const [resolveTarget, setResolveTarget] = useState<UnlockRequestItem | null>(null);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <button onClick={() => { router.push("/dashboard/admin"); }} className="mb-2 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> العودة للإدارة
        </button>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">طلبات فتح المحتوى</h1>
      </div>

      <div className="flex gap-2">
        {[{ key: undefined, label: "الكل" }, { key: "PENDING", label: "قيد المراجعة" }, { key: "APPROVED", label: "تمت الموافقة" }, { key: "REJECTED", label: "مرفوض" }].map((f) => (
          <button key={f.label} onClick={() => { setStatusFilter(f.key); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === f.key ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isError && <ErrorState title="فشل تحميل الطلبات" onRetry={() => { void refetch(); }} />}

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : requests && requests.length > 0 ? (
        <div className="flex flex-col gap-3">
          {requests.map((req) => {
            const badge = STATUS_BADGE[req.status] ?? { variant: "secondary" as const, label: req.status };
            return (
              <Card key={req.id} variant="outline" padding="md">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileCheck className="mt-1 h-5 w-5 text-primary-500" />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{req.user?.fullName ?? "غير معروف"}</p>
                        <p className="text-sm text-neutral-500">
                          يطلب فتح {req.targetType === "UNIT" ? "وحدة" : "درس"}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(req.createdAt).toLocaleDateString("ar-SA")}</span>
                          {req.adminNote && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{req.adminNote}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {req.status === "PENDING" && (
                        <Button variant="primary" size="xs" onClick={() => { setResolveTarget(req); }}>معالجة</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<FileCheck className="h-16 w-16" />} title="لا توجد طلبات" description="لم يتم تقديم أي طلبات فتح محتوى" />
      )}

      {resolveTarget && <ResolveDialog request={resolveTarget} open={!!resolveTarget} onClose={() => { setResolveTarget(null); }} />}
    </div>
  );
}

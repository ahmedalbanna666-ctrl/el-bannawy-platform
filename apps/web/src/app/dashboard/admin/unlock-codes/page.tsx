"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePermissions } from "@/lib/use-permissions";
import {
  useUnlockCodes,
  useCreateUnlockCode,
  useToggleCodeActive,
} from "@/lib/coins/coins-api";
import {
  Key,
  Plus,
  Copy,
  CheckCircle2,
  ArrowLeft,
  QrCode,
} from "lucide-react";

function CreateCodeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const [coinAmount, setCoinAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const { mutateAsync: create, isPending } = useCreateUnlockCode();

  const handleSubmit = useCallback(async () => {
    if (!coinAmount) return;
    try {
      const res = await create({
        coinAmount: Number(coinAmount),
        maxUses: maxUses ? Number(maxUses) : undefined,
      });
      const data = (res as { data?: { code?: string } } | undefined)?.data;
      setCreatedCode(data?.code ?? null);
      setCoinAmount("");
      setMaxUses("");
    } catch { /* handled */ }
  }, [coinAmount, maxUses, create]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold">إنشاء رمز تفعيل جديد</h2>
        </DialogHeader>
        {createdCode ? (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              تم إنشاء الرمز بنجاح. انسخه وأرسله للطالب.
            </p>
            <code className="rounded-lg bg-neutral-100 px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-primary-600 dark:bg-neutral-800 dark:text-primary-400" dir="ltr">
              {createdCode}
            </code>
            <DialogFooter>
              <Button variant="primary" onClick={onClose}>تم</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              سيتم توليد رمز عشوائي فريد تلقائياً عند الإنشاء.
            </p>
            <Input label="قيمة العملات" type="number" value={coinAmount} onChange={(e) => { setCoinAmount(e.target.value); }} required />
            <Input label="الحد الأقصى للاستخدام (اختياري)" type="number" value={maxUses} onChange={(e) => { setMaxUses(e.target.value); }} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button variant="primary" loading={isPending} onClick={() => { void handleSubmit(); }} disabled={!coinAmount}>إنشاء</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUnlockCodesPage(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("unlock_codes.manage");
  const { data: codes, isLoading, isError, refetch } = useUnlockCodes();
  const { mutateAsync: toggleActive } = useToggleCodeActive();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => { setCopiedId(null); }, 2000);
    } catch { /* */ }
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    try { await toggleActive(id); } catch { /* */ }
  }, [toggleActive]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => { router.push("/dashboard/admin"); }} className="mb-2 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" /> العودة للإدارة
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">رموز التفعيل</h1>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => { setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> إنشاء رمز
          </Button>
        )}
      </div>

      {isError && <ErrorState title="فشل تحميل الرموز" onRetry={() => { void refetch(); }} />}

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : codes && codes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {codes.map((c) => (
            <Card key={c.id} variant="outline" padding="md">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-primary-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-sm font-bold dark:bg-neutral-800" dir="ltr">{c.code}</code>
                        <button onClick={() => { void handleCopy(c.code, c.id); }} className="text-neutral-400 hover:text-neutral-600">
                          {copiedId === c.id ? <CheckCircle2 className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                        <span>{c.coinAmount} عملة</span>
                         <span>استخدم {c.usedCount}{c.maxUses ? ` / ${String(c.maxUses)}` : ""} مرة</span>
                        {c.expiresAt && <span>ينتهي: {new Date(c.expiresAt).toLocaleDateString("ar-SA")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.active ? "success" : "secondary"}>{c.active ? "نشط" : "معطل"}</Badge>
                    {canManage && (
                      <Button variant={c.active ? "warning" : "success"} size="xs" onClick={() => { void handleToggle(c.id); }}>
                        {c.active ? "تعطيل" : "تفعيل"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<QrCode className="h-16 w-16" />} title="لا توجد رموز" description="لم يتم إنشاء أي رموز تفعيل بعد" />
      )}

      {dialogOpen && <CreateCodeDialog open={dialogOpen} onClose={() => { setDialogOpen(false); }} />}
    </div>
  );
}

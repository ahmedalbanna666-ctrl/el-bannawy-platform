"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { api } from "@/lib/api-client";
import {
  useUnlockCodes,
  useCreateUnlockCode,
  useToggleCodeActive,
  type UnlockCodeItem,
} from "@/lib/coins/coins-api";
import {
  Key,
  Plus,
  Copy,
  CheckCircle2,
  ArrowLeft,
  QrCode,
  Target,
  Coins,
  Trash2,
} from "lucide-react";

// ── Unit type for dropdown ──────────────────────────────────────

interface UnitOption {
  id: string;
  title: string;
  displayOrder: number;
  grade?: { id: string; name: string };
}

// ── Create Code Dialog ──────────────────────────────────────────

function CreateCodeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const [codeType, setCodeType] = useState<"coins" | "unit">("coins");
  const [coinAmount, setCoinAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const { mutateAsync: create, isPending } = useCreateUnlockCode();

  const {
    data: units,
    isLoading: unitsLoading,
    isError: unitsError,
  } = useQuery({
    queryKey: ["all-units-for-codes"],
    queryFn: async () => {
      const res = await api.get<UnitOption[]>("/curriculum/units");
      return res.data ?? [];
    },
    enabled: codeType === "unit",
    staleTime: 60_000,
  });

  const unitOptions = useMemo(
    () =>
      (units ?? []).map((u) => ({
        value: u.id,
        label: `${u.title}${u.grade ? ` (${u.grade.name})` : ""}`,
      })),
    [units],
  );

  const reset = useCallback(() => {
    setCodeType("coins");
    setCoinAmount("");
    setMaxUses("");
    setSelectedUnitId("");
    setCreatedCode(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (codeType === "coins" && !coinAmount) return;
    if (codeType === "unit" && !selectedUnitId) return;
    try {
      const payload =
        codeType === "coins"
          ? {
              coinAmount: Number(coinAmount),
              maxUses: maxUses ? Number(maxUses) : undefined,
            }
          : {
              coinAmount: 0,
              maxUses: maxUses ? Number(maxUses) : undefined,
              targetType: "UNIT" as const,
              targetId: selectedUnitId,
            };
      const res = await create(payload);
      const result = res as { data?: { code?: string } } | undefined;
      setCreatedCode(result?.data?.code ?? null);
    } catch {
      /* handled by mutation */
    }
  }, [codeType, coinAmount, maxUses, selectedUnitId, create]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Dialog open={open} onClose={handleClose}>
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
              <Button variant="primary" onClick={handleClose}>تم</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            {/* نوع الرمز */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setCodeType("coins"); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  codeType === "coins"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700"
                }`}
              >
                <Coins className="h-4 w-4" />
                عملات
              </button>
              <button
                type="button"
                onClick={() => { setCodeType("unit"); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  codeType === "unit"
                    ? "border-purple-500 bg-purple-500/10 text-purple-600"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700"
                }`}
              >
                <Target className="h-4 w-4" />
                فتح وحدة
              </button>
            </div>

            {codeType === "coins" ? (
              <div className="rounded-lg bg-amber-500/5 p-3 text-sm text-neutral-600 dark:text-neutral-400">
                الطالب يستخدم هذا الرمز للحصول على عملات في محفظته.
              </div>
            ) : (
              <div className="rounded-lg bg-purple-500/5 p-3 text-sm text-neutral-600 dark:text-neutral-400">
                الطالب يستخدم هذا الرمز لفتح وحدة محددة بدون دفع عملات.
              </div>
            )}

            {codeType === "coins" ? (
              <Input
                label="قيمة العملات"
                type="number"
                placeholder="مثال: 50"
                value={coinAmount}
                onChange={(e) => { setCoinAmount(e.target.value); }}
                required
              />
            ) : unitsLoading ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">الوحدة المستهدفة</label>
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : unitsError ? (
              <div className="rounded-lg bg-danger-500/10 p-3 text-sm text-danger-600">
                فشل تحميل الوحدات. حاول مرة أخرى.
              </div>
            ) : (
              <Select
                label="الوحدة المستهدفة"
                value={selectedUnitId}
                onChange={(e) => { setSelectedUnitId(e.target.value); }}
                options={unitOptions}
                placeholder={unitOptions.length === 0 ? "لا توجد وحدات متاحة" : "اختر الوحدة"}
              />
            )}

            <Input
              label="الحد الأقصى للاستخدام (اختياري)"
              type="number"
              placeholder="مثال: 10"
              value={maxUses}
              onChange={(e) => { setMaxUses(e.target.value); }}
            />

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>إلغاء</Button>
              <Button
                variant="primary"
                loading={isPending}
                onClick={() => { void handleSubmit(); }}
                disabled={
                  isPending ||
                  (codeType === "coins" && !coinAmount) ||
                  (codeType === "unit" && !selectedUnitId)
                }
              >
                إنشاء
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function AdminUnlockCodesPage(): ReactNode {
  const router = useRouter();
  const { can, isTeacher } = usePermissions();
  const canManage = can("unlock_codes.manage");
  const dashboardBack = isTeacher ? "/dashboard/teachers" : "/dashboard/admin";
  const { data: codes, isLoading, isError, refetch } = useUnlockCodes();
  const { mutateAsync: toggleActive } = useToggleCodeActive();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const coinCodes = useMemo(() => (codes ?? []).filter((c) => !c.targetType), [codes]);
  const unitCodes = useMemo(() => (codes ?? []).filter((c) => c.targetType === "UNIT"), [codes]);

  if (isError) {
    return (
      <div className="flex flex-col gap-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => { router.push(dashboardBack); }} className="mb-2 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
              <ArrowLeft className="h-4 w-4" /> العودة للإدارة
            </button>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">رموز التفعيل</h1>
          </div>
        </div>
        <ErrorState title="فشل تحميل الرموز" onRetry={() => { void refetch(); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => { router.push(dashboardBack); }} className="mb-2 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
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

      {isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        </div>
      ) : (
        <>
          {/* رموز العملات */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">رموز العملات</h2>
              <Badge variant="secondary" className="text-xs">{coinCodes.length}</Badge>
            </div>
            {coinCodes.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
                <Coins className="h-5 w-5 text-neutral-400" />
                لا توجد رموز عملات. أنشئ واحداً من الزر أعلاه.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {coinCodes.map((c) => (
                  <CodeCard
                    key={c.id}
                    code={c}
                    icon={<Key className="h-5 w-5 text-primary-500" />}
                    onCopy={handleCopy}
                    onToggle={handleToggle}
                    canManage={canManage}
                    copiedId={copiedId}
                  />
                ))}
              </div>
            )}
          </section>

          {/* رموز فتح الوحدات */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">رموز فتح الوحدات</h2>
              <Badge variant="secondary" className="text-xs">{unitCodes.length}</Badge>
            </div>
            {unitCodes.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
                <Target className="h-5 w-5 text-neutral-400" />
                لا توجد رموز فتح وحدات. أنشئ واحداً من الزر أعلاه.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {unitCodes.map((c) => (
                  <CodeCard
                    key={c.id}
                    code={c}
                    icon={<Target className="h-5 w-5 text-purple-500" />}
                    onCopy={handleCopy}
                    onToggle={handleToggle}
                    canManage={canManage}
                    copiedId={copiedId}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {dialogOpen && <CreateCodeDialog open={dialogOpen} onClose={() => { setDialogOpen(false); }} />}
    </div>
  );
}

// ── Code Card ───────────────────────────────────────────────────

function CodeCard({
  code: c,
  icon,
  onCopy,
  onToggle,
  canManage,
  copiedId,
}: {
  code: UnlockCodeItem;
  icon: ReactNode;
  onCopy: (code: string, id: string) => void;
  onToggle: (id: string) => void;
  canManage: boolean;
  copiedId: string | null;
}): ReactNode {
  return (
    <Card variant="outline" padding="md">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-sm font-bold dark:bg-neutral-800" dir="ltr">{c.code}</code>
                <button onClick={() => { void onCopy(c.code, c.id); }} className="text-neutral-400 hover:text-neutral-600">
                  {copiedId === c.id ? <CheckCircle2 className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                {c.targetType === "UNIT" ? (
                  <span className="flex items-center gap-1 font-medium text-purple-500">
                    <Target className="h-3 w-3" /> فتح وحدة
                  </span>
                ) : (
                  <span className="font-medium text-amber-600 dark:text-amber-400">{c.coinAmount} عملة</span>
                )}
                <span>
                  استخدام: {c.usedCount}{c.maxUses ? ` / ${String(c.maxUses)}` : ""}
                </span>
                {c.expiresAt && (
                  <span>
                    ينتهي: {new Date(c.expiresAt).toLocaleDateString("ar-SA")}
                  </span>
                )}
                <span>
                  أنشئ: {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={c.active ? "success" : "secondary"}>
              {c.active ? "نشط" : "معطل"}
            </Badge>
            {canManage && (
              <Button
                variant={c.active ? "warning" : "success"}
                size="xs"
                onClick={() => { void onToggle(c.id); }}
              >
                {c.active ? "تعطيل" : "تفعيل"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

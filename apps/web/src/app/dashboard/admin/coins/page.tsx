"use client";

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  useAllCoinPackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  type CoinPackageItem,
  useUnlockCost,
  useSetUnlockCost,
  useUnlockCodes,
  useCreateUnlockCode,
  useToggleCodeActive,
  useDeleteUnlockCode,
  type UnlockCodeItem,
  useUnlockRequests,
  useResolveUnlockRequest,
  type UnlockRequestItem,
} from "@/lib/coins/coins-api";
import {
  Coins,
  Plus,
  Edit3,
  Trash2,
  Package,
  Layers,
  Key,
  Copy,
  CheckCircle2,
  Target,
  Printer,
  Download,
  FileCheck,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tab 1: باقات العملات
// ---------------------------------------------------------------------------

function PackageFormDialog({
  open,
  onClose,
  pkg,
}: {
  open: boolean;
  onClose: () => void;
  pkg?: CoinPackageItem | null;
}): ReactNode {
  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [coinAmount, setCoinAmount] = useState(String(pkg?.coinAmount ?? ""));
  const [price, setPrice] = useState(String(pkg?.price ?? ""));
  const { mutateAsync: create, isPending: creating } = useCreatePackage();
  const { mutateAsync: update, isPending: updating } = useUpdatePackage();
  const isEdit = !!pkg;

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !coinAmount || !price) return;
    try {
      if (isEdit) {
        await update({ id: pkg.id, data: { name: name.trim(), description: description.trim(), coinAmount: Number(coinAmount), price: Number(price) } });
      } else {
        await create({ name: name.trim(), description: description.trim(), coinAmount: Number(coinAmount), price: Number(price) });
      }
      onClose();
    } catch { /* handled */ }
  }, [name, description, coinAmount, price, isEdit, pkg, create, update, onClose]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold">{isEdit ? "تعديل الباقة" : "إضافة باقة جديدة"}</h2>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input label="اسم الباقة" value={name} onChange={(e) => { setName(e.target.value); }} required />
          <Textarea label="الوصف" value={description} onChange={(e) => { setDescription(e.target.value); }} />
          <Input label="عدد العملات" type="number" value={coinAmount} onChange={(e) => { setCoinAmount(e.target.value); }} required />
          <Input label="السعر (EGP)" type="number" value={price} onChange={(e) => { setPrice(e.target.value); }} required />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" loading={creating || updating} onClick={() => { void handleSubmit(); }} disabled={!name.trim() || !coinAmount || !price}>
            {isEdit ? "حفظ التغييرات" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoinPackagesTab(): ReactNode {
  const { can } = usePermissions();
  const canManage = can("coins.manage");
  const { data: packages, isLoading, isError, refetch } = useAllCoinPackages();
  const { mutateAsync: deletePackage } = useDeletePackage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CoinPackageItem | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
    try {
      await deletePackage(id);
      void refetch();
    } catch { /* handled */ }
  }, [deletePackage, refetch]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">إدارة باقات العملات</h1>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            إضافة باقة
          </Button>
        )}
      </div>

      {isError && <ErrorState title="فشل تحميل الباقات" description="قد لا تملك صلاحية الوصول أو حدث خطأ في الخادم" onRetry={() => { void refetch(); }} />}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : packages && packages.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} variant={pkg.active ? "elevated" : "outline"} padding="md">
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-500" />
                      <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{pkg.name}</h3>
                    </div>
                    <Badge variant={pkg.active ? "success" : "secondary"}>{pkg.active ? "نشط" : "معطل"}</Badge>
                  </div>
                  {pkg.description && <p className="text-sm text-neutral-500">{pkg.description}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">العملات:</span>
                    <span className="font-bold text-amber-500">{pkg.coinAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">السعر:</span>
                    <span className="font-bold text-primary-500">{pkg.price.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>تاريخ الإنشاء: {new Date(pkg.createdAt).toLocaleDateString("ar-SA")}</span>
                  </div>
                  {canManage && (
                    <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <Button variant="outline" size="xs" onClick={() => { setEditTarget(pkg); setDialogOpen(true); }}>
                        <Edit3 className="h-3 w-3" />
                        تعديل
                      </Button>
                      <Button variant="danger" size="xs" onClick={() => { void handleDelete(pkg.id); }}>
                        <Trash2 className="h-3 w-3" />
                        حذف
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Package className="h-16 w-16" />} title="لا توجد باقات" description="لم يتم إنشاء أي باقات بعد" />
      )}

      {dialogOpen && (
        <PackageFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditTarget(null); }} pkg={editTarget} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: أسعار فتح المحتوى
// ---------------------------------------------------------------------------

interface PriceRow {
  targetType: "UNIT" | "TERM";
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}

function PriceCard({ row, saving, onSave }: {
  row: PriceRow;
  saving: boolean;
  onSave: () => void;
}): ReactNode {
  return (
    <Card variant="outline" padding="lg">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
            {row.targetType === "UNIT" ? (
              <Package className="h-5 w-5 text-primary-500" />
            ) : (
              <Layers className="h-5 w-5 text-primary-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{row.title}</h3>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{row.description}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              السعر (عملة)
            </label>
            <Input
              dir="ltr"
              type="number"
              min={0}
              value={Number.isFinite(row.value) ? String(row.value) : "0"}
              onChange={(e): void => { row.onChange(Number(e.target.value)); }}
            />
          </div>
          <Button variant="primary" onClick={onSave} loading={saving} className="shrink-0">
            حفظ السعر
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UnlockPricingTab(): ReactNode {
  const { data: unitCostData, isLoading: unitLoading, isError: unitError, error: unitErr } = useUnlockCost("UNIT");
  const { data: termCostData, isLoading: termLoading, isError: termError, error: termErr } = useUnlockCost("TERM");
  const setCostMut = useSetUnlockCost();

  const [unitCost, setUnitCost] = useState(50);
  const [termCost, setTermCost] = useState(300);

  useEffect(() => {
    if (unitCostData) setUnitCost(unitCostData.cost);
  }, [unitCostData]);

  useEffect(() => {
    if (termCostData) setTermCost(termCostData.cost);
  }, [termCostData]);

  if (unitLoading || termLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (unitError || termError) {
    return (
      <ErrorState
        title="فشل تحميل الأسعار"
        description={unitErr instanceof Error ? unitErr.message : termErr instanceof Error ? termErr.message : "حدث خطأ غير متوقع"}
        onRetry={(): void => { window.location.reload(); }}
      />
    );
  }

  const rows: PriceRow[] = [
    {
      targetType: "UNIT",
      title: "سعر فتح الوحدة",
      description: "تكلفة فتح وحدة واحدة بالعملات من جانب الطالب",
      value: unitCost,
      onChange: setUnitCost,
    },
    {
      targetType: "TERM",
      title: "سعر فتح الترم بالكامل",
      description: "تكلفة فتح جميع وحدات الترم دفعة واحدة",
      value: termCost,
      onChange: setTermCost,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">أسعار فتح المحتوى</h1>
        <p className="mt-1 text-sm text-neutral-500">التحكم في تكلفة فتح الوحدات أو الترم كاملاً بالعملات</p>
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <PriceCard
            key={row.targetType}
            row={row}
            saving={setCostMut.isPending}
            onSave={(): void => {
              const cost = Math.max(0, Math.floor(row.value));
              setCostMut.mutate(
                { targetType: row.targetType, cost },
                {
                  onSuccess: () => { toast(`تم حفظ سعر ${row.title}`); },
                  onError: (err) => {
                    toast.error(err instanceof Error ? err.message : "تعذر حفظ السعر");
                  },
                },
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: رموز التفعيل
// ---------------------------------------------------------------------------

interface AcademicOption {
  stages: { id: string; name: string; grades: { id: string; name: string }[] }[];
}

interface UnitOption {
  id: string;
  title: string;
  displayOrder: number;
  grade?: { id: string; name: string; stage?: { id: string; name: string } };
}

function ChargingCard({
  code,
  unitTitle,
  stageName,
  gradeName,
  cardRef,
}: {
  code: string;
  unitTitle: string;
  stageName: string;
  gradeName: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
}): ReactNode {
  return (
    <div
      ref={cardRef}
      className="relative w-[320px] overflow-hidden rounded-2xl border-2 border-primary-500/30 bg-gradient-to-br from-primary-500/5 via-white to-primary-500/10 p-6 shadow-xl dark:from-primary-900/20 dark:via-neutral-900 dark:to-primary-900/10"
      dir="ltr"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-500/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white text-xs font-bold">
              EB
            </div>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              El Bannawy
            </span>
          </div>
          <Badge variant="primary" className="text-[10px]">
            كود تفعيل
          </Badge>
        </div>

        <div className="flex flex-col gap-1 text-center" dir="rtl">
          <span className="text-xs text-neutral-500">رمز التفعيل</span>
          <code className="rounded-lg bg-neutral-100 px-3 py-2.5 text-center font-mono text-2xl font-black tracking-[0.3em] text-primary-600 dark:bg-neutral-800 dark:text-primary-400">
            {code}
          </code>
        </div>

        <div className="flex flex-col gap-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50" dir="rtl">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">الوحدة</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{unitTitle}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">المرحلة</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{stageName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">الصف</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{gradeName}</span>
          </div>
        </div>

        <div className="text-center text-[10px] text-neutral-400">
          El Bannawy Platform - منصة البناوي
        </div>
      </div>
    </div>
  );
}

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
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdUnitTitle, setCreatedUnitTitle] = useState("");
  const [createdStageName, setCreatedStageName] = useState("");
  const [createdGradeName, setCreatedGradeName] = useState("");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { mutateAsync: create, isPending } = useCreateUnlockCode();

  const { data: acOptions, isLoading: acLoading } = useQuery({
    queryKey: ["academic-options"],
    queryFn: async () => {
      const res = await api.get<AcademicOption>("/academic-context/options");
      return res.data ?? { stages: [] };
    },
    staleTime: 300_000,
  });

  const stageOptions = useMemo(
    () => (acOptions?.stages ?? []).map((s) => ({ value: s.id, label: s.name })),
    [acOptions],
  );

  const gradeOptions = useMemo(
    () =>
      (acOptions?.stages ?? [])
        .find((s) => s.id === selectedStageId)
        ?.grades.map((g) => ({ value: g.id, label: g.name })) ?? [],
    [acOptions, selectedStageId],
  );

  const {
    data: units,
    isLoading: unitsLoading,
    isError: unitsError,
  } = useQuery({
    queryKey: ["units-for-codes", selectedGradeId],
    queryFn: async () => {
      if (!selectedGradeId) return [];
      const params = new URLSearchParams({ gradeId: selectedGradeId });
      const res = await api.get<UnitOption[]>(`/curriculum/units?${params.toString()}`);
      return res.data ?? [];
    },
    enabled: codeType === "unit" && !!selectedGradeId,
    staleTime: 60_000,
  });

  const unitOptions = useMemo(
    () =>
      (units ?? []).map((u) => ({
        value: u.id,
        label: `الوحدة ${String(u.displayOrder)} - ${u.title}`,
      })),
    [units],
  );

  const reset = useCallback(() => {
    setCodeType("coins");
    setCoinAmount("");
    setMaxUses("");
    setSelectedUnitId("");
    setSelectedStageId("");
    setSelectedGradeId("");
    setCreatedCode(null);
    setCreatedUnitTitle("");
    setCreatedStageName("");
    setCreatedGradeName("");
    setCopied(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (codeType === "coins" && !coinAmount) return;
    if (codeType === "unit" && !selectedUnitId) return;
    try {
      const selectedUnit = codeType === "unit" ? (units ?? []).find((u) => u.id === selectedUnitId) : null;
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
      const newCode = result?.data?.code ?? null;
      setCreatedCode(newCode);
      if (codeType === "unit" && selectedUnit) {
        setCreatedUnitTitle(selectedUnit.title);
        setCreatedStageName(selectedUnit.grade?.stage?.name ?? "");
        setCreatedGradeName(selectedUnit.grade?.name ?? "");
      } else {
        setCreatedUnitTitle("");
        setCreatedStageName("");
        setCreatedGradeName("");
      }
    } catch {
      /* handled by mutation */
    }
  }, [codeType, coinAmount, maxUses, selectedUnitId, create, units]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleCopy = useCallback(async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    } catch { /* */ }
  }, [createdCode]);

  const handlePrint = useCallback(() => {
    if (!cardRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const cardHtml = cardRef.current.outerHTML;
    const doc = printWindow.document;
    const styles = `
      <style>
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; font-family: sans-serif; }
        @page { margin: 20mm; }
        * { box-sizing: border-box; }
      </style>
    `;
    doc.head.insertAdjacentHTML("afterbegin", styles);
    doc.body.insertAdjacentHTML("afterbegin", cardHtml);
    printWindow.onload = (): void => { printWindow.print(); };
  }, []);

  const handleDownloadImage = useCallback(async (): Promise<void> => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        allowTaint: false,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `activation-code-${String(createdCode)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { /* */ }
  }, [createdCode]);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <h2 className="text-lg font-semibold">
            {createdCode ? "تم إنشاء الرمز بنجاح" : "إنشاء رمز تفعيل جديد"}
          </h2>
        </DialogHeader>

        {createdCode ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <ChargingCard
              cardRef={cardRef}
              code={createdCode}
              unitTitle={createdUnitTitle}
              stageName={createdStageName}
              gradeName={createdGradeName}
            />

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="primary" size="sm" onClick={() => { void handleCopy(); }}>
                {copied ? (
                  <><CheckCircle2 className="h-4 w-4" /> تم النسخ</>
                ) : (
                  <><Copy className="h-4 w-4" /> نسخ الرمز</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { handlePrint(); }}>
                <Printer className="h-4 w-4" /> طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={() => { void handleDownloadImage(); }}>
                <Download className="h-4 w-4" /> حفظ كصورة
              </Button>
            </div>

            <DialogFooter className="w-full">
              <Button variant="primary" className="w-full" onClick={handleClose}>
                تم
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
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
                اختر المرحلة والصف ثم الوحدة التي تريد إنشاء كود تفعيل لها.
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
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      label="المرحلة"
                      value={selectedStageId}
                      onChange={(e) => { setSelectedStageId(e.target.value); setSelectedGradeId(""); setSelectedUnitId(""); }}
                      options={stageOptions}
                      placeholder={acLoading ? "جاري التحميل..." : "اختر المرحلة"}
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      label="الصف"
                      value={selectedGradeId}
                      onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedUnitId(""); }}
                      options={gradeOptions}
                      placeholder="اختر الصف أولاً"
                      disabled={!selectedStageId}
                    />
                  </div>
                </div>

                {unitsLoading ? (
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
                    placeholder={!selectedGradeId ? "اختر الصف أولاً" : unitOptions.length === 0 ? "لا توجد وحدات" : "اختر الوحدة"}
                    disabled={!selectedGradeId}
                  />
                )}
              </>
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

function CodeCard({
  code: c,
  icon,
  onCopy,
  onToggle,
  onDelete,
  canManage,
  copiedId,
  deletingId,
}: {
  code: UnlockCodeItem;
  icon: ReactNode;
  onCopy: (code: string, id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
  copiedId: string | null;
  deletingId: string | null;
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
                <button onClick={() => { onCopy(c.code, c.id); }} className="text-neutral-400 hover:text-neutral-600">
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
                onClick={() => { onToggle(c.id); }}
              >
                {c.active ? "تعطيل" : "تفعيل"}
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="icon-sm"
                loading={deletingId === c.id}
                onClick={() => { onDelete(c.id); }}
                className="text-danger-500 hover:bg-danger-500/10 hover:text-danger-600"
                aria-label="حذف الرمز"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UnlockCodesTab(): ReactNode {
  const { can } = usePermissions();
  const canManage = can("unlock_codes.manage");
  const { data: codes, isLoading, isError, refetch } = useUnlockCodes();
  const { mutateAsync: toggleActive } = useToggleCodeActive();
  const { mutateAsync: deleteCode } = useDeleteUnlockCode();
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

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الرمز؟ لا يمكن التراجع عن هذه العملية.")) return;
    setDeletingId(id);
    try {
      await deleteCode(id);
    } catch { /* */ } finally {
      setDeletingId(null);
    }
  }, [deleteCode]);

  const coinCodes = useMemo(() => {
    if (!Array.isArray(codes)) return [];
    return codes.filter((c) => !c.targetType);
  }, [codes]);
  const unitCodes = useMemo(() => {
    if (!Array.isArray(codes)) return [];
    return codes.filter((c) => c.targetType === "UNIT");
  }, [codes]);

  if (isError) {
    return <ErrorState title="فشل تحميل الرموز" onRetry={() => { void refetch(); }} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
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
                    onCopy={(code, id) => { void handleCopy(code, id); }}
                    onToggle={(id) => { void handleToggle(id); }}
                    onDelete={(id) => { void handleDelete(id); }}
                    canManage={canManage}
                    copiedId={copiedId}
                    deletingId={deletingId}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">رموز فتح الوحدات</h2>
              <Badge variant="secondary" className="text-xs">{unitCodes.length}</Badge>
            </div>
            {unitCodes.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
                <Target className="h-5 w-5 text-neutral-400" />
                لا توجد رموز فتح الوحدات. أنشئ واحداً من الزر أعلاه.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {unitCodes.map((c) => (
                  <CodeCard
                    key={c.id}
                    code={c}
                    icon={<Target className="h-5 w-5 text-purple-500" />}
                    onCopy={(code, id) => { void handleCopy(code, id); }}
                    onToggle={(id) => { void handleToggle(id); }}
                    onDelete={(id) => { void handleDelete(id); }}
                    canManage={canManage}
                    copiedId={copiedId}
                    deletingId={deletingId}
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

// ---------------------------------------------------------------------------
// Tab 4: طلبات فتح المحتوى
// ---------------------------------------------------------------------------

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

function UnlockRequestsTab(): ReactNode {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: requests, isLoading, isError, refetch } = useUnlockRequests(statusFilter);
  const [resolveTarget, setResolveTarget] = useState<UnlockRequestItem | null>(null);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
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

// ---------------------------------------------------------------------------
// Page: العملات والمحتوى المدفوع
// ---------------------------------------------------------------------------

const TABS = [
  { id: "packages", label: "باقات العملات" },
  { id: "pricing", label: "أسعار الفتح" },
  { id: "codes", label: "رموز التفعيل" },
  { id: "requests", label: "طلبات فتح المحتوى" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminCoinsPage(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabId>("packages");

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">العملات والمحتوى المدفوع</h1>
        <p className="text-sm text-neutral-500">إدارة باقات العملات وأسعار الفتح ورموز التفعيل وطلبات فتح المحتوى</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "packages" && <CoinPackagesTab />}
      {activeTab === "pricing" && <UnlockPricingTab />}
      {activeTab === "codes" && <UnlockCodesTab />}
      {activeTab === "requests" && <UnlockRequestsTab />}
    </div>
  );
}

"use client";

import { useState, useCallback, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePermissions } from "@/lib/use-permissions";
import {
  useAllCoinPackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  type CoinPackageItem,
} from "@/lib/coins/coins-api";
import {
  Coins,
  Plus,
  Edit3,
  Trash2,
  Package,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

function PackagesManager(): ReactNode {
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

export default function AdminCoinPackagesPage(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("coins.manage");

  return (
    <div className="flex flex-col gap-6 pb-4">
      <button onClick={() => { router.push("/dashboard/admin"); }} className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" />
        العودة للإدارة
      </button>

      {canManage ? (
        <PackagesManager />
      ) : (
        <ErrorState
          title="لا تملك صلاحية الوصول"
          description="فقط المديرون يمكنهم إدارة باقات العملات. تواصل مع مسؤول النظام للحصول على الصلاحية."
        />
      )}
    </div>
  );
}

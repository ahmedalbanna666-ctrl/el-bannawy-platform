"use client";

import { useState, type ReactNode } from "react";
import { useGradeSupportContacts, useUpdateGradeSupportContact, type GradeSupportContact, type UpdateGradeSupportContactDto } from "@/lib/support/grade-support-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Smartphone, Mail, MessageCircle, Phone, Save, X } from "lucide-react";

interface EditModalProps {
  grade: GradeSupportContact;
  onClose: () => void;
}

function EditModal({ grade, onClose }: EditModalProps): ReactNode {
  const [phone, setPhone] = useState(grade.supportPhone ?? "");
  const [email, setEmail] = useState(grade.supportEmail ?? "");
  const [whatsapp, setWhatsapp] = useState(grade.supportWhatsapp ?? "");
  const mutation = useUpdateGradeSupportContact();

  const handleSave = (): void => {
    const data: UpdateGradeSupportContactDto = {};
    if (phone.trim()) data.supportPhone = phone.trim();
    else data.supportPhone = null;
    if (email.trim()) data.supportEmail = email.trim();
    else data.supportEmail = null;
    if (whatsapp.trim()) data.supportWhatsapp = whatsapp.trim();
    else data.supportWhatsapp = null;

    mutation.mutate(
      { gradeId: grade.id, data },
      { onSuccess: () => { onClose(); } },
    );
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogContent>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            تعديل بيانات الدعم الفني - {grade.name}
          </h2>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <Phone className="inline h-3.5 w-3.5 ml-1" />
              رقم الهاتف
            </label>
            <Input
              value={phone}
              onChange={(e): void => { setPhone(e.target.value); }}
              placeholder="مثال: +201000000000"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <Mail className="inline h-3.5 w-3.5 ml-1" />
              البريد الإلكتروني
            </label>
            <Input
              value={email}
              onChange={(e): void => { setEmail(e.target.value); }}
              placeholder="مثال: support@el-bannawy.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <MessageCircle className="inline h-3.5 w-3.5 ml-1" />
              رقم واتساب
            </label>
            <Input
              value={whatsapp}
              onChange={(e): void => { setWhatsapp(e.target.value); }}
              placeholder="مثال: 201000000000"
              dir="ltr"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            <X className="h-4 w-4" />
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleSave} loading={mutation.isPending}>
            <Save className="h-4 w-4" />
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminGradeSupportContactsPage(): ReactNode {
  const { data: grades, isLoading, isError, refetch } = useGradeSupportContacts();
  const [editing, setEditing] = useState<GradeSupportContact | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <Smartphone className="h-6 w-6 text-primary-500" />
          بيانات الدعم الفني
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          إدارة أرقام الهاتف، البريد الإلكتروني، وواتساب الخاصة بالدعم الفني لكل صف دراسي.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="تعذّر تحميل بيانات الصفوف" onRetry={() => { void refetch(); }} />
      ) : !grades || grades.length === 0 ? (
        <EmptyState
          icon={<Smartphone className="h-8 w-8" />}
          title="لا توجد صفوف"
          description="لم يتم العثور على صفوف دراسية."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-6 py-3 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                <span>الصف</span>
                <span>الهاتف</span>
                <span>البريد الإلكتروني</span>
                <span>واتساب</span>
                <span />
              </div>
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-6 py-3 text-sm items-center"
                >
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {grade.name}
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400" dir="ltr">
                    {grade.supportPhone ?? <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400" dir="ltr">
                    {grade.supportEmail ?? <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400" dir="ltr">
                    {grade.supportWhatsapp ?? <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                  </span>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(): void => { setEditing(grade); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <EditModal
          grade={editing}
          onClose={(): void => { setEditing(null); }}
        />
      )}
    </div>
  );
}

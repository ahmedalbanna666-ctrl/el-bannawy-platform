"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContextStore } from "@/lib/academic-context-store";
import { useGradeSupportContacts, useUpdateGradeSupportContact, type UpdateGradeSupportContactDto } from "@/lib/support/grade-support-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { usePermissions } from "@/lib/use-permissions";
import { Globe, Plus, Pencil, Trash2, Link, Smartphone, Mail, MessageCircle, Phone, Save, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Tab 1: روابط التواصل الاجتماعي
// ---------------------------------------------------------------------------

interface SocialLinkItem {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

const PLATFORM_OPTIONS = [
  { value: "facebook", label: "فيسبوك" },
  { value: "twitter", label: "تويتر" },
  { value: "instagram", label: "إنستغرام" },
  { value: "youtube", label: "يوتيوب" },
  { value: "tiktok", label: "تيك توك" },
  { value: "telegram", label: "تيليجرام" },
  { value: "whatsapp", label: "واتساب" },
  { value: "linkedin", label: "لينكد إن" },
  { value: "website", label: "موقع إلكتروني" },
  { value: "other", label: "أخرى" },
] as const;

const PHONE_PLATFORMS = new Set(["whatsapp", "telegram"]);

function isPhonePlatform(platform: string): boolean {
  return PHONE_PLATFORMS.has(platform);
}

function extractNumberFromLink(storedUrl: string | undefined, platform: string): string {
  if (!storedUrl) return "";
  if (platform === "whatsapp") {
    const m = /wa\.me\/(\d+)/.exec(storedUrl);
    return m ? m[1] : storedUrl;
  }
  if (platform === "telegram") {
    const m = /t\.me\/\+?(\d+)/.exec(storedUrl);
    return m ? m[1] : storedUrl;
  }
  return storedUrl;
}

function buildLink(platform: string, value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (platform === "whatsapp") {
    return `https://wa.me/${digits.replace(/^\+/, "")}`;
  }
  if (platform === "telegram") {
    return digits.startsWith("+") ? `https://t.me/${digits}` : `https://t.me/+${digits}`;
  }
  return value.trim();
}

function LinkFormDialog({
  open,
  onClose,
  link,
}: {
  open: boolean;
  onClose: () => void;
  link?: SocialLinkItem | null;
}): ReactNode {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState(link?.platform ?? "");
  const [label, setLabel] = useState(link?.label ?? "");
  const [url, setUrl] = useState(link ? extractNumberFromLink(link.url, link.platform) : "");
  const [displayOrder, setDisplayOrder] = useState(String(link?.displayOrder ?? "0"));
  const [isActive, setIsActive] = useState(link?.isActive ?? true);
  const isEdit = !!link;
  const phonePlatform = isPhonePlatform(platform);
  const finalUrl = phonePlatform ? buildLink(platform, url) : url.trim();
  const hasValidValue = phonePlatform ? /[0-9]/.test(url) : url.trim().length > 0;

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post("/social-links", { platform, label, url: finalUrl, displayOrder: Number(displayOrder), isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["social-links"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!link) throw new Error("Link not found");
      return api.patch(`/social-links/${link.id}`, { platform, label, url: finalUrl, displayOrder: Number(displayOrder), isActive });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["social-links"] });
      onClose();
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (): void => {
    if (!platform.trim() || !label.trim() || !hasValidValue) return;
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  const handlePlatformChange = (value: string): void => {
    setPlatform(value);
    if (isPhonePlatform(value)) {
      setUrl(link ? extractNumberFromLink(link.url, value) : "");
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold">{isEdit ? "تعديل الرابط" : "إضافة رابط جديد"}</h2>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">المنصة</label>
            <select
              value={platform}
              onChange={(e): void => { handlePlatformChange(e.target.value); }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">اختر المنصة...</option>
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Input label="الاسم المعروض" value={label} onChange={(e) => { setLabel(e.target.value); }} required />
          {phonePlatform ? (
            <div className="flex flex-col gap-1">
              <Input
                label={platform === "whatsapp" ? "رقم واتساب" : "رقم تيليجرام"}
                value={url}
                onChange={(e) => { setUrl(e.target.value); }}
                placeholder="+201012345678"
                dir="ltr"
                type="tel"
                required
              />
              <p className="text-xs text-neutral-400">
                أدخل الرقم بالصيغة الدولية بدون مسافات — اللينك هيتعمل تلقائياً
              </p>
            </div>
          ) : (
            <Input label="الرابط" value={url} onChange={(e) => { setUrl(e.target.value); }} placeholder="https://" dir="ltr" required />
          )}
          <Input label="ترتيب العرض" type="number" value={displayOrder} onChange={(e) => { setDisplayOrder(e.target.value); }} />
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={isActive} onChange={(e) => { setIsActive(e.target.checked); }} className="h-4 w-4 accent-primary-500" />
            نشط
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" loading={pending} disabled={!platform.trim() || !label.trim() || !hasValidValue} onClick={handleSubmit}>
            {isEdit ? "حفظ التغييرات" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SocialLinksTab(): ReactNode {
  const { can } = usePermissions();
  const canManage = can("settings.manage");
  const { data: links, isLoading, isError, refetch } = useQuery({
    queryKey: ["social-links"],
    queryFn: async () => {
      const res = await api.get<SocialLinkItem[]>("/social-links");
      return res.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/social-links/${id}`),
    onSuccess: () => { void refetch(); },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SocialLinkItem | null>(null);

  const handleDelete = (id: string): void => {
    if (!confirm("هل أنت متأكد من حذف هذا الرابط؟")) return;
    deleteMutation.mutate(id);
  };

  const platformLabel = (value: string): string => PLATFORM_OPTIONS.find((p) => p.value === value)?.label ?? value;

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <Globe className="h-6 w-6 text-primary-500" />
            روابط التواصل الاجتماعي
          </h1>
          <p className="mt-1 text-sm text-neutral-500">إدارة روابط فيسبوك، تويتر، إنستغرام، يوتيوب، واتساب وغيرها</p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            إضافة رابط
          </Button>
        )}
      </div>

      {isError && <ErrorState title="فشل تحميل الروابط" onRetry={() => { void refetch(); }} />}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : links && links.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Card key={link.id} variant={link.isActive ? "elevated" : "outline"} padding="md">
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Link className="h-5 w-5 text-primary-500" />
                      <div>
                        <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{link.label}</h3>
                        <span className="text-xs text-neutral-400">{platformLabel(link.platform)}</span>
                      </div>
                    </div>
                    <Badge variant={link.isActive ? "success" : "secondary"}>{link.isActive ? "نشط" : "معطل"}</Badge>
                  </div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="truncate text-xs text-primary-500 hover:underline" dir="ltr">
                    {link.url}
                  </a>
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>ترتيب: {link.displayOrder}</span>
                  </div>
                  {canManage && (
                    <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <Button variant="outline" size="xs" onClick={() => { setEditTarget(link); setDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                        تعديل
                      </Button>
                      <Button variant="danger" size="xs" loading={deleteMutation.isPending} onClick={() => { handleDelete(link.id); }}>
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
        <EmptyState icon={<Globe className="h-16 w-16" />} title="لا توجد روابط" description="لم يتم إضافة أي روابط تواصل اجتماعي بعد" />
      )}

      {dialogOpen && (
        <LinkFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditTarget(null); }} link={editTarget} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: بيانات الدعم الفني
// ---------------------------------------------------------------------------

function SupportContactsTab(): ReactNode {
  const gradeId = useAcademicContextStore((s) => s.gradeId);
  const gradeName = useAcademicContextStore((s) => s.grade);
  const { data: grades, isLoading, isError, refetch } = useGradeSupportContacts(gradeId ?? undefined);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [success, setSuccess] = useState(false);
  const mutation = useUpdateGradeSupportContact();

  const currentGrade = grades?.[0] ?? null;

  useEffect(() => {
    if (currentGrade) {
      setPhone(currentGrade.supportPhone ?? "");
      setEmail(currentGrade.supportEmail ?? "");
      setWhatsapp(currentGrade.supportWhatsapp ?? "");
      setSuccess(false);
    }
  }, [currentGrade]);

  const handleSave = (): void => {
    if (!gradeId) return;
    const data: UpdateGradeSupportContactDto = {};
    if (phone.trim()) data.supportPhone = phone.trim();
    else data.supportPhone = null;
    if (email.trim()) data.supportEmail = email.trim();
    else data.supportEmail = null;
    if (whatsapp.trim()) data.supportWhatsapp = whatsapp.trim();
    else data.supportWhatsapp = null;

    mutation.mutate(
      { gradeId, data },
      { onSuccess: () => { setSuccess(true); void refetch(); } },
    );
  };

  if (!gradeId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <Smartphone className="h-6 w-6 text-primary-500" />
          بيانات الدعم الفني
        </h1>
        <EmptyState icon={<Smartphone className="h-8 w-8" />} title="لم يتم تحديد صف" description="اختر صفاً من شريط السياقات الأكاديمية أعلاه." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          <Smartphone className="h-6 w-6 text-primary-500" />
          بيانات الدعم الفني
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          بيانات التواصل للصف: <span className="font-bold">{gradeName ?? gradeId}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          تعذّر تحميل البيانات
        </div>
      ) : (
        <Card variant="elevated" padding="lg">
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  <Phone className="inline h-3.5 w-3.5 ml-1" />
                  رقم الهاتف
                </label>
                <Input value={phone} onChange={(e): void => { setPhone(e.target.value); setSuccess(false); }}
                  placeholder="مثال: +201000000000" dir="ltr" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  <Mail className="inline h-3.5 w-3.5 ml-1" />
                  البريد الإلكتروني
                </label>
                <Input value={email} onChange={(e): void => { setEmail(e.target.value); setSuccess(false); }}
                  placeholder="مثال: support@el-bannawy.com" dir="ltr" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  <MessageCircle className="inline h-3.5 w-3.5 ml-1" />
                  رقم واتساب
                </label>
                <Input value={whatsapp} onChange={(e): void => { setWhatsapp(e.target.value); setSuccess(false); }}
                  placeholder="مثال: 201000000000" dir="ltr" />
              </div>

              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400">
                  <CheckCircle2 className="h-5 w-5" /> تم الحفظ بنجاح
                </div>
              )}

              <Button variant="primary" fullWidth onClick={handleSave} loading={mutation.isPending}>
                <Save className="h-4 w-4" /> حفظ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page: التواصل والدعم
// ---------------------------------------------------------------------------

const TABS = [
  { id: "social", label: "روابط التواصل" },
  { id: "support", label: "بيانات الدعم" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminCommunicationPage(): ReactNode {
  const { can } = usePermissions();
  const canManage = can("settings.manage");
  const [activeTab, setActiveTab] = useState<TabId>("social");

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">التواصل والدعم</h1>
          <p className="text-sm text-neutral-500">إدارة روابط التواصل الاجتماعي وبيانات الدعم الفني</p>
        </div>
        <ErrorState
          title="لا تملك صلاحية الوصول"
          description="فقط المديرون يمكنهم إدارة روابط التواصل وبيانات الدعم. تواصل مع مسؤول النظام للحصول على الصلاحية."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">التواصل والدعم</h1>
        <p className="text-sm text-neutral-500">إدارة روابط التواصل الاجتماعي وبيانات الدعم الفني</p>
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

      {activeTab === "social" ? <SocialLinksTab /> : <SupportContactsTab />}
    </div>
  );
}

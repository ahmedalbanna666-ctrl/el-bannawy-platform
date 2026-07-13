"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { normalizeEgyptMobile } from "@/lib/phone";
import {
  SYSTEM_OPTIONS,
} from "@/lib/education-options";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  User,
  Phone,
  GraduationCap,
  Lock,
  Crown,
  LogOut,
  Pencil,
  Check,
  X,
  Calendar,
  MapPin,
  School,
  BookOpen,
  Layers,
  Globe,
  Shield,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  fullName: string;
  englishName: string | null;
  mobileNumber: string;
  parentMobile: string | null;
  role: string;
  status: string;
  educationalSystem: string | null;
  governorate: string | null;
  school: string | null;
  gradeId: string | null;
  academicYearId: string | null;
  termId: string | null;
  assignedGrade: { id: string; name: string; stage: { name: string } } | null;
  academicYear: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ── Query Hooks ──────────────────────────────────────────────────────

function useProfile(userId: string | undefined): UseQueryResult<ProfileData> {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await api.get<ProfileData>("/profile");
      if (!res.data) throw new Error("Profile not found");
      return res.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ── Inline Edit Field ────────────────────────────────────────────────

interface EditableFieldProps {
  label: string;
  value: string;
  fieldKey: string;
  icon: ReactNode;
  onSave: (key: string, value: string) => Promise<void>;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  renderEditor?: (draft: string, setDraft: (value: string) => void, disabled: boolean) => ReactNode;
  normalizeOnSave?: (value: string) => string;
}

function EditableField({
  label,
  value,
  fieldKey,
  icon,
  onSave,
  type = "text",
  placeholder,
  readOnly = false,
  renderEditor,
  normalizeOnSave,
}: EditableFieldProps): ReactNode {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft(value);
  }, [value]);

  const handleSave = useCallback(async (): Promise<void> => {
    const finalValue = normalizeOnSave ? normalizeOnSave(draft) : draft;
    if (finalValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(fieldKey, finalValue);
      setEditing(false);
    } catch {
      // keep editing on error
    } finally {
      setSaving(false);
    }
  }, [draft, value, fieldKey, onSave, normalizeOnSave]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 p-3 transition-colors hover:border-white/20">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-slate-400">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{label}</p>
          {editing ? (
            renderEditor ? (
              <div className="mt-1">
                {renderEditor(draft, setDraft, saving)}
              </div>
            ) : (
              <Input
                type={type}
                value={draft}
                onChange={(e): void => { setDraft(e.target.value); }}
                placeholder={placeholder}
                className="mt-1"
                disabled={saving}
              />
            )
          ) : (
            <p className="truncate text-sm font-medium text-slate-200">
              {value || <span className="text-slate-600">غير محدد</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!readOnly && (
          editing ? (
            <>
              <button
                onClick={(): void => { void handleSave(); }}
                disabled={saving}
                className="rounded-lg p-1.5 text-success-500 hover:bg-success-500/10 transition-colors"
                aria-label="حفظ"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10 transition-colors"
                aria-label="إلغاء"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-500/10 hover:text-[#22D3EE] transition-colors"
              aria-label={`تعديل ${label}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function ProfilePage(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();
  const { setUser } = useAuthStore();
  const { logout } = useAuth();

  const { data: profile, isLoading, isError, error } = useProfile(authUser?.id);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await api.patch<ProfileData>("/profile", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      if (data) {
        queryClient.setQueryData(["profile", data.id], data);
        await queryClient.invalidateQueries({ queryKey: ["sidebar-profile", data.id] });
        setUser({
          id: data.id,
          fullName: data.fullName,
          mobileNumber: data.mobileNumber,
          role: data.role,
          status: data.status,
        });
      }
    },
  });

  const handleFieldSave = useCallback(
    async (key: string, value: string) => {
      await updateMutation.mutateAsync({ [key]: value });
    },
    [updateMutation],
  );

  if (isLoading) return <ProfileSkeleton />;
  if (isError) {
    return (
      <ErrorState
        title="فشل تحميل الملف الشخصي"
        description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
      />
    );
  }

  const p = profile ?? {
    id: authUser?.id ?? "",
    fullName: authUser?.fullName ?? "",
    englishName: null,
    mobileNumber: authUser?.mobileNumber ?? "",
    parentMobile: null,
    role: authUser?.role ?? "STUDENT",
    status: authUser?.status ?? "ACTIVE",
    educationalSystem: null,
    governorate: null,
    school: null,
    gradeId: null,
    academicYearId: null,
    termId: null,
    assignedGrade: null,
    academicYear: null,
    term: null,
    createdAt: "",
    updatedAt: "",
  };

  const firstName = p.fullName ? p.fullName.split(" ")[0] : "";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || "User")}&background=22D3EE&color=fff&bold=true&font-size=0.33&size=128`;

  const statusLabel = p.status === "ACTIVE" ? "نشط" : p.status === "PENDING_VERIFICATION" ? "قيد التحقق" : p.status;
  const formattedDate = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Personal Information */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">المعلومات الشخصية</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <img
              src={avatarUrl}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full border-2 border-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.25)] object-cover"
            />
            <div className="flex flex-1 flex-col gap-3 text-center sm:text-start">
              <div>
                <p className="text-lg font-extrabold text-slate-50">{p.fullName}</p>
                <p className="text-sm capitalize text-slate-400">
                  {p.role === "STUDENT" ? "طالب" : p.role}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <EditableField
                  label="الاسم بالعربية"
                  value={p.fullName}
                  fieldKey="fullName"
                  icon={<User className="h-4 w-4" />}
                  onSave={handleFieldSave}
                  placeholder="الاسم الكامل"
                />
                <EditableField
                  label="الاسم بالإنجليزية"
                  value={p.englishName ?? ""}
                  fieldKey="englishName"
                  icon={<Globe className="h-4 w-4" />}
                  onSave={handleFieldSave}
                  placeholder="English Full Name"
                />
                <span className="flex items-center gap-2 px-1 text-sm text-slate-400">
                  <Phone className="h-4 w-4 text-slate-500" />
                  {p.mobileNumber}
                </span>
                <EditableField
                  label="رقم ولي الأمر"
                  value={p.parentMobile ?? ""}
                  fieldKey="parentMobile"
                  icon={<Phone className="h-4 w-4" />}
                  onSave={handleFieldSave}
                  type="tel"
                  placeholder="01234567890"
                  normalizeOnSave={normalizeEgyptMobile}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Information */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">المعلومات التعليمية</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <EditableField
              label="النظام التعليمي"
              value={p.educationalSystem ?? ""}
              fieldKey="educationalSystem"
              icon={<Layers className="h-4 w-4" />}
              onSave={handleFieldSave}
              renderEditor={(draft, setDraft, disabled): ReactNode => (
                <Select
                  label=""
                  value={draft}
                  onChange={(e): void => { setDraft(e.target.value); }}
                  options={SYSTEM_OPTIONS}
                  placeholder="اختر النظام التعليمي"
                  disabled={disabled}
                />
              )}
            />
            <EditableField
              label="المرحلة التعليمية"
              value={p.assignedGrade?.stage.name ?? ""}
              fieldKey="educationalStage"
              icon={<GraduationCap className="h-4 w-4" />}
              onSave={handleFieldSave}
              readOnly
            />
            <EditableField
              label="الصف الدراسي"
              value={p.assignedGrade?.name ?? ""}
              fieldKey="grade"
              icon={<BookOpen className="h-4 w-4" />}
              onSave={handleFieldSave}
              readOnly
            />
            <EditableField
              label="السنة الدراسية"
              value={p.academicYear?.name ?? ""}
              fieldKey="academicYearId"
              icon={<Calendar className="h-4 w-4" />}
              onSave={handleFieldSave}
              readOnly
            />
            <EditableField
              label="الفصل الدراسي"
              value={p.term?.name ?? ""}
              fieldKey="termId"
              icon={<Calendar className="h-4 w-4" />}
              onSave={handleFieldSave}
              readOnly
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">الموقع</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <EditableField
              label="المحافظة"
              value={p.governorate ?? ""}
              fieldKey="governorate"
              icon={<MapPin className="h-4 w-4" />}
              onSave={handleFieldSave}
              renderEditor={(draft, setDraft, disabled): ReactNode => (
                <GovernorateSelect
                  value={draft}
                  onChange={setDraft}
                  label=""
                  disabled={disabled}
                />
              )}
            />
            <EditableField
              label="المدرسة"
              value={p.school ?? ""}
              fieldKey="school"
              icon={<School className="h-4 w-4" />}
              onSave={handleFieldSave}
              placeholder="اسم المدرسة"
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">معلومات الحساب</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span className="text-sm text-slate-400">حالة الحساب</span>
              <span className={`text-sm font-extrabold ${p.status === "ACTIVE" ? "text-[#10B981]" : "text-warning-500"}`}>
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span className="text-sm text-slate-400">تاريخ التسجيل</span>
              <span className="text-sm font-medium text-slate-300">{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span className="text-sm text-slate-400">نوع الحساب</span>
              <span className="text-sm font-extrabold text-[#22D3EE]">مجاني</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#22D3EE]" />
            <h2 className="text-base font-extrabold text-slate-100">الأمان</h2>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="md"
            fullWidth
            className="justify-start gap-3"
            onClick={(): void => { router.push("/reset-password"); }}
          >
            <Lock className="h-4 w-4" />
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-400" />
            <h2 className="text-base font-extrabold text-slate-100">الاشتراك</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span className="text-sm text-slate-400">الخطة الحالية</span>
              <span className="text-sm font-extrabold text-[#22D3EE]">مجاني</span>
            </div>
            <Button variant="primary" size="sm" fullWidth className="mt-1">
              <Crown className="h-4 w-4" />
              تجديد الاشتراك
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card variant="glass" padding="lg">
        <CardContent>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => {
              void logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton(): ReactNode {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { ROLE_LABELS } from "@el-bannawy/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { SYSTEM_OPTIONS } from "@/lib/education-options";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { RoleProfileSection } from "./components/role-profile-section";
import type { UserProfileResponse } from "./types";
import {
  User,
  Phone,
  Mail,
  Lock,
  Crown,
  LogOut,
  Pencil,
  Check,
  X,
  MapPin,
  School,
  Layers,
  Shield,
  BadgeCheck,
  CalendarDays,
} from "lucide-react";

// ── Query Hook ──────────────────────────────────────────────────────

function useProfile(userId: string | undefined): UseQueryResult<UserProfileResponse> {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await api.get<UserProfileResponse>("/profile");
      if (!res.data) throw new Error("Profile not found");
      return res.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ── Shared Layout Primitives ────────────────────────────────────────

function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}): ReactNode {
  return (
    <Card variant="glass" padding="lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
              {icon}
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">{title}</h2>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function FieldRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {value || <span className="font-normal text-neutral-400 dark:text-neutral-500">غير محدد</span>}
        </p>
      </div>
    </div>
  );
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 transition-colors hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
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
            <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {value || <span className="font-normal text-neutral-400 dark:text-neutral-500">غير محدد</span>}
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
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-500/10 transition-colors dark:text-neutral-500"
                aria-label="إلغاء"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-500/10 hover:text-primary-500 transition-colors dark:text-neutral-500 dark:hover:text-primary-400"
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
  const { user: authUser, setUser } = useAuthStore();
  const { logout } = useAuth();

  const { data: profile, isLoading, isError, error, refetch } = useProfile(authUser?.id);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await api.patch<UserProfileResponse>("/profile", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      if (data) {
        queryClient.setQueryData(["profile", data.id], data);
        await queryClient.invalidateQueries({ queryKey: ["profile", data.id] });
        setUser({
          id: data.id,
          fullName: data.fullName,
          mobileNumber: data.mobileNumber,
          role: data.role,
          status: data.status,
          gradeId: data.gradeId,
          educationalSystem: data.educationalSystem,
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
        onRetry={() => { void refetch(); }}
        retryLabel="إعادة المحاولة"
      />
    );
  }

  if (!profile) return <ProfileSkeleton />;
  const p = profile;

  const firstName = p.fullName ? p.fullName.split(" ")[0] : "";
  const avatarUrl = p.avatarUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || "User")}&background=06B6D4&color=fff&bold=true&font-size=0.33&size=128`;

  const statusLabel = p.status === "ACTIVE" ? "نشط" : p.status === "PENDING_VERIFICATION" ? "قيد التحقق" : p.status;
  const formattedDate = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50">الملف الشخصي</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          إدارة بياناتك الشخصية ومعلومات حسابك
        </p>
      </div>

      {/* Personal Information */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-2xl border-2 border-primary-500/40 bg-neutral-100 object-cover shadow-[0_0_24px_rgba(6,182,212,0.25)] dark:bg-neutral-800"
                />
                {p.status === "ACTIVE" && (
                  <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-success-500 text-white shadow-sm">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-start">
                <p className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50">{p.fullName}</p>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {ROLE_LABELS[p.role] ?? p.role}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === "ACTIVE"
                      ? "bg-success-500/10 text-success-600 dark:text-success-400"
                      : "bg-warning-500/10 text-warning-600 dark:text-warning-400"
                  }`}
                >
                  {p.status === "ACTIVE" ? <BadgeCheck className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="h-px bg-neutral-200/70 dark:bg-white/10" />
            <div className="flex flex-col gap-2">
              <EditableField
                label="الاسم بالعربية"
                value={p.fullName}
                fieldKey="fullName"
                icon={<User className="h-4 w-4" />}
                onSave={handleFieldSave}
                placeholder="الاسم الكامل"
              />
              <FieldRow
                label="البريد الإلكتروني"
                value={p.email ?? ""}
                icon={<Mail className="h-4 w-4" />}
              />
              <FieldRow
                label="رقم الهاتف"
                value={p.mobileNumber ?? ""}
                icon={<Phone className="h-4 w-4" />}
              />
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
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Role-Specific Profile Section */}
      <RoleProfileSection profile={profile} onSave={handleFieldSave} />

      {/* Location */}
      <SectionCard
        icon={<MapPin className="h-5 w-5 text-primary-500 dark:text-primary-400" />}
        title="الموقع"
      >
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
      </SectionCard>

      {/* Account Information */}
      <SectionCard
        icon={<Shield className="h-5 w-5 text-primary-500 dark:text-primary-400" />}
        title="معلومات الحساب"
      >
        <FieldRow
          label="حالة الحساب"
          value={statusLabel}
          icon={<BadgeCheck className="h-4 w-4" />}
        />
        <FieldRow
          label="تاريخ التسجيل"
          value={formattedDate}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <FieldRow
          label="نوع الحساب"
          value="مجاني"
          icon={<Crown className="h-4 w-4" />}
        />
      </SectionCard>

      {/* Security */}
      <SectionCard
        icon={<Lock className="h-5 w-5 text-primary-500 dark:text-primary-400" />}
        title="الأمان"
      >
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
      </SectionCard>

      {/* Subscription */}
      <SectionCard
        icon={<Crown className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />}
        title="الاشتراك"
      >
        <FieldRow
          label="الخطة الحالية"
          value="مجاني"
          icon={<Crown className="h-4 w-4" />}
        />
        <Button variant="primary" size="sm" fullWidth>
          <Crown className="h-4 w-4" />
          تجديد الاشتراك
        </Button>
      </SectionCard>

      {/* Logout */}
      <Card variant="glass" padding="lg">
        <CardContent>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={(): void => {
              void (async (): Promise<void> => {
                await logout();
                router.push("/login");
              })();
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
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

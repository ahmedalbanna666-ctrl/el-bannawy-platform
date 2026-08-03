"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, BookOpen, Calendar, Pencil, Check, X, AlertCircle, RefreshCw } from "lucide-react";
import type { StudentProfileResponse } from "../types";

interface Props {
  profile: StudentProfileResponse["roleProfile"];
  onSave: (key: string, value: string) => Promise<void>;
}

interface AcademicOption {
  stages: { id: string; name: string; grades: { id: string; name: string }[] }[];
  terms: { id: string; name: string }[];
}

export function StudentProfileSection({ profile, onSave }: Props): ReactNode {
  const [editing, setEditing] = useState(false);
  const [gradeId, setGradeId] = useState(profile.grade?.id ?? "");
  const [saving, setSaving] = useState(false);

  const { data: options, isLoading: optionsLoading, isError: optionsError, refetch: refetchOptions } = useQuery({
    queryKey: ["academic-options"],
    queryFn: async () => {
      const res = await api.get<AcademicOption>("/academic-context/options");
      if (!res.data) throw new Error("Failed to load academic options");
      return res.data;
    },
    staleTime: 300_000,
    retry: 2,
  });

  const stageName = profile.stage?.name ?? null;
  const selectedStage = options?.stages.find((s) =>
    s.grades.some((g) => g.id === gradeId),
  ) ?? null;

  const handleSave = useCallback(async (): Promise<void> => {
    setSaving(true);
    try {
      if (gradeId !== (profile.grade?.id ?? "")) {
        await onSave("gradeId", gradeId);
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [gradeId, profile.grade?.id, onSave]);

  const gradeOptions = (options?.stages ?? []).flatMap((s) =>
    s.grades.map((g) => ({ value: g.id, label: `${s.name} — ${g.name}` })),
  );

  return (
    <Card variant="glass" padding="lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
              <GraduationCap className="h-5 w-5 text-primary-500 dark:text-primary-400" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">المعلومات الدراسية</h2>
          </div>
          {!editing && (
            <button
              onClick={(): void => {
                setGradeId(profile.grade?.id ?? "");
                setEditing(true);
              }}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-500/10 hover:text-primary-500 transition-colors dark:text-neutral-500 dark:hover:text-primary-400"
              aria-label="تعديل المعلومات الدراسية"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex flex-col gap-3">
            {optionsLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : optionsError ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-danger-500/20 bg-danger-500/10 p-4 text-center">
                <AlertCircle className="h-6 w-6 text-danger-500" />
                <p className="text-sm text-danger-600 dark:text-danger-400">فشل تحميل قائمة الصفوف الدراسية</p>
                <Button size="sm" variant="outline" onClick={() => { void refetchOptions(); }}>
                  <RefreshCw className="ml-1 h-3 w-3" />
                  إعادة المحاولة
                </Button>
              </div>
            ) : (
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">الصف الدراسي</p>
                <Select
                  value={gradeId}
                  onChange={(e): void => { setGradeId(e.target.value); }}
                  options={gradeOptions}
                  placeholder={gradeOptions.length === 0 ? "لا توجد صفوف متاحة" : "اختر الصف الدراسي"}
                  disabled={saving}
                />
                {selectedStage && (
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-500">
                    المرحلة: {selectedStage.name}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(): void => { setEditing(false); }}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                إلغاء
              </Button>
              <Button variant="primary" size="sm" onClick={(): void => { void handleSave(); }} loading={saving}>
                <Check className="h-4 w-4" />
                حفظ
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ProfileField
              icon={<GraduationCap className="h-4 w-4" />}
              label="المرحلة الدراسية"
              value={stageName}
            />
            <ProfileField
              icon={<BookOpen className="h-4 w-4" />}
              label="الصف الدراسي"
              value={profile.grade?.name ?? null}
            />
            <ProfileField
              icon={<Calendar className="h-4 w-4" />}
              label="الفصل الدراسي الحالي"
              value={profile.currentTerm?.name ?? null}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
}): ReactNode {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {value ?? <span className="font-normal text-neutral-400 dark:text-neutral-500">غير محدد</span>}
        </p>
      </div>
    </div>
  );
}

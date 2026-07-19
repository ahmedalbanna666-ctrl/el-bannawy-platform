"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GraduationCap, BookOpen, Calendar, Pencil, Check, X } from "lucide-react";
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

  const { data: options } = useQuery({
    queryKey: ["academic-options"],
    queryFn: async () => {
      const res = await api.get<AcademicOption>("/academic-context/options");
      return res.data ?? { stages: [], terms: [] };
    },
    staleTime: 300_000,
  });

  const stageName = profile.stage?.name ?? null;
  const selectedStage = options?.stages.find((s) =>
    s.grades.some((g) => g.id === gradeId),
  );

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
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary-400" />
            <h2 className="text-base font-extrabold text-neutral-100">المعلومات الدراسية</h2>
          </div>
          {!editing && (
            <button
              onClick={(): void => {
                setGradeId(profile.grade?.id ?? "");
                setEditing(true);
              }}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-500/10 hover:text-primary-400 transition-colors"
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
            <div>
              <p className="mb-1 text-xs text-neutral-500">الصف الدراسي</p>
              <Select
                value={gradeId}
                onChange={(e): void => { setGradeId(e.target.value); }}
                options={gradeOptions}
                placeholder="اختر الصف الدراسي"
                disabled={saving}
              />
              {selectedStage && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  المرحلة: {selectedStage.name}
                </p>
              )}
            </div>
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
              icon={<GraduationCap className="h-4 w-4 text-neutral-400" />}
              label="المرحلة الدراسية"
              value={stageName}
            />
            <ProfileField
              icon={<BookOpen className="h-4 w-4 text-neutral-400" />}
              label="الصف الدراسي"
              value={profile.grade?.name ?? null}
            />
            <ProfileField
              icon={<Calendar className="h-4 w-4 text-neutral-400" />}
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
    <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
      <span className="shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-medium text-neutral-200">
          {value ?? <span className="text-neutral-600">غير محدد</span>}
        </p>
      </div>
    </div>
  );
}

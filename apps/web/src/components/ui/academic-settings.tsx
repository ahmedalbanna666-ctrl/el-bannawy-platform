"use client";

import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContextStore } from "@/lib/academic-context-store";
import { TERM_OPTIONS, SYSTEM_OPTIONS, STAGE_OPTIONS, getGradeOptions, stageLabelToKey } from "@/lib/education-options";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveContext {
  academicYear: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
}

interface MyGradesResponse {
  gradeIds: string[];
  grades: Array<{ id: string; name: string; stage: { id: string; name: string }; _count?: { users: number } }>;
}

export function AcademicSettings(): ReactNode {
  const userRole = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const isTeacher = userRole === "TEACHER" || userRole === "STAFF";

  const educationalSystem = useAcademicContextStore((s) => s.educationalSystem);
  const stage = useAcademicContextStore((s) => s.stage);
  const grade = useAcademicContextStore((s) => s.grade);
  const term = useAcademicContextStore((s) => s.term);
  const setEducationalSystem = useAcademicContextStore((s) => s.setEducationalSystem);
  const setStage = useAcademicContextStore((s) => s.setStage);
  const setGrade = useAcademicContextStore((s) => s.setGrade);
  const setTerm = useAcademicContextStore((s) => s.setTerm);

  const { data: activeCtx } = useQuery({
    queryKey: ["active-academic-context"],
    queryFn: async () => {
      const res = await api.get<ActiveContext>("/admin/academic-context");
      return res.data ?? null;
    },
    staleTime: 120_000,
  });

  const { data: myGrades, isLoading: gradesLoading } = useQuery({
    queryKey: ["my-grades", userId],
    queryFn: async () => {
      const res = await api.get<MyGradesResponse>("/teachers/my-grades");
      return res.data ?? null;
    },
    enabled: isTeacher && !!userId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!myGrades || !isTeacher) return;
    const gs = myGrades.grades;
    if (gs.length === 1) {
      const g = gs[0];
      const stageKey = stageLabelToKey(g.stage.name) ?? g.stage.name;
      setEducationalSystem("");
      setStage(stageKey);
      setGrade(g.name);
    } else if (gs.length > 1) {
      const storedGrade = useAcademicContextStore.getState().grade;
      if (!storedGrade || !gs.some((g) => g.name === storedGrade)) {
        const stageKey = stageLabelToKey(gs[0].stage.name) ?? gs[0].stage.name;
        setGrade(gs[0].name);
        setStage(stageKey);
      }
    }
  }, [myGrades, isTeacher, setEducationalSystem, setStage, setGrade]);

  const assignedGradeNames = new Set(myGrades?.grades.map((g) => g.name) ?? []);

  const filteredStageOptions = STAGE_OPTIONS.filter(
    (s) => myGrades?.grades.some((g) => g.stage.name === s.value),
  );

  const gradeOptions = stage ? getGradeOptions(stage) : [];
  const filteredGradeOptions = gradeOptions.filter(
    (g) => assignedGradeNames.has(g.value),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-500">
          الإعدادات الأكاديمية
        </span>
        <div className="h-px bg-white/5 light:bg-slate-200" />
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 light:text-slate-500">السنة الدراسية</span>
          <span className="font-semibold text-slate-100 light:text-slate-900">
            {activeCtx?.academicYear?.name ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 light:text-slate-500">الترم الحالي</span>
          <span className="font-semibold text-slate-100 light:text-slate-900">
            {activeCtx?.term?.name ?? "—"}
          </span>
        </div>
      </div>

      <div className="h-px bg-white/5 light:bg-slate-200" />

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-warning-400 light:text-warning-600">
          معاينة المعلم فقط
        </span>

        {gradesLoading ? (
          <Skeleton className="h-8 rounded-lg" />
        ) : isTeacher && myGrades ? (
          <div className="flex flex-col gap-2">
            {myGrades.grades.length === 0 && (
              <p className="text-[10px] text-slate-500">
                لم يتم إسناد أي صفوف دراسية. يرجى التواصل مع الإدارة.
              </p>
            )}

            {myGrades.grades.length > 0 && (
              <>
                <Select
                  size="sm"
                  options={SYSTEM_OPTIONS}
                  placeholder="النظام التعليمي"
                  value={educationalSystem ?? ""}
                  onChange={(e) => { setEducationalSystem(e.target.value); }}
                />

                <Select
                  size="sm"
                  options={filteredStageOptions.length > 0 ? filteredStageOptions : STAGE_OPTIONS}
                  placeholder="المرحلة التعليمية"
                  value={stage ?? ""}
                  onChange={(e) => { setStage(e.target.value); }}
                />

                {myGrades.grades.length <= 1 ? (
                  <Select
                    size="sm"
                    options={filteredGradeOptions.length > 0 ? filteredGradeOptions : gradeOptions}
                    placeholder="الصف الدراسي"
                    value={grade ?? ""}
                    onChange={(e) => { setGrade(e.target.value); }}
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">الصف الدراسي</span>
                    <div className="flex flex-wrap gap-1.5">
                      {myGrades.grades.map((g) => {
                        const isActive = grade === g.name;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              const stageKey = stageLabelToKey(g.stage.name) ?? g.stage.name;
                              setStage(stageKey);
                              setGrade(g.name);
                            }}
                            className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                              isActive
                                ? "border-primary-500 bg-primary-500/15 text-primary-400 font-semibold"
                                : "border-neutral-700 text-slate-400 hover:border-neutral-500 hover:text-slate-200"
                            }`}
                          >
                            {g.name}
                            {g._count?.users !== undefined && (
                              <span className="mr-1 text-[10px] opacity-60">({g._count.users})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Select
                  size="sm"
                  options={TERM_OPTIONS}
                  placeholder="اختر ترم المعاينة"
                  value={term ?? ""}
                  onChange={(e) => { setTerm(e.target.value); }}
                />

                {myGrades.grades.length === 1 && (
                  <span className="text-[10px] text-primary-400">
                    تم تحديد الصف الوحيد المسند تلقائياً
                  </span>
                )}
              </>
            )}

            <span className="text-[10px] leading-relaxed text-slate-500 light:text-slate-400">
              تغيير هذه القيم يؤثر فقط على لوحة التحكم الخاصة بك ولا يغير البيانات الفعلية للطلاب أبداً.
            </span>
          </div>
        ) : (
          <>
            <Select
              size="sm"
              options={TERM_OPTIONS}
              placeholder="اختر ترم المعاينة"
              value={term ?? ""}
              onChange={(e) => { setTerm(e.target.value); }}
            />
            <span className="text-[10px] leading-relaxed text-slate-500 light:text-slate-400">
              تغيير هذه القيمة يؤثر فقط على لوحة التحكم الخاصة بك ولا يغير الترم النشط للطلاب أبداً.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

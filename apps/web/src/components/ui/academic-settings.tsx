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
  termManagementMode: string | null;
}

interface MyGradesResponse {
  gradeIds: string[];
  grades: { id: string; name: string; stage: { id: string; name: string }; _count?: { users: number } }[];
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
  const applyPlatformContext = useAcademicContextStore((s) => s.applyPlatformContext);

  const { data: activeCtx } = useQuery({
    queryKey: ["active-academic-context"],
    queryFn: async () => {
      const res = await api.get<ActiveContext>("/academic-context");
      return res.data ?? null;
    },
    staleTime: 120_000,
  });

  useEffect(() => {
    if (activeCtx?.academicYear && activeCtx.term) {
      applyPlatformContext({
        academicYearId: activeCtx.academicYear.id,
        academicYearName: activeCtx.academicYear.name,
        termId: activeCtx.term.id,
        termName: activeCtx.term.name,
      });
    }
  }, [activeCtx, applyPlatformContext]);

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
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 light:text-neutral-500">
          ╪د┘╪ح╪╣╪»╪د╪»╪د╪ز ╪د┘╪ث┘â╪د╪»┘è┘à┘è╪ر
        </span>
        <div className="h-px bg-white/5 light:bg-neutral-200" />
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400 light:text-neutral-500">╪د┘╪│┘╪ر ╪د┘╪»╪▒╪د╪│┘è╪ر</span>
          <span className="font-semibold text-neutral-100 light:text-neutral-900">
            {activeCtx?.academicYear?.name ?? "ظ¤"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400 light:text-neutral-500">╪د┘╪ز╪▒┘à ╪د┘╪ص╪د┘┘è</span>
          <span className="font-semibold text-neutral-100 light:text-neutral-900">
            {activeCtx?.term?.name ?? "ظ¤"}
          </span>
        </div>
      </div>

      <div className="h-px bg-white/5 light:bg-neutral-200" />

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-warning-400 light:text-warning-600">
          ┘à╪╣╪د┘è┘╪ر ╪د┘┘à╪╣┘┘à ┘┘é╪╖
        </span>

        {gradesLoading ? (
          <Skeleton className="h-8 rounded-lg" />
        ) : isTeacher && myGrades ? (
          <div className="flex flex-col gap-2">
            {myGrades.grades.length === 0 && (
              <p className="text-[10px] text-neutral-500">
                ┘┘à ┘è╪ز┘à ╪ح╪│┘╪د╪» ╪ث┘è ╪╡┘┘ê┘ ╪»╪▒╪د╪│┘è╪ر. ┘è╪▒╪ش┘ë ╪د┘╪ز┘ê╪د╪╡┘ ┘à╪╣ ╪د┘╪ح╪»╪د╪▒╪ر.
              </p>
            )}

            {myGrades.grades.length > 0 && (
              <>
                <Select
                  size="sm"
                  options={SYSTEM_OPTIONS}
                  placeholder="╪د┘┘╪╕╪د┘à ╪د┘╪ز╪╣┘┘è┘à┘è"
                  value={educationalSystem ?? ""}
                  onChange={(e) => { setEducationalSystem(e.target.value); }}
                />

                <Select
                  size="sm"
                  options={filteredStageOptions.length > 0 ? filteredStageOptions : STAGE_OPTIONS}
                  placeholder="╪د┘┘à╪▒╪ص┘╪ر ╪د┘╪ز╪╣┘┘è┘à┘è╪ر"
                  value={stage ?? ""}
                  onChange={(e) => { setStage(e.target.value); }}
                />

                {myGrades.grades.length <= 1 ? (
                  <Select
                    size="sm"
                    options={filteredGradeOptions.length > 0 ? filteredGradeOptions : gradeOptions}
                    placeholder="╪د┘╪╡┘ ╪د┘╪»╪▒╪د╪│┘è"
                    value={grade ?? ""}
                    onChange={(e) => { setGrade(e.target.value); }}
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-400">╪د┘╪╡┘ ╪د┘╪»╪▒╪د╪│┘è</span>
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
                                : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
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
                  placeholder="╪د╪«╪ز╪▒ ╪ز╪▒┘à ╪د┘┘à╪╣╪د┘è┘╪ر"
                  value={term ?? ""}
                  onChange={(e) => { setTerm(e.target.value); }}
                />

                {myGrades.grades.length === 1 && (
                  <span className="text-[10px] text-primary-400">
                    ╪ز┘à ╪ز╪ص╪»┘è╪» ╪د┘╪╡┘ ╪د┘┘ê╪ص┘è╪» ╪د┘┘à╪│┘╪» ╪ز┘┘é╪د╪خ┘è╪د┘ï
                  </span>
                )}
              </>
            )}

            <span className="text-[10px] leading-relaxed text-neutral-500 light:text-neutral-400">
              ╪ز╪║┘è┘è╪▒ ┘ç╪░┘ç ╪د┘┘é┘è┘à ┘è╪ج╪س╪▒ ┘┘é╪╖ ╪╣┘┘ë ┘┘ê╪ص╪ر ╪د┘╪ز╪ص┘â┘à ╪د┘╪«╪د╪╡╪ر ╪ذ┘â ┘ê┘╪د ┘è╪║┘è╪▒ ╪د┘╪ذ┘è╪د┘╪د╪ز ╪د┘┘╪╣┘┘è╪ر ┘┘╪╖┘╪د╪ذ ╪ث╪ذ╪»╪د┘ï.
            </span>
          </div>
        ) : (
          <>
            <Select
              size="sm"
              options={TERM_OPTIONS}
              placeholder="╪د╪«╪ز╪▒ ╪ز╪▒┘à ╪د┘┘à╪╣╪د┘è┘╪ر"
              value={term ?? ""}
              onChange={(e) => { setTerm(e.target.value); }}
            />
            <span className="text-[10px] leading-relaxed text-neutral-500 light:text-neutral-400">
              ╪ز╪║┘è┘è╪▒ ┘ç╪░┘ç ╪د┘┘é┘è┘à╪ر ┘è╪ج╪س╪▒ ┘┘é╪╖ ╪╣┘┘ë ┘┘ê╪ص╪ر ╪د┘╪ز╪ص┘â┘à ╪د┘╪«╪د╪╡╪ر ╪ذ┘â ┘ê┘╪د ┘è╪║┘è╪▒ ╪د┘╪ز╪▒┘à ╪د┘┘╪┤╪╖ ┘┘╪╖┘╪د╪ذ ╪ث╪ذ╪»╪د┘ï.
            </span>
          </>
        )}
      </div>
    </div>
  );
}


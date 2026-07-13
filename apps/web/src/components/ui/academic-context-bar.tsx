"use client";

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Select } from "@/components/ui/select";
import { useAcademicContextStore } from "@/lib/academic-context-store";
import { useAuthStore } from "@/lib/auth-store";
import {
  ACADEMIC_YEAR_OPTIONS,
  STAGE_OPTIONS,
  TERM_OPTIONS,
  SYSTEM_OPTIONS,
  getGradeOptions,
  stageLabelToKey,
} from "@/lib/education-options";
import { cn } from "@/lib/utils";

interface AcademicContextBarProps {
  className?: string;
}

interface MyGradesResponse {
  gradeIds: string[];
  grades: { id: string; name: string; stage: { id: string; name: string } }[];
}

export function AcademicContextBar({ className }: AcademicContextBarProps): ReactNode {
  const academicYear = useAcademicContextStore((s) => s.academicYear);
  const educationalSystem = useAcademicContextStore((s) => s.educationalSystem);
  const stage = useAcademicContextStore((s) => s.stage);
  const grade = useAcademicContextStore((s) => s.grade);
  const term = useAcademicContextStore((s) => s.term);
  const setAcademicYear = useAcademicContextStore((s) => s.setAcademicYear);
  const setEducationalSystem = useAcademicContextStore((s) => s.setEducationalSystem);
  const setStage = useAcademicContextStore((s) => s.setStage);
  const setGrade = useAcademicContextStore((s) => s.setGrade);
  const setTerm = useAcademicContextStore((s) => s.setTerm);

  const userRole = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const isAdmin = userRole === "ADMINISTRATOR";
  const isTeacher = userRole === "TEACHER" || userRole === "STAFF";

  const { data: myGrades } = useQuery({
    queryKey: ["my-grades", userId],
    queryFn: async () => {
      const res = await api.get<MyGradesResponse>("/teachers/my-grades");
      return res.data ?? null;
    },
    enabled: isTeacher && !!userId,
    staleTime: 30_000,
  });

  const assignedGradeNames = new Set(myGrades?.grades.map((g) => g.name) ?? []);

  const gradeOptions = stage ? getGradeOptions(stage) : [];
  const filteredGradeOptions = isTeacher && myGrades
    ? gradeOptions.filter((g) => assignedGradeNames.has(g.value))
    : gradeOptions;

  const stageGradeNames = new Map<string, Set<string>>();
  if (isTeacher && myGrades) {
    for (const g of myGrades.grades) {
      const stageKey = stageLabelToKey(g.stage.name) ?? g.stage.name;
      if (!stageGradeNames.has(stageKey)) {
        stageGradeNames.set(stageKey, new Set());
      }
      stageGradeNames.get(stageKey)?.add(g.name);
    }
  }

  const filteredStageOptions = isTeacher && myGrades
    ? STAGE_OPTIONS.filter((s) => stageGradeNames.has(s.value))
    : STAGE_OPTIONS;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 pb-2",
        isAdmin ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      role="group"
      aria-label="السياق الأكاديمي"
    >
      {isAdmin && (
        <Select
          size="sm"
          options={ACADEMIC_YEAR_OPTIONS}
          placeholder="السنة الدراسية"
          value={academicYear ?? ""}
          onChange={(e): void => { setAcademicYear(e.target.value); }}
          aria-label="السنة الدراسية"
        />
      )}
      <Select
        size="sm"
        options={SYSTEM_OPTIONS}
        placeholder="نظام التعليم"
        value={educationalSystem ?? ""}
        onChange={(e): void => { setEducationalSystem(e.target.value); }}
        aria-label="نظام التعليم"
      />
      <Select
        size="sm"
        options={filteredStageOptions}
        placeholder="المرحلة"
        value={stage ?? ""}
        onChange={(e): void => { setStage(e.target.value); }}
        aria-label="المرحلة"
      />
      <Select
        size="sm"
        options={filteredGradeOptions}
        placeholder="الصف"
        value={grade ?? ""}
        onChange={(e): void => { setGrade(e.target.value); }}
        disabled={!stage}
        aria-label="الصف"
      />
      {isAdmin && (
        <Select
          size="sm"
          options={TERM_OPTIONS}
          placeholder="الترم"
          value={term ?? ""}
          onChange={(e): void => { setTerm(e.target.value); }}
          aria-label="الترم"
        />
      )}
    </div>
  );
}

export type { AcademicContextBarProps };

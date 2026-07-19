import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { getDefaultAcademicYear } from "@/lib/education-options";

export interface AcademicContext {
  readonly academicYear: string | null;
  readonly academicYearId: string | null;
  readonly educationalSystem: string | null;
  readonly stage: string | null;
  readonly grade: string | null;
  readonly gradeId: string | null;
  readonly term: string | null;
  readonly termId: string | null;
}

export interface AcademicContextIds {
  readonly academicYearId: string | null;
  readonly termId: string | null;
  readonly gradeId: string | null;
}

interface AcademicContextState extends AcademicContext {
  setAcademicYear: (academicYear: string) => void;
  setAcademicYearId: (academicYearId: string | null) => void;
  setEducationalSystem: (educationalSystem: string) => void;
  setStage: (stage: string) => void;
  setGrade: (grade: string, gradeId?: string | null) => void;
  setTerm: (term: string) => void;
  setTermId: (termId: string | null) => void;
  applyPlatformContext: (ctx: { academicYearId: string; academicYearName: string; termId: string; termName: string }) => void;
  reset: () => void;
}

export const useAcademicContextStore = create<AcademicContextState>()(
  persist(
    (set) => ({
      academicYear: getDefaultAcademicYear(),
      academicYearId: null,
      educationalSystem: null,
      stage: null,
      grade: null,
      gradeId: null,
      term: null,
      termId: null,
      setAcademicYear: (academicYear: string): void => {
        set({ academicYear });
      },
      setAcademicYearId: (academicYearId: string | null): void => {
        set({ academicYearId });
      },
      setEducationalSystem: (educationalSystem: string): void => {
        set({ educationalSystem });
      },
      setStage: (stage: string): void => {
        set({ stage, grade: null });
      },
      setGrade: (grade: string, gradeId?: string | null): void => {
        set({ grade, gradeId: gradeId ?? null });
      },
      setTerm: (term: string): void => {
        set({ term });
      },
      setTermId: (termId: string | null): void => {
        set({ termId });
      },
      applyPlatformContext: (ctx: { academicYearId: string; academicYearName: string; termId: string; termName: string }): void => {
        set({
          academicYear: ctx.academicYearName,
          academicYearId: ctx.academicYearId,
          term: ctx.termName,
          termId: ctx.termId,
        });
      },
      reset: (): void => {
        set({
          academicYear: getDefaultAcademicYear(),
          academicYearId: null,
          educationalSystem: null,
          stage: null,
          grade: null,
          term: null,
          termId: null,
        });
      },
    }),
    {
      name: "el-bannawy-academic-context",
      partialize: (state) => ({
        academicYear: state.academicYear,
        academicYearId: state.academicYearId,
        educationalSystem: state.educationalSystem,
        stage: state.stage,
        grade: state.grade,
        gradeId: state.gradeId,
        term: state.term,
        termId: state.termId,
      }),
    },
  ),
);

export function useAcademicContext(): AcademicContext {
  return useAcademicContextStore(
    useShallow((s) => ({
      academicYear: s.academicYear,
      academicYearId: s.academicYearId,
      educationalSystem: s.educationalSystem,
      stage: s.stage,
      grade: s.grade,
      gradeId: s.gradeId,
      term: s.term,
      termId: s.termId,
    })),
  );
}


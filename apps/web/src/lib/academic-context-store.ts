import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { getDefaultAcademicYear } from "@/lib/education-options";

export interface AcademicContext {
  readonly academicYear: string | null;
  readonly educationalSystem: string | null;
  readonly stage: string | null;
  readonly grade: string | null;
  readonly term: string | null;
}

export interface AcademicContextIds {
  readonly academicYearId: string | null;
  readonly termId: string | null;
  readonly gradeId: string | null;
}

interface AcademicContextState extends AcademicContext {
  setAcademicYear: (academicYear: string) => void;
  setEducationalSystem: (educationalSystem: string) => void;
  setStage: (stage: string) => void;
  setGrade: (grade: string) => void;
  setTerm: (term: string) => void;
  reset: () => void;
}

export const useAcademicContextStore = create<AcademicContextState>()(
  persist(
    (set) => ({
      academicYear: getDefaultAcademicYear(),
      educationalSystem: null,
      stage: null,
      grade: null,
      term: null,
      setAcademicYear: (academicYear: string): void => {
        set({ academicYear });
      },
      setEducationalSystem: (educationalSystem: string): void => {
        set({ educationalSystem });
      },
      setStage: (stage: string): void => {
        set({ stage, grade: null });
      },
      setGrade: (grade: string): void => {
        set({ grade });
      },
      setTerm: (term: string): void => {
        set({ term });
      },
      reset: (): void => {
        set({
          academicYear: getDefaultAcademicYear(),
          educationalSystem: null,
          stage: null,
          grade: null,
          term: null,
        });
      },
    }),
    {
      name: "el-bannawy-academic-context",
      partialize: (state) => ({
        academicYear: state.academicYear,
        educationalSystem: state.educationalSystem,
        stage: state.stage,
        grade: state.grade,
        term: state.term,
      }),
    },
  ),
);

export function useAcademicContext(): AcademicContext {
  return useAcademicContextStore(
    useShallow((s) => ({
      academicYear: s.academicYear,
      educationalSystem: s.educationalSystem,
      stage: s.stage,
      grade: s.grade,
      term: s.term,
    })),
  );
}

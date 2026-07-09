import { BookOpen, Globe, type LucideIcon } from "lucide-react";
import type { SelectOption } from "@/components/ui/select";

export interface EducationOption {
  readonly id: string;
  readonly label: string;
  readonly icon?: LucideIcon;
}

export const EDUCATIONAL_SYSTEMS: EducationOption[] = [
  { id: "GENERAL", label: "عام", icon: BookOpen },
  { id: "LANGUAGE", label: "لغات", icon: Globe },
  { id: "INTERNATIONAL", label: "دولي", icon: Globe },
];

export const EDUCATIONAL_STAGES: EducationOption[] = [
  { id: "PRIMARY", label: "ابتدائي" },
  { id: "PREPARATORY", label: "إعدادي" },
  { id: "SECONDARY", label: "ثانوي" },
];

export const GRADES: Record<string, readonly string[]> = {
  PRIMARY: [
    "الصف الأول الابتدائي",
    "الصف الثاني الابتدائي",
    "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي",
    "الصف الخامس الابتدائي",
    "الصف السادس الابتدائي",
  ] as const,
  PREPARATORY: [
    "الصف الأول الإعدادي",
    "الصف الثاني الإعدادي",
    "الصف الثالث الإعدادي",
  ] as const,
  SECONDARY: [
    "الصف الأول الثانوي",
    "الصف الثاني الثانوي",
    "الصف الثالث الثانوي",
  ] as const,
};

export const ACADEMIC_TERMS: EducationOption[] = [
  { id: "FIRST_TERM", label: "الترم الأول" },
  { id: "SECOND_TERM", label: "الترم الثاني" },
];

export const ACADEMIC_YEARS: EducationOption[] = [
  { id: "2024-2025", label: "2024 / 2025" },
  { id: "2025-2026", label: "2025 / 2026" },
  { id: "2026-2027", label: "2026 / 2027" },
  { id: "2027-2028", label: "2027 / 2028" },
];

export const SYSTEM_OPTIONS: SelectOption[] = EDUCATIONAL_SYSTEMS.map(
  (s): SelectOption => ({ value: s.id, label: s.label }),
);

export const STAGE_OPTIONS: SelectOption[] = EDUCATIONAL_STAGES.map(
  (s): SelectOption => ({ value: s.id, label: s.label }),
);

export const TERM_OPTIONS: SelectOption[] = ACADEMIC_TERMS.map(
  (t): SelectOption => ({ value: t.id, label: t.label }),
);

export const ACADEMIC_YEAR_OPTIONS: SelectOption[] = ACADEMIC_YEARS.map(
  (y): SelectOption => ({ value: y.id, label: y.label }),
);

export function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) {
    return `${String(year)}-${String(year + 1)}`;
  }
  return `${String(year - 1)}-${String(year)}`;
}

export function getGradeOptions(stageId: string): SelectOption[] {
  return (GRADES[stageId] ?? []).map((g): SelectOption => ({ value: g, label: g }));
}

export function stageLabelToKey(label: string): string | undefined {
  return EDUCATIONAL_STAGES.find((s) => s.label === label)?.id;
}


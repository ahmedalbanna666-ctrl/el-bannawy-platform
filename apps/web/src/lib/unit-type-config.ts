import type { ComponentType } from "react";
import { BookOpen, ScrollText, LibraryBig } from "lucide-react";

export type UnitTypeValue = "UNIT" | "STORY" | "FINAL_REVIEW";

export interface UnitTypeCopy {
  readonly value: UnitTypeValue;
  readonly singular: string;
  readonly plural: string;
  readonly childSingular: string;
  readonly childPlural: string;
  readonly managementTitle: string;
  readonly managementSubtitle: string;
  readonly studentTitle: string;
  readonly studentSubtitle: string;
  readonly startLabel: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly zigzagBadge: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly listHref: string;
}

const UNIT_TYPE_COPY: Record<UnitTypeValue, UnitTypeCopy> = {
  UNIT: {
    value: "UNIT",
    singular: "وحدة",
    plural: "الوحدات",
    childSingular: "درس",
    childPlural: "الدروس",
    managementTitle: "إدارة الوحدات",
    managementSubtitle: "إدارة جميع الوحدات التعليمية على المنصة",
    studentTitle: "الوحدات الدراسية",
    studentSubtitle: "اختر الوحدة التي تريد دراستها",
    startLabel: "ابدأ الوحدة",
    emptyTitle: "لا توجد وحدات متاحة",
    emptyDescription: "يتم إعداد الوحدات الدراسية حالياً",
    zigzagBadge: "LESSON",
    icon: BookOpen,
    listHref: "/dashboard/units",
  },
  STORY: {
    value: "STORY",
    singular: "قصة",
    plural: "القصص",
    childSingular: "فصل",
    childPlural: "الفصول",
    managementTitle: "إدارة القصص",
    managementSubtitle: "إنشاء وإدارة قصص المنهج وفصولها",
    studentTitle: "قصص المنهج",
    studentSubtitle: "اختر القصة التي تريد دراستها",
    startLabel: "ابدأ القصة",
    emptyTitle: "لا توجد قصص متاحة",
    emptyDescription: "يتم إعداد قصص المنهج حالياً",
    zigzagBadge: "CHAPTER",
    icon: ScrollText,
    listHref: "/dashboard/stories",
  },
  FINAL_REVIEW: {
    value: "FINAL_REVIEW",
    singular: "مراجعة نهائية",
    plural: "المراجعات النهائية",
    childSingular: "محاضرة",
    childPlural: "المحاضرات",
    managementTitle: "إدارة المراجعات النهائية",
    managementSubtitle: "إنشاء وإدارة المراجعات النهائية ومحاضراتها",
    studentTitle: "محاضرات المراجعات",
    studentSubtitle: "قائمة محاضرات المراجعة النهائية",
    startLabel: "ابدأ المحاضرة",
    emptyTitle: "لا توجد محاضرات متاحة",
    emptyDescription: "يتم إعداد محاضرات المراجعة النهائية حالياً",
    zigzagBadge: "LECTURE",
    icon: LibraryBig,
    listHref: "/dashboard/final-reviews",
  },
};

export function getUnitTypeCopy(unitType: UnitTypeValue): UnitTypeCopy {
  return UNIT_TYPE_COPY[unitType];
}

export function getDetailHref(unitType: UnitTypeValue, unitId: string): string {
  if (unitType === "STORY") return `/dashboard/stories/${unitId}`;
  return `/dashboard/units/${unitId}`;
}

export function getChapterContentHref(
  unitType: UnitTypeValue,
  unitId: string,
  lessonId: string,
): string {
  if (unitType === "STORY") return `/dashboard/stories/${unitId}/chapters/${lessonId}`;
  return `/dashboard/units/${unitId}/lessons/${lessonId}`;
}

export type { UnitTypeCopy as UnitTypeConfig };

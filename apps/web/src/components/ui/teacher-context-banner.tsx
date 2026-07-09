"use client";

import { type ReactNode } from "react";
import { useAcademicContext } from "@/lib/academic-context-store";
import { useAuthStore } from "@/lib/auth-store";
import {
  EDUCATIONAL_SYSTEMS,
  EDUCATIONAL_STAGES,
  ACADEMIC_TERMS,
} from "@/lib/education-options";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

interface TeacherContextBannerProps {
  className?: string;
}

export function TeacherContextBanner({ className }: TeacherContextBannerProps): ReactNode {
  const ctx = useAcademicContext();
  const userRole = useAuthStore((s) => s.user?.role);
  const isTeacher = userRole === "TEACHER" || userRole === "STAFF";

  if (!isTeacher) return null;

  const systemLabel = EDUCATIONAL_SYSTEMS.find(
    (s) => s.id === ctx.educationalSystem,
  )?.label;
  const stageLabel = EDUCATIONAL_STAGES.find(
    (s) => s.id === ctx.stage,
  )?.label;
  const termLabel = ACADEMIC_TERMS.find(
    (t) => t.id === ctx.term,
  )?.label;

  const hasAll = systemLabel && stageLabel && ctx.grade;

  if (!hasAll) return null;

  const segments = [systemLabel, stageLabel, ctx.grade];
  if (termLabel) {
    segments.push(`معاينة: ${termLabel}`);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-primary-500/20 bg-primary-500/5 px-3 py-1.5 text-[11px] font-medium text-primary-700 dark:text-primary-300",
        className,
      )}
      role="status"
      aria-label="سياق العمل الأكاديمي"
    >
      <Eye className="h-3.5 w-3.5 shrink-0 text-primary-500/60" />
      <span className="sr-only">السياق الحالي:</span>
      {segments.map((segment, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span className="text-primary-500/30 rtl:rotate-180" aria-hidden="true">
              /
            </span>
          )}
          <span className={i === segments.length - 1 ? "font-extrabold" : ""}>
            {segment}
          </span>
        </span>
      ))}
    </div>
  );
}

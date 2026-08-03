"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users } from "lucide-react";
import type { TeacherProfileResponse } from "../types";

interface Props {
  profile: TeacherProfileResponse["roleProfile"];
}

export function TeacherProfileSection({ profile }: Props): ReactNode {
  return (
    <Card variant="glass" padding="lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
            <BookOpen className="h-5 w-5 text-primary-500 dark:text-primary-400" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">التكليفات التعليمية</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">الصفوف المكلّف بها</p>
            {profile.assignedGrades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.assignedGrades.map((grade) => (
                  <Badge key={grade.id} variant="primary">
                    {grade.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <span className="font-normal text-neutral-400 dark:text-neutral-500">لا توجد صفوف مكلّف بها حاليًا</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:text-primary-400">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">إجمالي الطلاب</p>
              <p className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">
                {profile.totalStudents}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary-400" />
          <h2 className="text-base font-extrabold text-neutral-100">التكليفات التعليمية</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-400">الصفوف المكلّف بها</p>
            {profile.assignedGrades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.assignedGrades.map((grade) => (
                  <Badge key={grade.id} variant="primary">
                    {grade.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">لا توجد صفوف مكلّف بها حاليًا</p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <Users className="h-5 w-5 text-primary-400" />
            <div>
              <p className="text-xs text-neutral-500">إجمالي الطلاب</p>
              <p className="text-lg font-extrabold text-neutral-200">
                {profile.totalStudents}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { type ReactNode } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { TeacherCompetitionsView } from "./_components/teacher-competitions-view";
import { StudentCompetitionsView } from "./_components/student-competitions-view";

export default function CompetitionsPage(): ReactNode {
  const { isTeacher, isAdmin } = usePermissions();
  const canManage = isTeacher || isAdmin;

  return canManage ? <TeacherCompetitionsView /> : <StudentCompetitionsView />;
}

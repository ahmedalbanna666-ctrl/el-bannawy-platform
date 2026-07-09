"use client";

import { type ReactNode } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@el-bannawy/shared";
import { TeacherDashboard } from "./_components/teacher-dashboard";
import { StudentDashboard } from "./_components/student-dashboard";

export default function DashboardPage(): ReactNode {
  const { can } = usePermissions();

  if (can(PERMISSIONS.UNITS_CREATE)) {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}

"use client";

import { type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { AdminReportsView } from "./_components/admin-reports-view";
import { TeacherReportsView } from "./_components/teacher-reports-view";
import { StudentReportsView } from "./_components/student-reports-view";

export default function ReportsPage(): ReactNode {
  const role = useAuthStore((s) => s.user?.role);

  if (role === "ADMINISTRATOR") {
    return <AdminReportsView />;
  }

  if (role === "TEACHER") {
    return <TeacherReportsView />;
  }

  return <StudentReportsView />;
}

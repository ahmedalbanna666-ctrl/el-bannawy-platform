"use client";

import { type ReactNode } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminDashboard } from "./_components/admin-dashboard";
import { TeacherDashboard } from "./_components/teacher-dashboard";
import { StudentDashboard } from "./_components/student-dashboard";
import { ShieldX } from "lucide-react";

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "STUDENT"]);

export default function DashboardPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, isStaff } = usePermissions();

  if (typeof rawRole !== "string") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isTeacher) {
    return <TeacherDashboard />;
  }

  if (isStaff) {
    return (
      <EmptyState
        title="لوحة الموظف"
        description="تجربة الموظف قيد التطوير. سيتم تفعيلها في التحديث القادم."
        icon={<ShieldX className="h-16 w-16" />}
      />
    );
  }

  if (!KNOWN_ROLES.has(rawRole)) {
    return (
      <EmptyState
        title="دور غير مدعوم"
        description={`الدور "${rawRole}" غير مدعوم في الإصدار الحالي. يرجى التواصل مع الإدارة.`}
        icon={<ShieldX className="h-16 w-16" />}
      />
    );
  }

  return <StudentDashboard />;
}

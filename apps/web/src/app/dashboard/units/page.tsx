"use client";

import { type ReactNode } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminUnitsView } from "./_components/admin-units-view";
import { TeacherUnitsView } from "./_components/teacher-units-view";
import { StaffUnitsView } from "./_components/staff-units-view";
import { StudentUnitsView } from "./_components/student-units-view";
import { ShieldX } from "lucide-react";

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "STUDENT"]);

export default function UnitsPage(): ReactNode {
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
    return <AdminUnitsView />;
  }

  if (isTeacher) {
    return <TeacherUnitsView />;
  }

  if (isStaff) {
    return <StaffUnitsView />;
  }

  if (!KNOWN_ROLES.has(rawRole)) {
    return (
      <EmptyState
        title="غير مدعوم"
        description={`هذه الصفحة غير متاحة للدور "${rawRole}".`}
        icon={<ShieldX className="h-16 w-16" />}
      />
    );
  }

  return <StudentUnitsView />;
}

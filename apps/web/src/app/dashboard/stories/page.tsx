"use client";

import { type ReactNode } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminUnitsView } from "@/app/dashboard/units/_components/admin-units-view";
import { TeacherUnitsView } from "@/app/dashboard/units/_components/teacher-units-view";
import { StaffUnitsView } from "@/app/dashboard/units/_components/staff-units-view";
import { StudentCollectionView } from "@/components/units/student-collection-view";
import { ShieldX } from "lucide-react";

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "STUDENT"]);

export default function StoriesPage(): ReactNode {
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
    return <AdminUnitsView unitType="STORY" />;
  }

  if (isTeacher) {
    return <TeacherUnitsView unitType="STORY" />;
  }

  if (isStaff) {
    return <StaffUnitsView unitType="STORY" />;
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

  return <StudentCollectionView unitType="STORY" />;
}

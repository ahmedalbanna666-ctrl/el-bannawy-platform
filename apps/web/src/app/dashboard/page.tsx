"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldX } from "lucide-react";

const AdminDashboard = dynamic(
  () => import("./_components/admin-dashboard").then((m) => m.AdminDashboard),
  { loading: () => <RoleDashboardSkeleton /> },
);
const TeacherDashboard = dynamic(
  () => import("./_components/teacher-dashboard").then((m) => m.TeacherDashboard),
  { loading: () => <RoleDashboardSkeleton /> },
);
const StaffDashboard = dynamic(
  () => import("./_components/staff-dashboard").then((m) => m.StaffDashboard),
  { loading: () => <RoleDashboardSkeleton /> },
);
const SecretaryDashboard = dynamic(
  () => import("./_components/secretary-dashboard").then((m) => m.SecretaryDashboard),
  { loading: () => <RoleDashboardSkeleton /> },
);
const StudentDashboard = dynamic(
  () => import("./_components/student-dashboard").then((m) => m.StudentDashboard),
  { loading: () => <RoleDashboardSkeleton /> },
);

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "SECRETARY", "STUDENT"]);

function RoleDashboardSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function DashboardPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, isStaff, isSecretary } = usePermissions();

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
    return <StaffDashboard />;
  }

  if (isSecretary) {
    return <SecretaryDashboard />;
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

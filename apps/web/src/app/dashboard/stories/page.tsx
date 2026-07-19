"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminStoriesView } from "./_components/admin-stories-view";
import { TeacherStoriesView } from "./_components/teacher-stories-view";
import { StaffStoriesView } from "./_components/staff-stories-view";
import { ShieldX } from "lucide-react";

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "STUDENT"]);

export default function StoriesPage(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, isStaff, isStudent } = usePermissions();

  useEffect(() => {
    if (isStudent) {
      router.replace("/dashboard/story");
    }
  }, [isStudent, router]);

  if (isStudent) return null;

  if (typeof rawRole !== "string") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (isAdmin) return <AdminStoriesView />;
  if (isTeacher) return <TeacherStoriesView />;
  if (isStaff) return <StaffStoriesView />;
  if (!KNOWN_ROLES.has(rawRole)) {
    return (
      <EmptyState
        title="غير مدعوم"
        description={`هذه الصفحة غير متاحة للدور "${rawRole}".`}
        icon={<ShieldX className="h-16 w-16" />}
      />
    );
  }
  return <AdminStoriesView />;
}

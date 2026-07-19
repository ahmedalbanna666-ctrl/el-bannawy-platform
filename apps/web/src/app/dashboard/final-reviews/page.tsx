"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminFinalReviewsView } from "./_components/admin-final-reviews-view";
import { TeacherFinalReviewsView } from "./_components/teacher-final-reviews-view";
import { StaffFinalReviewsView } from "./_components/staff-final-reviews-view";
import { ShieldX } from "lucide-react";

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "STUDENT"]);

export default function FinalReviewsPage(): ReactNode {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, isStaff, isStudent } = usePermissions();

  useEffect(() => {
    if (isStudent) {
      router.replace("/dashboard/final-review");
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

  if (isAdmin) return <AdminFinalReviewsView />;
  if (isTeacher) return <TeacherFinalReviewsView />;
  if (isStaff) return <StaffFinalReviewsView />;
  if (!KNOWN_ROLES.has(rawRole)) {
    return (
      <EmptyState
        title="غير مدعوم"
        description={`هذه الصفحة غير متاحة للدور "${rawRole}".`}
        icon={<ShieldX className="h-16 w-16" />}
      />
    );
  }
  return <AdminFinalReviewsView />;
}

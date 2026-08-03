"use client";

import { type ReactNode } from "react";
import { useParams } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { UnitDetailView } from "@/app/dashboard/units/[unitId]/_components/unit-detail-view";
import { StudentChaptersView } from "@/components/units/student-chapters-view";
import { ShieldX } from "lucide-react";

const KNOWN_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "STUDENT"]);

export default function StoryDetailPage(): ReactNode {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher, isStaff } = usePermissions();
  const storyId = Array.isArray(params.storyId) ? params.storyId[0] : (params.storyId ?? "");

  if (typeof rawRole !== "string") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (isAdmin || isTeacher) {
    return <UnitDetailView unitId={storyId} unitType="STORY" />;
  }

  if (isStaff) {
    return <StudentChaptersView unitId={storyId} unitType="STORY" />;
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

  return <StudentChaptersView unitId={storyId} unitType="STORY" />;
}

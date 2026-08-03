"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { usePermissions } from "@/lib/use-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { UnitDetailView } from "./_components/unit-detail-view";

export default function UnitDetailPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const unitId = Array.isArray(params.unitId) ? params.unitId[0] : (params.unitId ?? "");

  const hydrated = typeof rawRole === "string";

  useEffect(() => {
    if (hydrated && !isManagement) {
      router.replace(`/dashboard/lessons/${unitId}`);
    }
  }, [hydrated, isManagement, router, unitId]);

  if (!hydrated || !isManagement) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return <UnitDetailView unitId={unitId} unitType="UNIT" />;
}

"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { UnitDetailView } from "@/app/dashboard/units/[unitId]/_components/unit-detail-view";

export default function FinalReviewDetailPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rawRole = user?.role;
  const { isAdmin, isTeacher } = usePermissions();
  const isManagement = isAdmin || isTeacher;
  const reviewId = Array.isArray(params.reviewId) ? params.reviewId[0] : (params.reviewId ?? "");

  const hydrated = typeof rawRole === "string";

  useEffect(() => {
    if (hydrated && !isManagement) {
      router.replace("/dashboard/final-reviews");
    }
  }, [hydrated, isManagement, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isManagement) {
    return null;
  }

  return <UnitDetailView unitId={reviewId} unitType="FINAL_REVIEW" />;
}

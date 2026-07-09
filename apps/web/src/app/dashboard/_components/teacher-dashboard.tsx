"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { CardEdge } from "@/components/ui/card-edge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { getDashboardModules } from "@/lib/nav-registry";
import { GraduationCap, ChevronLeft } from "lucide-react";

function formatTodayArabic(): string {
  return new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface MyGradesResponse {
  gradeIds: string[];
  grades: { id: string; name: string; stage: { id: string; name: string } }[];
}

export function TeacherDashboard(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const fullName = useAuthStore((s) => s.user?.fullName ?? "");
  const userId = useAuthStore((s) => s.user?.id);
  const firstName = fullName.split(" ")[0];

  const { data: myGrades } = useQuery({
    queryKey: ["my-grades", userId],
    queryFn: async () => {
      const res = await api.get<MyGradesResponse>("/teachers/my-grades");
      return res.data ?? null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const hasAssignedGrades = (myGrades?.grades.length ?? 0) > 0;

  const modules = getDashboardModules(can);
  const primaryModules = modules.filter((m) => m.category === "content");
  const moreModules = modules.filter((m) => m.category !== "content");

  const today = useMemo(() => formatTodayArabic(), []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          السلام عليكم، {firstName || "معلم"} 👋
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          أهلاً بعودتك. قم بإدارة المحتوى التعليمي من مكان واحد.
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          {today}
        </p>
      </div>

      {!hasAssignedGrades && (
        <EmptyState
          title="لم يتم إسناد أي صف دراسي لك حتى الآن."
          description="يرجى التواصل مع الإدارة لتحديد الصفوف الدراسية الخاصة بك."
          icon={<GraduationCap className="h-16 w-16" />}
        />
      )}

      {hasAssignedGrades && primaryModules.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            وحدات الإدارة الأساسية
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {primaryModules.map((m) => (
              <Card
                key={m.id}
                variant="elevated"
                padding="none"
                className="relative cursor-pointer transition-shadow duration-300 hover:scale-[1.005] hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.12)] dark:hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.18)]"
                onClick={(): void => { router.push(m.route); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e): void => { if (e.key === "Enter") router.push(m.route); }}
              >
                <CardEdge variant="primary" />
                <div className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 ring-1 ring-primary-500/10">
                    <m.icon className="h-5 w-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {m.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <ChevronLeft className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {moreModules.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-3">
            المزيد من وحدات الإدارة
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {moreModules.map((m) => (
              <Card
                key={m.id}
                variant="elevated"
                padding="none"
                className="relative cursor-pointer transition-shadow duration-300 hover:scale-[1.005] hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.12)] dark:hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.18)]"
                onClick={(): void => { router.push(m.route); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e): void => { if (e.key === "Enter") router.push(m.route); }}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50">
                    <m.icon className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {m.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {m.description}
                    </p>
                  </div>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

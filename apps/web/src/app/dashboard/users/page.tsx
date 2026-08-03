"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/use-permissions";
import { useAuthStore } from "@/lib/auth-store";
import { GraduationCap, UserCog, Users, ArrowLeft } from "lucide-react";

export default function UsersPage(): ReactNode {
  const router = useRouter();
  const { can } = usePermissions();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "ADMINISTRATOR";

  if (!isAdmin && !can("users.view") && !can("students.view")) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ErrorState title="لا تملك صلاحية الوصول" description="هذه الصفحة مخصصة للمدير فقط" />
        <Button variant="outline" onClick={(): void => { router.push("/dashboard"); }}>العودة للرئيسية</Button>
      </div>
    );
  }

  const sections = [
    {
      id: "students",
      title: "الطلاب",
      description: "عرض وإدارة الطلاب المسجلين — الحالة، التقدم، الحضور، الاشتراكات والعملات",
      icon: GraduationCap,
      href: "/dashboard/students",
    },
    {
      id: "teachers",
      title: "المعلمون",
      description: "إدارة المعلمين والصلاحيات الدراسية والأقسام المخصصة لكل معلم",
      icon: UserCog,
      href: "/dashboard/teachers",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={(): void => { router.push("/dashboard"); }}
          className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
          <Users className="h-6 w-6 text-primary-500" />
          المستخدمون
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          إدارة الطلاب والمعلمين على المنصة
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Card
            key={s.id}
            variant="elevated"
            padding="none"
            className="relative cursor-pointer transition-shadow duration-300 hover:scale-[1.005] hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.12)] dark:hover:shadow-[0_8px_30px_-6px_rgba(6,182,212,0.18)]"
            onClick={(): void => { router.push(s.href); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e): void => { if (e.key === "Enter") router.push(s.href); }}
          >
            <div className="flex flex-col gap-3 px-5 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 ring-1 ring-primary-500/10">
                <s.icon className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{s.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {s.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

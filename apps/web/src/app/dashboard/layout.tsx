"use client";

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { usePermissions } from "@/lib/use-permissions";
import { useDoubleBackExit } from "@/lib/use-double-back-exit";
import { getSidebarModules } from "@/lib/nav-registry";
import { getPageKeyFromPath } from "@/lib/page-status";
import { Skeleton } from "@/components/ui/skeleton";
import { AcademicSettings } from "@/components/ui/academic-settings";
import { AcademicContextInit } from "@/components/ui/academic-context-init";
import {
  Home,
  BookOpen,
  LogOut,
  UserCircle,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Video,
  Headphones,
  Users,
  Banknote,
  Calendar,
  Bell,
} from "lucide-react";
import { Sidebar, type SidebarContent } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { BottomNav, type BottomNavItem } from "@/components/ui/bottom-nav";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardBorderScope } from "@/components/ui/card-border-scope";
import { PageStatusGate } from "@/components/ui/page-status-gate";
import { ReferralPopup } from "@/components/referral/referral-popup";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "مدير",
  TEACHER: "معلم",
  STAFF: "موظف",
  SECRETARY: "سكرتير",
  STUDENT: "طالب",
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const userId = useAuthStore((s) => s.user?.id);
  const { logout, isInitialized } = useAuth();
  const [mounted, setMounted] = useState(false);

  const { data: profile } = useQuery<{
    role: string;
    roleProfile?: { grade?: { name: string } | null; stage?: { name: string } | null };
    assignedGrade?: { name: string; stage: { name: string } } | null;
  } | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await api.get<Record<string, unknown>>("/profile");
      if (!res.data) return null;
      const data = res.data;
      return data as { role: string; roleProfile?: { grade?: { name: string } | null; stage?: { name: string } | null }; assignedGrade?: { name: string; stage: { name: string } } | null };
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 120_000,
  });

  const userRole = useAuthStore((s) => s.user?.role);

  const profileGrade = userRole === "STUDENT"
    ? (profile?.roleProfile?.grade?.name
      ?? profile?.roleProfile?.stage?.name
      ?? "طالب")
    : (ROLE_LABELS[userRole ?? ""] ?? "طالب");

  useEffect(() => {
    setMounted(true);
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    }
  }, [isInitialized, isAuthenticated, router]);

  useDoubleBackExit({
    active: pathname === "/dashboard",
    message: "اضغط رجوع مرة أخرى للخروج",
  });

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return (): void => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  const isTeacherOrStaff = userRole === "TEACHER" || userRole === "STAFF";

  const handleLogout = useCallback((): void => {
    void (async (): Promise<void> => {
      await logout();
      router.push("/login");
    })();
  }, [logout, router]);

  const { can } = usePermissions();

  const sidebarItems: SidebarContent = useMemo(
    () => {
      const modules = getSidebarModules(can, userRole);
      const items: SidebarContent = [];
      for (const m of modules) {
         if (m.id === "home") {
           items.push({ id: m.id, label: m.title, icon: m.icon, href: m.route, onClick: (): void => { router.push(m.route); } });
           continue;
         }

        items.push({
          id: m.id,
          label: m.title,
          icon: m.icon,
          href: m.route,
          onClick: m.route ? (): void => { router.push(m.route); } : undefined,
        });
      }

      items.push({ id: "logout", label: "تسجيل الخروج", icon: LogOut, onClick: handleLogout, danger: true });

      return items;
    },
    [router, handleLogout, can, userRole],
  );

  const bottomNavItems: BottomNavItem[] = useMemo(
    () => {
      if (userRole === "STUDENT") {
        return [
          { id: "units", label: "الوحدات", icon: BookOpen, href: "/dashboard/units", active: pathname.startsWith("/dashboard/units") },
          { id: "ai", label: "اسأل البنا AI", icon: Sparkles, href: "/dashboard/ai", active: pathname.startsWith("/dashboard/ai") },
          { id: "home", label: "الرئيسية", icon: Home, href: "/dashboard", active: pathname === "/dashboard" },
          { id: "live", label: "حصه مباشر", icon: Video, href: "/dashboard/live", active: pathname.startsWith("/dashboard/live") },
          { id: "support", label: "الدعم الفني", icon: Headphones, href: "/dashboard/support", active: pathname.startsWith("/dashboard/support") },
        ];
      }

      if (userRole === "ADMINISTRATOR") {
        return [
          { id: "home", label: "الرئيسية", icon: Home, href: "/dashboard", active: pathname === "/dashboard" },
          { id: "units", label: "الوحدات", icon: BookOpen, href: "/dashboard/units", active: pathname.startsWith("/dashboard/units") },
          {
            id: "users",
            label: "المستخدمون",
            icon: Users,
            href: "/dashboard/users",
            active: pathname.startsWith("/dashboard/users") || pathname.startsWith("/dashboard/students") || pathname.startsWith("/dashboard/teachers"),
          },
          { id: "payments", label: "طلبات الدفع", icon: Banknote, href: "/dashboard/admin/payments", active: pathname.startsWith("/dashboard/admin/payments") },
          { id: "schedules", label: "مواعيد الفرق", icon: Calendar, href: "/dashboard/admin/lesson-schedules", active: pathname.startsWith("/dashboard/admin/lesson-schedules") },
          { id: "ai", label: "إدارة AI", icon: Sparkles, href: "/dashboard/ai/settings", active: pathname.startsWith("/dashboard/ai") },
        ];
      }

      if (userRole === "SECRETARY") {
        return [
          { id: "home", label: "الرئيسية", icon: Home, href: "/dashboard", active: pathname === "/dashboard" },
          { id: "live", label: "الحصص المباشرة", icon: Video, href: "/dashboard/live", active: pathname.startsWith("/dashboard/live") },
          { id: "reports", label: "التقارير", icon: ClipboardList, href: "/dashboard/reports", active: pathname.startsWith("/dashboard/reports") },
          { id: "notifications", label: "الإشعارات", icon: Bell, href: "/dashboard/notifications", active: pathname.startsWith("/dashboard/notifications") },
          { id: "profile", label: "الحساب", icon: UserCircle, href: "/dashboard/profile", active: pathname.startsWith("/dashboard/profile") },
        ];
      }

      return [
        { id: "home", label: "الرئيسية", icon: Home, href: "/dashboard", active: pathname === "/dashboard" },
        { id: "courses", label: "الكورسات", icon: BookOpen, href: "/dashboard/units", active: pathname.startsWith("/dashboard/units") },
        { id: "homework", label: "الواجبات", icon: ClipboardList, href: "/dashboard/units", active: pathname.startsWith("/dashboard/units") },
        { id: "quizzes", label: "الاختبارات", icon: GraduationCap, href: "/dashboard/units", active: pathname.startsWith("/dashboard/units") },
        { id: "profile", label: "الحساب", icon: UserCircle, href: "/dashboard/profile", active: pathname.startsWith("/dashboard/profile") },
      ];
    },
    [router, pathname, userRole],
  );

  if (!mounted || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AcademicContextInit />
      <Sidebar
        items={sidebarItems}
        className="sticky top-0 hidden h-dvh shrink-0 lg:flex"
        onClose={(): void => { setSidebarOpen(false); }}
        onProfileClick={(): void => { router.push("/dashboard/profile"); }}
        profileGrade={profileGrade}
      >
        {isTeacherOrStaff && <AcademicSettings />}
      </Sidebar>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm [animation:sidebar-backdrop-in_0.2s_ease]"
            onClick={(): void => { setSidebarOpen(false); }}
          />
          <Sidebar
            items={sidebarItems}
            className="fixed inset-y-0 start-0 z-50 h-dvh w-[280px] shadow-2xl bg-neutral-950/90 backdrop-blur-xl light:bg-white/90 [animation:sidebar-slide-in_0.25s_ease]"
            onClose={(): void => { setSidebarOpen(false); }}
            onProfileClick={(): void => { router.push("/dashboard/profile"); }}
            profileGrade={profileGrade}
          >
            {isTeacherOrStaff && <AcademicSettings />}
          </Sidebar>
        </div>
      )}

      <div className="min-w-0 flex flex-1 flex-col">
        <Header
          title="لوحة التحكم"
          onMenuClick={(): void => { setSidebarOpen(!sidebarOpen); }}
        />

        <main className="min-w-0 flex-1 p-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(72px+env(safe-area-inset-bottom,0px)+0.75rem)] lg:p-4">
          <ErrorBoundary>
            <CardBorderScope>
              <PageStatusGate pageKey={getPageKeyFromPath(pathname)}>
                {children}
              </PageStatusGate>
            </CardBorderScope>
          </ErrorBoundary>
        </main>

        <BottomNav items={bottomNavItems} />
      </div>

      {userRole === "STUDENT" && <ReferralPopup />}
    </div>
  );
}

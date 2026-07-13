"use client";

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { usePermissions } from "@/lib/use-permissions";
import { getSidebarModules, type NavModule } from "@/lib/nav-registry";
import { Skeleton } from "@/components/ui/skeleton";
import { AcademicSettings } from "@/components/ui/academic-settings";
import {
  Home,
  BookOpen,
  ScrollText,
  LogOut,
  UserCircle,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { Sidebar, type SidebarContent } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { BottomNav, type BottomNavItem } from "@/components/ui/bottom-nav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const userId = useAuthStore((s) => s.user?.id);
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["sidebar-profile", userId],
    queryFn: async () => {
      const res = await api.get<{
        assignedGrade: { name: string; stage: { name: string } } | null;
      }>("/profile");
      return res.data ?? null;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 120_000,
  });

  const profileGrade = profile?.assignedGrade?.name ?? profile?.assignedGrade?.stage.name ?? "طالب";

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const userRole = useAuthStore((s) => s.user?.role);
  const isAdmin = userRole === "ADMINISTRATOR";
  const isTeacherOrStaff = userRole === "TEACHER" || userRole === "STAFF";

  const handleLogout = useCallback((): void => {
    void logout();
    router.push("/login");
  }, [logout, router]);

  const { can } = usePermissions();
  const canEdit = isAdmin || userRole === "TEACHER";

  const sidebarItems: SidebarContent = useMemo(
    () => {
      const modules = getSidebarModules(can);
      const items: SidebarContent = [];
      let lastCategory: NavModule["category"] = null;

      for (const m of modules) {
        if (m.id === "home") {
          items.push({ id: m.id, label: m.title, icon: m.icon, onClick: (): void => { router.push(m.route); } });
          lastCategory = null;
          continue;
        }

        if (m.category === "student" && lastCategory !== "student") {
          items.push({ id: "div-student", label: "", icon: ScrollText, divider: true });
        } else if (m.category === "management" && lastCategory !== "management" && lastCategory !== "content") {
          items.push({ id: "div-management", label: "", icon: ScrollText, divider: true });
        } else if (m.category === "settings" && lastCategory !== "settings") {
          items.push({ id: "div-settings", label: "", icon: ScrollText, divider: true });
        }

        const hasEditPermission = canEdit;
        const label = hasEditPermission ? m.title.replace("الوحدات التعليمية", "إدارة الوحدات").replace("قصة المنهج", "إدارة القصة").replace("المراجعة النهائية", "المراجعة النهائية").replace("الحصص المباشرة", "الحصص المباشرة") : m.title;

        items.push({
          id: m.id,
          label,
          icon: m.icon,
          onClick: m.route ? (): void => { router.push(m.route); } : undefined,
        });

        lastCategory = m.category;
      }

      items.push({ id: "div-logout", label: "", icon: ScrollText, divider: true });
      items.push({ id: "logout", label: "تسجيل الخروج", icon: LogOut, onClick: handleLogout, danger: true });

      return items;
    },
    [router, handleLogout, can],
  );

  const bottomNavItems: BottomNavItem[] = useMemo(
    () => [
      { id: "home", label: "الرئيسية", icon: Home, onClick: (): void => { router.push("/dashboard"); } },
      { id: "courses", label: "الكورسات", icon: BookOpen, onClick: (): void => { router.push("/dashboard/units"); } },
      { id: "homework", label: "الواجبات", icon: ClipboardList, onClick: (): void => { router.push("/dashboard/units"); } },
      { id: "quizzes", label: "الاختبارات", icon: GraduationCap, onClick: (): void => { router.push("/dashboard/units"); } },
      { id: "profile", label: "الحساب", icon: UserCircle, onClick: (): void => { router.push("/dashboard/profile"); } },
    ],
    [router],
  );

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={sidebarItems}
        className="hidden lg:flex"
        onClose={(): void => { setSidebarOpen(false); }}
        onProfileClick={(): void => { router.push("/dashboard/profile"); }}
        profileGrade={profileGrade}
      >
        {isTeacherOrStaff && <AcademicSettings />}
      </Sidebar>

      <div className="flex flex-1 flex-col">
        <Header
          title="لوحة التحكم"
          onMenuClick={(): void => { setSidebarOpen(!sidebarOpen); }}
          onNotificationClick={(): void => { router.push("/dashboard/notifications"); }}
        />

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>

        <BottomNav items={bottomNavItems} />
      </div>
    </div>
  );
}

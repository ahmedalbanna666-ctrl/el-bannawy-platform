"use client";

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  BookOpen,
  ScrollText,
  BookMarked,
  Sparkles,
  Users,
  RefreshCw,
  Gamepad2,
  Award,
  Trophy,
  LifeBuoy,
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
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = useCallback((): void => {
    void logout();
    router.push("/login");
  }, [logout, router]);

  const sidebarItems: SidebarContent = useMemo(
    () => [
      // ── Learning ──────────────────────────────────────────────────
      { id: "home", label: "الرئيسية", icon: Home, onClick: (): void => { router.push("/dashboard"); } },
      { id: "units", label: "الوحدات", icon: BookOpen, onClick: (): void => { router.push("/dashboard/units"); } },
      { id: "story", label: "قصة المنهج", icon: ScrollText, onClick: (): void => { router.push("/dashboard/story"); } },
      { id: "final-review", label: "المراجعة النهائية", icon: BookMarked, onClick: (): void => { router.push("/dashboard/final-review"); } },
      // ── divider ───────────────────────────────────────────────────
      { id: "div-1", label: "", icon: ScrollText, divider: true },
      // ── Interactive ───────────────────────────────────────────────
      { id: "ask-ai", label: "اسأل البنا AI", icon: Sparkles, onClick: (): void => { router.push("/dashboard/ai"); } },
      { id: "live-classes", label: "احجز حصة مباشرة", icon: Users },
      { id: "mistakes", label: "تعلم من أخطائك", icon: RefreshCw },
      { id: "games", label: "الألعاب التعليمية", icon: Gamepad2 },
      // ── divider ───────────────────────────────────────────────────
      { id: "div-2", label: "", icon: ScrollText, divider: true },
      // ── Recognition ───────────────────────────────────────────────
      { id: "achievements", label: "الإنجازات", icon: Award },
      { id: "el-abakera", label: "العباقرة", icon: Trophy },
      // ── divider ───────────────────────────────────────────────────
      { id: "div-3", label: "", icon: ScrollText, divider: true },
      // ── Support ───────────────────────────────────────────────────
      { id: "support", label: "الدعم الفني", icon: LifeBuoy },
      // ── divider ───────────────────────────────────────────────────
      { id: "div-4", label: "", icon: ScrollText, divider: true },
      // ── Logout ────────────────────────────────────────────────────
      { id: "logout", label: "تسجيل الخروج", icon: LogOut, onClick: handleLogout, danger: true },
    ],
    [router, handleLogout],
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
        profileGrade="الصف الأول الثانوي"
      />

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

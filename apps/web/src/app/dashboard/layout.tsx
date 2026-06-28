"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  BookOpen,
  BookMarked,
  ClipboardList,
  GraduationCap,
  ScrollText,
  Users,
  Gamepad2,
  Trophy,
  Award,
  Sparkles,
  RefreshCw,
  LifeBuoy,
  UserCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { Sidebar, type SidebarItem } from "@/components/ui/sidebar";
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

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "home", label: "Home", icon: Home, onClick: () => router.push("/dashboard") },
      { id: "courses", label: "My Courses", icon: BookOpen, onClick: () => router.push("/dashboard/units") },
      { id: "vocabulary", label: "Vocabulary", icon: BookMarked },
      { id: "homework", label: "Homework", icon: ClipboardList, onClick: () => router.push("/dashboard/units") },
      { id: "quizzes", label: "Quizzes", icon: GraduationCap, onClick: () => router.push("/dashboard/units") },
      { id: "stories", label: "Stories", icon: ScrollText },
      { id: "live-classes", label: "Live Classes", icon: Users },
      { id: "games", label: "Games", icon: Gamepad2 },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy },
      { id: "achievements", label: "Achievements", icon: Award },
      { id: "ask-ai", label: "Ask El-bannawy AI", icon: Sparkles, onClick: () => router.push("/dashboard/ai") },
      { id: "mistakes", label: "Learn From Mistakes", icon: RefreshCw },
      { id: "support", label: "Support", icon: LifeBuoy },
      { id: "profile", label: "Profile", icon: UserCircle },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "logout", label: "Logout", icon: LogOut, onClick: () => { void logout(); router.push("/login"); } },
    ],
    [router, logout],
  );

  const bottomNavItems: BottomNavItem[] = useMemo(
    () => [
      { id: "home", label: "Home", icon: Home, onClick: () => router.push("/dashboard") },
      { id: "courses", label: "Courses", icon: BookOpen, onClick: () => router.push("/dashboard/units") },
      { id: "homework", label: "Homework", icon: ClipboardList, onClick: () => router.push("/dashboard/units") },
      { id: "quizzes", label: "Quizzes", icon: GraduationCap, onClick: () => router.push("/dashboard/units") },
      { id: "profile", label: "Profile", icon: UserCircle },
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
      />

      <div className="flex flex-1 flex-col">
        <Header
          title="Dashboard"
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

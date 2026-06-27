"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
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
} from "lucide-react";
import { Sidebar, type SidebarItem } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { BottomNav, type BottomNavItem } from "@/components/ui/bottom-nav";

const NAV_ITEMS = {
  top: [
    { id: "home", label: "Home", icon: Home },
    { id: "courses", label: "My Courses", icon: BookOpen },
    { id: "vocabulary", label: "Vocabulary", icon: BookMarked },
    { id: "homework", label: "Homework", icon: ClipboardList },
    { id: "quizzes", label: "Quizzes", icon: GraduationCap },
    { id: "stories", label: "Stories", icon: ScrollText },
    { id: "live-classes", label: "Live Classes", icon: Users },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "achievements", label: "Achievements", icon: Award },
    { id: "ask-ai", label: "Ask El-bannawy AI", icon: Sparkles },
    { id: "mistakes", label: "Learn From Mistakes", icon: RefreshCw },
  ] satisfies SidebarItem[],
  bottom: [
    { id: "support", label: "Support", icon: LifeBuoy },
    { id: "profile", label: "Profile", icon: UserCircle },
    { id: "settings", label: "Settings", icon: Settings },
  ] satisfies SidebarItem[],
} as const;

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "homework", label: "Homework", icon: ClipboardList },
  { id: "quizzes", label: "Quizzes", icon: GraduationCap },
  { id: "profile", label: "Profile", icon: UserCircle },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

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
        items={[...NAV_ITEMS.top, ...NAV_ITEMS.bottom]}
        className="hidden lg:flex"
      />

      <div className="flex flex-1 flex-col">
        <Header
          title="Dashboard"
          onMenuClick={(): void => { setSidebarOpen(!sidebarOpen); }}
        />

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>

        <BottomNav items={BOTTOM_NAV_ITEMS} />
      </div>
    </div>
  );
}

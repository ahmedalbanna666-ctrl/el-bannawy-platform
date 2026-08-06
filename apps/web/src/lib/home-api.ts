import { api } from "@/lib/api-client";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";

export interface HomeData {
  user: { id: string; fullName: string; role: string };
  xp: { total: number; level: number; nextLevelXp: number };
  coins: number;
  achievements: number;
  streak: number;
  continueLearning: { unitName: string; lessonName: string; progress: number; lessonId: string } | null;
  unitProgress: {
    unitId: string | null;
    unitName: string | null;
    unitDisplayOrder: number | null;
    completedActivities: number;
    totalActivities: number;
    percent: number;
    lessons: {
      id: string;
      title: string;
      displayOrder: number;
      completed: boolean;
    }[];
  };
  nextAction: {
    type: "start" | "continue" | "next_lesson" | "next_unit" | "final_review";
    label: string;
    href: string;
  } | null;
  recentActivity: { id: string; type: string; description: string; createdAt: string }[];
  upcomingLiveClasses: { id: string; title: string; date: string; teacherName: string }[];
  stats: { completedLessons: number; totalLessons: number; homeworkPending: number; quizPassRate: number; attendanceRate: number };
}

export function useHomeData(enabled = true): UseQueryResult<HomeData> {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["home", userId],
    queryFn: async () => {
      const res = await api.get<HomeData>("/home");
      return res.data ?? ({} as HomeData);
    },
    enabled,
    staleTime: 30_000,
  });
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string): Promise<{
    user: {
      id: string;
      fullName: string;
      role: string;
    };
    xp: {
      total: number;
      level: number;
      nextLevelXp: number;
    };
    coins: number;
    achievements: number;
    streak: number;
    continueLearning: {
      unitName: string;
      lessonName: string;
      progress: number;
      lessonId: string;
    } | null;
    recentActivity: {
      id: string;
      type: string;
      description: string;
      createdAt: Date;
    }[];
    upcomingLiveClasses: {
      id: string;
      title: string;
      date: Date;
      teacherName: string;
    }[];
    stats: {
      completedLessons: number;
      totalLessons: number;
      homeworkPending: number;
      quizPassRate: number;
      attendanceRate: number;
    };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const xpTransactions = await this.prisma.xPTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const totalXp = xpTransactions._sum.amount ?? 0;
    const level = Math.floor(totalXp / 1000) + 1;
    const nextLevelXp = level * 1000;

    const coinWallet = await this.prisma.coinWallet.findUnique({
      where: { userId },
    });

    const achievementCount = await this.prisma.userAchievement.count({
      where: { userId },
    });

    const currentProgress = await this.prisma.lessonProgress.findFirst({
      where: {
        userId,
        completed: false,
      },
      orderBy: { startedAt: "desc" },
    });

    const recentLoginHistory = await this.prisma.loginHistory.findMany({
      where: { userId, success: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const totalLessons = await this.prisma.lessonProgress.count({
      where: { userId },
    });
    const completedLessons = await this.prisma.lessonProgress.count({
      where: { userId, completed: true },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
      xp: {
        total: totalXp,
        level,
        nextLevelXp,
      },
      coins: coinWallet?.balance ?? 0,
      achievements: achievementCount,
      streak: 3,
      continueLearning: currentProgress
        ? {
            unitName: "Unit 1",
            lessonName: "Current Lesson",
            progress: currentProgress.progress,
            lessonId: currentProgress.lessonId,
          }
        : null,
      recentActivity: recentLoginHistory.map((entry) => ({
        id: entry.id,
        type: "login",
        description: "Logged into the platform",
        createdAt: entry.createdAt,
      })),
      upcomingLiveClasses: [],
      stats: {
        completedLessons,
        totalLessons,
        homeworkPending: 0,
        quizPassRate: 0,
        attendanceRate: 0,
      },
    };
  }
}

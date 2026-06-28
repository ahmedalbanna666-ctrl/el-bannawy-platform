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
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const currentProgress = await this.prisma.lessonProgress.findFirst({
      where: { userId, completed: false },
      orderBy: { startedAt: "desc" },
      include: { lesson: { include: { unit: true } } },
    });

    const [
      xpTransactions,
      coinWallet,
      achievementCount,
      recentLoginHistory,
      totalLessons,
      completedLessons,
      enrolledLessons,
      quizPassRateTotal,
      quizPassedCount,
      attendanceTotal,
      attendancePresent,
    ] = await Promise.all([
      this.prisma.xPTransaction.aggregate({ where: { userId }, _sum: { amount: true } }),
      this.prisma.coinWallet.findUnique({ where: { userId } }),
      this.prisma.userAchievement.count({ where: { userId } }),
      this.prisma.loginHistory.findMany({ where: { userId, success: true }, orderBy: { createdAt: "desc" }, take: 5 }),
      this.prisma.lessonProgress.count({ where: { userId } }),
      this.prisma.lessonProgress.count({ where: { userId, completed: true } }),
      this.prisma.lessonProgress.findMany({ where: { userId, completed: false }, select: { lessonId: true } }),
      this.prisma.quizAttempt.count({ where: { userId, submitted: true } }),
      this.prisma.quizAttempt.count({ where: { userId, submitted: true, passed: true } }),
      this.prisma.attendanceRecord.count({ where: { userId } }),
      this.prisma.attendanceRecord.count({ where: { userId, present: true } }),
    ]);

    const totalXp = xpTransactions._sum.amount ?? 0;
    const level = Math.floor(totalXp / 1000) + 1;
    const nextLevelXp = level * 1000;

    const enrolledLessonIds = enrolledLessons.map((p) => p.lessonId);
    const homeworkPending = enrolledLessonIds.length > 0
      ? await this.prisma.homework.count({
          where: {
            lessonId: { in: enrolledLessonIds },
            deletedAt: null,
            published: true,
            lesson: { homeworkEnabled: true },
            NOT: { attempts: { some: { userId, submitted: true, passed: true } } },
          },
        })
      : 0;

    const quizPassRate = quizPassRateTotal > 0
      ? Math.round((quizPassedCount / quizPassRateTotal) * 100)
      : 0;

    const attendanceRate = attendanceTotal > 0
      ? Math.round((attendancePresent / attendanceTotal) * 100)
      : 0;

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
      streak: attendancePresent,
      continueLearning: currentProgress
        ? {
            unitName: currentProgress.lesson.unit.title,
            lessonName: currentProgress.lesson.title,
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
        homeworkPending,
        quizPassRate,
        attendanceRate,
      },
    };
  }
}

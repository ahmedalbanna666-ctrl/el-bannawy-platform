import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Student Reports ---

  async getStudentReport(studentId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user) throw new NotFoundException("Student not found");

    const [
      lessonProgress,
      homeworkAttempts,
      quizAttempts,
      xpStats,
      coinWallet,
      achievements,
      attendance,
    ] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { userId: studentId },
        include: {
          lesson: { select: { title: true, unit: { select: { title: true, grade: { select: { name: true } } } } } },
        },
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.studentHomeworkAttempt.findMany({
        where: { userId: studentId, submitted: true },
        include: {
          homework: { select: { title: true, lessonId: true, lesson: { select: { title: true } } } },
        },
        orderBy: { submittedAt: "desc" },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId: studentId, submitted: true },
        include: {
          quiz: { select: { title: true, lessonId: true, lesson: { select: { title: true } } } },
        },
        orderBy: { submittedAt: "desc" },
      }),
      this.prisma.xPTransaction.aggregate({
        where: { userId: studentId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.coinWallet.findUnique({ where: { userId: studentId } }),
      this.prisma.userAchievement.findMany({
        where: { userId: studentId },
        orderBy: { earnedAt: "desc" },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { userId: studentId },
        orderBy: { date: "desc" },
      }),
    ]);

    const totalLessons = lessonProgress.length;
    const completedLessons = lessonProgress.filter((l) => l.completed).length;
    const avgLessonProgress = totalLessons > 0
      ? Math.round(lessonProgress.reduce((s, l) => s + l.progress, 0) / totalLessons)
      : 0;

    const hwScores = homeworkAttempts.map((a) => a.score ?? 0);
    const hwAvgScore = hwScores.length > 0 ? Math.round(hwScores.reduce((a, b) => a + b, 0) / hwScores.length) : 0;
    const hwPassRate = homeworkAttempts.length > 0
      ? Math.round((homeworkAttempts.filter((a) => a.passed).length / homeworkAttempts.length) * 100)
      : 0;

    const quizScores = quizAttempts.map((a) => a.score ?? 0);
    const quizAvgScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
    const quizPassRate = quizAttempts.length > 0
      ? Math.round((quizAttempts.filter((a) => a.passed).length / quizAttempts.length) * 100)
      : 0;

    const attendanceTotal = attendance.length;
    const attendancePresent = attendance.filter((a) => a.present).length;
    const attendanceRate = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;

    const totalXp = xpStats._sum.amount ?? 0;
    const xpLevel = Math.floor(totalXp / 1000) + 1;

    // Calculate streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < attendance.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const dateStr = expected.toISOString().slice(0, 10);
      const record = attendance.find((a) => new Date(a.date).toISOString().slice(0, 10) === dateStr);
      if (record?.present) {
        streak++;
      } else {
        break;
      }
    }

    return {
      student: { id: user.id, fullName: user.fullName, role: user.role },
      overview: {
        totalLessons,
        completedLessons,
        completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        avgLessonProgress,
      },
      homework: {
        totalAttempts: homeworkAttempts.length,
        avgScore: hwAvgScore,
        passRate: hwPassRate,
        recent: homeworkAttempts.slice(0, 5).map((a) => ({
          title: a.homework.title,
          lessonTitle: a.homework.lesson.title,
          score: a.score,
          passed: a.passed,
          submittedAt: a.submittedAt,
        })),
      },
      quizzes: {
        totalAttempts: quizAttempts.length,
        avgScore: quizAvgScore,
        passRate: quizPassRate,
        recent: quizAttempts.slice(0, 5).map((a) => ({
          title: a.quiz.title,
          lessonTitle: a.quiz.lesson.title,
          score: a.score,
          passed: a.passed,
          submittedAt: a.submittedAt,
        })),
      },
      xp: { total: totalXp, level: xpLevel, transactionCount: xpStats._count },
      coins: { balance: coinWallet?.balance ?? 0 },
      achievements: {
        total: achievements.length,
        recent: achievements.slice(0, 5).map((a) => ({
          title: a.title,
          description: a.description,
          earnedAt: a.earnedAt,
        })),
      },
      attendance: { total: attendanceTotal, present: attendancePresent, rate: attendanceRate, streak },
    };
  }

  // --- Teacher Reports ---

  async getTeacherReport(teacherId: string): Promise<unknown> {
    const user = await this.prisma.user.findFirst({ where: { id: teacherId, deletedAt: null } });
    if (!user) throw new NotFoundException("Teacher not found");

    const [totalStudents, hwAll, hwPassed, qAll, qPassed, attAll, attPresent] = await Promise.all([
      this.prisma.user.count({ where: { role: "STUDENT" } }),
      this.prisma.studentHomeworkAttempt.aggregate({ where: { submitted: true }, _avg: { score: true }, _count: true }),
      this.prisma.studentHomeworkAttempt.aggregate({ where: { submitted: true, passed: true }, _count: true }),
      this.prisma.quizAttempt.aggregate({ where: { submitted: true }, _avg: { score: true }, _count: true }),
      this.prisma.quizAttempt.aggregate({ where: { submitted: true, passed: true }, _count: true }),
      this.prisma.attendanceRecord.aggregate({ _count: true }),
      this.prisma.attendanceRecord.aggregate({ where: { present: true }, _count: true }),
    ]);

    const avgHwScore = Math.round(hwAll._avg.score ?? 0);
    const hwPassRate = hwAll._count > 0
      ? Math.round((hwPassed._count / hwAll._count) * 100)
      : 0;

    const avgQuizScore = Math.round(qAll._avg.score ?? 0);
    const quizPassRate = qAll._count > 0
      ? Math.round((qPassed._count / qAll._count) * 100)
      : 0;

    const attRate = attAll._count > 0
      ? Math.round((attPresent._count / attAll._count) * 100)
      : 0;

    return {
      teacher: { id: user.id, fullName: user.fullName },
      classOverview: { totalStudents },
      homework: {
        totalAttempts: hwAll._count,
        avgScore: avgHwScore,
        passRate: hwPassRate,
      },
      quizzes: {
        totalAttempts: qAll._count,
        avgScore: avgQuizScore,
        passRate: quizPassRate,
      },
      attendance: { rate: attRate },
    };
  }

  // --- Admin Reports ---

  async getAdminReport(adminId: string): Promise<unknown> {
    const user = await this.prisma.user.findFirst({ where: { id: adminId, deletedAt: null } });
    if (!user) throw new NotFoundException("Administrator not found");

    const [
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalLessons,
      totalHomework,
      totalQuizzes,
      totalXp,
      totalCoins,
      activeToday,
      hwAttempts,
      quizAttempts,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: "STUDENT" } }),
      this.prisma.user.count({ where: { role: "TEACHER" } }),
      this.prisma.user.count({ where: { role: "ADMINISTRATOR" } }),
      this.prisma.lesson.count({ where: { published: true } }),
      this.prisma.homework.count({ where: { deletedAt: null } }),
      this.prisma.quiz.count({ where: { deletedAt: null } }),
      this.prisma.xPTransaction.aggregate({ _sum: { amount: true } }),
      this.prisma.coinWallet.aggregate({ _sum: { balance: true } }),
      this.prisma.loginHistory.count({
        where: {
          success: true,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.studentHomeworkAttempt.aggregate({ where: { submitted: true }, _count: true, _avg: { score: true } }),
      this.prisma.quizAttempt.aggregate({ where: { submitted: true }, _count: true, _avg: { score: true } }),
    ]);

    return {
      admin: { id: user.id, fullName: user.fullName },
      platform: {
        totalStudents,
        totalTeachers,
        totalAdmins,
        totalLessons,
        totalHomework,
        totalQuizzes,
        activeToday,
      },
      engagement: {
        totalXpAwarded: totalXp._sum.amount ?? 0,
        totalCoinsCirculating: totalCoins._sum.balance ?? 0,
        homeworkAttempts: hwAttempts._count,
        avgHomeworkScore: Math.round(hwAttempts._avg.score ?? 0),
        quizAttempts: quizAttempts._count,
        avgQuizScore: Math.round(quizAttempts._avg.score ?? 0),
      },
    };
  }
}

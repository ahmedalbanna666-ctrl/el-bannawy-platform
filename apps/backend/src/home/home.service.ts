import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademicContextService } from "../common/services/academic-context.service";
import { CacheService } from "../common/services/cache.service";

interface DashboardData {
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
  /** Progress within the student's current unit (0–100), restarts per unit. */
  unitProgress: {
    unitId: string | null;
    unitName: string | null;
    completedLessons: number;
    totalLessons: number;
    percent: number;
  };
  nextAction: {
    type: "start" | "continue" | "next_lesson" | "next_unit" | "final_review";
    label: string;
    href: string;
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
}

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicContext: AcademicContextService,
    private readonly cache: CacheService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardData> {
    const cacheKey = this.cache.generateKey("dashboard", userId);
    const cached = await this.cache.get<DashboardData>(cacheKey);
    if (cached) return cached;

    const data = await this.computeDashboard(userId);
    await this.cache.set(cacheKey, data, 30);
    return data;
  }

  private async computeDashboard(userId: string): Promise<DashboardData> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const ctx = await this.academicContext.getStudentContext(userId);
    const academicFilter = ctx?.gradeId && ctx.academicYearId && ctx.termId
      ? {
          lesson: {
            unit: {
              gradeId: ctx.gradeId,
              academicYearId: ctx.academicYearId,
              termId: ctx.termId,
              ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}),
            },
          },
        }
      : {};

    const quizAcademicFilter = ctx?.gradeId && ctx.academicYearId && ctx.termId
      ? {
          quiz: {
            lesson: {
              unit: {
                gradeId: ctx.gradeId,
                academicYearId: ctx.academicYearId,
                termId: ctx.termId,
                ...(ctx.educationalSystem ? { educationalSystem: ctx.educationalSystem } : {}),
              },
            },
          },
        }
      : {};

    const currentProgress = await this.prisma.lessonProgress.findFirst({
      where: { userId, completed: false, ...academicFilter },
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
      this.prisma.lessonProgress.count({ where: { userId, ...academicFilter } }),
      this.prisma.lessonProgress.count({ where: { userId, completed: true, ...academicFilter } }),
      this.prisma.lessonProgress.findMany({
        where: { userId, completed: false, ...academicFilter },
        select: { lessonId: true },
      }),
      this.prisma.quizAttempt.count({ where: { userId, submitted: true, ...quizAcademicFilter } }),
      this.prisma.quizAttempt.count({ where: { userId, submitted: true, passed: true, ...quizAcademicFilter } }),
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

    const [
      recentLessons,
      recentQuizzes,
      recentHomework,
      recentXp,
      recentAchievements,
      recentPurchases,
    ] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { userId, completed: true },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: {
          id: true,
          completedAt: true,
          lesson: { select: { title: true } },
        },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId, submitted: true },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          submittedAt: true,
          passed: true,
          quiz: { select: { title: true } },
        },
      }),
      this.prisma.studentHomeworkAttempt.findMany({
        where: { userId, submitted: true },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          submittedAt: true,
          passed: true,
          homework: { select: { title: true } },
        },
      }),
      this.prisma.xPTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, amount: true, reason: true, createdAt: true },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        take: 5,
        select: { id: true, title: true, earnedAt: true },
      }),
      this.prisma.coinPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          package: { select: { name: true } },
        },
      }),
    ]);

    const recentActivity: {
      id: string;
      type: string;
      description: string;
      createdAt: Date;
    }[] = [
      ...recentLessons.map((p) => ({
        id: p.id,
        type: "lesson_completed",
        description: `أكملت الدرس "${p.lesson.title}"`,
        createdAt: p.completedAt ?? new Date(0),
      })),
      ...recentQuizzes.map((q) => ({
        id: q.id,
        type: "quiz_completed",
        description: q.passed
          ? `اجتزت اختبار "${q.quiz.title}"`
          : `أنهيت اختبار "${q.quiz.title}"`,
        createdAt: q.submittedAt ?? new Date(0),
      })),
      ...recentHomework.map((h) => ({
        id: h.id,
        type: "homework_submitted",
        description: h.passed
          ? `سلّمت واجب "${h.homework.title}" بنجاح`
          : `سلّمت واجب "${h.homework.title}"`,
        createdAt: h.submittedAt ?? new Date(0),
      })),
      ...recentXp.map((xp) => ({
        id: xp.id,
        type: "xp_earned",
        description: `حصلت على ${String(xp.amount)} نقطة خبرة (${xp.reason})`,
        createdAt: xp.createdAt,
      })),
      ...recentAchievements.map((a) => ({
        id: a.id,
        type: "achievement_earned",
        description: `حققت إنجاز "${a.title}"`,
        createdAt: a.earnedAt,
      })),
      ...recentPurchases.map((cp) => ({
        id: cp.id,
        type: "payment_completed",
        description: `اشتريت باقة "${cp.package.name}"`,
        createdAt: cp.createdAt,
      })),
      ...recentLoginHistory.map((entry) => ({
        id: entry.id,
        type: "login",
        description: "سجّلت دخولك إلى المنصة",
        createdAt: entry.createdAt,
      })),
    ];

    recentActivity.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const quizPassRate = quizPassRateTotal > 0
      ? Math.round((quizPassedCount / quizPassRateTotal) * 100)
      : 0;

    const attendanceRate = attendanceTotal > 0
      ? Math.round((attendancePresent / attendanceTotal) * 100)
      : 0;

    const nextAction = await this.resolveNextAction(userId, ctx, currentProgress);

    const unitProgress = await this.computeUnitProgress(userId, ctx, currentProgress);

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
      unitProgress,
      nextAction,
      recentActivity: recentActivity.slice(0, 10),
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

  /**
   * Resolve the student's next learning action from saved database progress.
   * Deterministic across refreshes, logouts and devices (no local state).
   */
  private async resolveNextAction(
    userId: string,
    ctx: {
      gradeId: string | null;
      academicYearId: string | null;
      termId: string | null;
      educationalSystem: string | null;
    } | null,
    currentProgress: { lessonId: string } | null,
  ): Promise<DashboardData["nextAction"]> {
    // 1) The student has an unfinished lesson → resume it.
    if (currentProgress) {
      return {
        type: "continue",
        label: "استكمل الدرس",
        href: `/dashboard/lessons/detail/${currentProgress.lessonId}`,
      };
    }

    // Without an academic context we cannot resolve the ordered curriculum.
    if (!ctx?.gradeId || !ctx.academicYearId || !ctx.termId) {
      return { type: "start", label: "ابدأ الآن", href: "/dashboard/units" };
    }

    // 2) Ordered curriculum (units → lessons) for the student's context.
    const units = await this.prisma.unit.findMany({
      where: {
        unitType: "UNIT",
        published: true,
        gradeId: ctx.gradeId,
        academicYearId: ctx.academicYearId,
        termId: ctx.termId,
        ...(ctx.educationalSystem
          ? { OR: [{ educationalSystem: ctx.educationalSystem }, { educationalSystem: null }] }
          : {}),
      },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        lessons: {
          where: { published: true },
          orderBy: { displayOrder: "asc" },
          select: { id: true },
        },
      },
    });

    const orderedLessons = units.flatMap((unit) =>
      unit.lessons.map((lesson) => ({ lessonId: lesson.id, unitId: unit.id })),
    );

    const progressRows = await this.prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      orderBy: { completedAt: "desc" },
      select: { lessonId: true, completedAt: true, lesson: { select: { unitId: true } } },
    });
    const completedIds = new Set(progressRows.map((row) => row.lessonId));

    // 3) First lesson that is not completed yet.
    const next = orderedLessons.find((item) => !completedIds.has(item.lessonId)) ?? null;

    // 4) Entire curriculum completed → final review.
    if (!next) {
      return { type: "final_review", label: "ابدأ المراجعة النهائية", href: "/dashboard/final-reviews" };
    }

    // 5) Nothing completed yet → start with the first available lesson.
    if (completedIds.size === 0) {
      return { type: "start", label: "ابدأ الآن", href: `/dashboard/lessons/detail/${next.lessonId}` };
    }

    // 6) Next lesson is in the same unit as the most recently completed one.
    //    progressRows is non-empty here (completedIds.size > 0), ordered by
    //    completedAt desc, so [0] is the most recent completed lesson.
    const lastCompleted = progressRows[0];
    if (lastCompleted.lesson.unitId === next.unitId) {
      return { type: "next_lesson", label: "ابدأ الدرس التالي", href: `/dashboard/lessons/detail/${next.lessonId}` };
    }

    // 7) A new unit is next.
    return { type: "next_unit", label: "ابدأ الوحدة التالية", href: `/dashboard/lessons/detail/${next.lessonId}` };
  }

  /**
   * Compute progress within the student's CURRENT unit (0–100).
   *
   * The "current" unit is derived from the last unfinished lesson when the
   * student is mid-unit; otherwise it falls back to the unit of the most
   * recently completed lesson. Because the current unit changes whenever the
   * student completes a unit and moves on, the percentage naturally restarts
   * from ~0 for each new unit instead of reflecting the whole curriculum.
   */
  private async computeUnitProgress(
    userId: string,
    ctx: {
      gradeId: string | null;
      academicYearId: string | null;
      termId: string | null;
      educationalSystem: string | null;
    } | null,
    currentProgress: { lesson: { unitId: string; unit: { title: string } } } | null,
  ): Promise<DashboardData["unitProgress"]> {
    // Determine the current unit id.
    let unitId = currentProgress?.lesson.unitId ?? null;

    // Fallback: most recently completed lesson's unit.
    if (!unitId) {
      const lastCompleted = await this.prisma.lessonProgress.findFirst({
        where: { userId, completed: true },
        orderBy: { completedAt: "desc" },
        select: { lesson: { select: { unitId: true, unit: { select: { title: true } } } } },
      });
      unitId = lastCompleted?.lesson.unitId ?? null;
    }

    // No context or no current unit → nothing meaningful to show.
    if (!unitId || !ctx?.gradeId || !ctx.academicYearId || !ctx.termId) {
      return { unitId, unitName: currentProgress?.lesson.unit.title ?? null, completedLessons: 0, totalLessons: 0, percent: 0 };
    }

    // Published lessons of this unit, ordered.
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        title: true,
        lessons: {
          where: { published: true },
          orderBy: { displayOrder: "asc" },
          select: { id: true },
        },
      },
    });

    if (!unit) {
      return { unitId, unitName: null, completedLessons: 0, totalLessons: 0, percent: 0 };
    }

    const totalLessons = unit.lessons.length;
    if (totalLessons === 0) {
      return { unitId, unitName: unit.title, completedLessons: 0, totalLessons: 0, percent: 0 };
    }

    const lessonIds = unit.lessons.map((l) => l.id);
    const completedInUnit = await this.prisma.lessonProgress.count({
      where: { userId, completed: true, lessonId: { in: lessonIds } },
    });

    const percent = Math.min(100, Math.round((completedInUnit / totalLessons) * 100));

    return {
      unitId,
      unitName: unit.title,
      completedLessons: completedInUnit,
      totalLessons,
      percent,
    };
  }

  async getLeaderboard(userId: string): Promise<{
    scope: {
      gradeId: string | null;
      academicYearId: string | null;
      termId: string | null;
      educationalSystem: string | null;
    };
    top: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      xp: number;
      level: number;
      coins: number;
      rank: number;
    }[];
    me: ({
      id: string;
      fullName: string;
      avatarUrl: string | null;
      xp: number;
      level: number;
      coins: number;
      rank: number;
    } & { total: number }) | null;
  }> {
    const ctx = await this.academicContext.getStudentContext(userId);

    const scope = {
      gradeId: ctx?.gradeId ?? null,
      academicYearId: ctx?.academicYearId ?? null,
      termId: ctx?.termId ?? null,
      educationalSystem: ctx?.educationalSystem ?? null,
    };

    const where: Record<string, unknown> = { deletedAt: null, role: "STUDENT" };
    if (ctx?.gradeId) {
      where.gradeId = ctx.gradeId;
    }
    if (ctx?.academicYearId) {
      where.academicYearId = ctx.academicYearId;
    }
    if (ctx?.termId) {
      where.termId = ctx.termId;
    }
    if (ctx?.educationalSystem) {
      where.educationalSystem = ctx.educationalSystem;
    }

    const students = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        gradeId: true,
      },
    });

    const xpByUser = await this.prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { userId: { in: students.map((s) => s.id) } },
      _sum: { amount: true },
    });

    const coinsByUser = await this.prisma.coinWallet.findMany({
      where: { userId: { in: students.map((s) => s.id) } },
      select: { userId: true, balance: true },
    });

    const xpMap = new Map(xpByUser.map((x) => [x.userId, x._sum.amount ?? 0]));
    const coinsMap = new Map(coinsByUser.map((c) => [c.userId, c.balance]));

    const ranked = students
      .map((s) => {
        const xp = xpMap.get(s.id) ?? 0;
        return {
          id: s.id,
          fullName: s.fullName,
          avatarUrl: s.avatarUrl,
          xp,
          level: Math.floor(xp / 1000) + 1,
          coins: coinsMap.get(s.id) ?? 0,
          rank: 0,
        };
      })
      .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id))
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const top = ranked.slice(0, 50);
    const me = ranked.find((r) => r.id === userId) ?? null;

    return {
      scope,
      top,
      me: me ? { ...me, total: ranked.length } : null,
    };
  }
}

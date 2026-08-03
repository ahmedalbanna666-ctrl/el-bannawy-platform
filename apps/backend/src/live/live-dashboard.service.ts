import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  LiveSessionStatusEnum,
  LiveBookingStatusEnum,
  LiveBookingRescheduleStatusEnum,
  LiveWaitingListStatusEnum,
  LiveSubscriptionStatusEnum,
} from "@el-bannawy/shared";
import { MEETING_PROVIDER, type MeetingProvider } from "./meeting-provider/meeting-provider.interface";
import { LIVE_POLICY_ENGINE, type LivePolicyEngine } from "./policy";

/**
 * LiveDashboardService — live dashboard aggregates for admin, teacher and
 * secretary surfaces. Read-only; never mutates domain state.
 */
@Injectable()
export class LiveDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(MEETING_PROVIDER) private readonly provider: MeetingProvider,
    @Inject(LIVE_POLICY_ENGINE) private readonly policy: LivePolicyEngine,
  ) {}

  /** Administrative live-module status: provider, scheduler, notifications, policies. */
  async getAdminStatus(): Promise<unknown> {
    const [notificationAnalytics, configs, templates] = await Promise.all([
      this.notifications.getAnalytics(),
      this.prisma.notificationConfig.count(),
      this.prisma.notificationTemplate.count(),
    ]);

    return {
      meetingProvider: {
        id: this.provider.id,
        configured: this.provider.isConfigured(),
        restConfigured: this.provider.isRestConfigured(),
        sdkKeyConfigured: this.provider.getSdkKey().length > 0,
      },
      policies: {
        sessionConsumptionTiming: this.policy.getSessionConsumptionTiming(),
        cancellationRefundPolicy: this.policy.getCancellationRefundPolicy(),
        attendancePolicy: this.policy.getAttendancePolicy(),
      },
      notifications: {
        analytics: notificationAnalytics,
        configsCount: configs,
        templatesCount: templates,
      },
    };
  }

  /** Teacher dashboard live KPIs. */
  async getTeacherKpis(teacherId: string): Promise<unknown> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [
      totalSessions,
      upcomingSessions,
      liveNow,
      todaySessions,
      bookings,
      waitlistCount,
      pendingReschedules,
    ] = await Promise.all([
      this.prisma.liveSession.count({
        where: { teacherId, deletedAt: null },
      }),
      this.prisma.liveSession.count({
        where: {
          teacherId,
          deletedAt: null,
          status: LiveSessionStatusEnum.PUBLISHED,
          startTime: { gte: now },
        },
      }),
      this.prisma.liveSession.count({
        where: { teacherId, deletedAt: null, status: LiveSessionStatusEnum.LIVE },
      }),
      this.prisma.liveSession.count({
        where: {
          teacherId,
          deletedAt: null,
          date: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.liveBooking.findMany({
        where: {
          cancelledAt: null,
          status: LiveBookingStatusEnum.CONFIRMED,
          session: { teacherId, deletedAt: null },
        },
        select: { id: true, sessionId: true, studentId: true },
      }),
      this.prisma.liveWaitingList.count({
        where: { status: LiveWaitingListStatusEnum.WAITING, session: { teacherId } },
      }),
      this.prisma.liveBooking.count({
        where: {
          rescheduleStatus: LiveBookingRescheduleStatusEnum.REQUESTED,
          session: { teacherId, deletedAt: null },
        },
      }),
    ]);

    return {
      teacherId,
      totalSessions,
      upcomingSessions,
      liveNow,
      todaySessions,
      totalBookings: bookings.length,
      uniqueStudents: new Set(bookings.map((b) => b.studentId)).size,
      waitlistEntries: waitlistCount,
      pendingRescheduleRequests: pendingReschedules,
    };
  }

  /** Secretary observer overview (read-only live + operational counts). */
  async getSecretaryOverview(): Promise<unknown> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [todayLiveClasses, upcomingLiveClasses, activeSubscriptions, totalStudents, waitlistEntries, recentSessions] =
      await Promise.all([
        this.prisma.liveSession.count({
          where: {
            deletedAt: null,
            date: { gte: todayStart, lt: todayEnd },
            status: { not: { in: [LiveSessionStatusEnum.CANCELLED, LiveSessionStatusEnum.ARCHIVED] } },
          },
        }),
        this.prisma.liveSession.count({
          where: {
            deletedAt: null,
            status: LiveSessionStatusEnum.PUBLISHED,
            startTime: { gte: now },
          },
        }),
        this.prisma.liveSubscription.count({
          where: {
            status: LiveSubscriptionStatusEnum.ACTIVE,
            deletedAt: null,
            currentPeriodEnd: { gte: now },
          },
        }),
        this.prisma.user.count({ where: { role: "STUDENT" } }),
        this.prisma.liveWaitingList.count({
          where: { status: LiveWaitingListStatusEnum.WAITING },
        }),
        this.prisma.liveSession.findMany({
          where: { deletedAt: null },
          take: 10,
          orderBy: { startTime: "desc" },
          include: {
            teacher: { select: { id: true, fullName: true, avatarUrl: true } },
            _count: { select: { bookings: true } },
          },
        }),
      ]);

    return {
      todayLiveClasses,
      upcomingLiveClasses,
      activeSubscriptions,
      totalStudents,
      waitlistEntries,
      recentSessions,
    };
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  LiveSessionStatusEnum,
  LiveBookingStatusEnum,
  LiveWaitingListStatusEnum,
  LiveSubscriptionStatusEnum,
  LiveAttendanceStatusEnum,
} from "@el-bannawy/shared";

const ATTENDED_STATUSES: ReadonlySet<string> = new Set(["JOINED", "LATE", "COMPLETED"]);

const TERMINAL_SESSION_STATUSES: ReadonlySet<string> = new Set([
  LiveSessionStatusEnum.CANCELLED,
  LiveSessionStatusEnum.COMPLETED,
  LiveSessionStatusEnum.ARCHIVED,
]);

interface AnalyticsDateRange {
  dateFrom: string;
  dateTo: string;
}

/**
 * LiveAnalyticsService — read-only live analytics for dashboards and reports.
 *
 * Derives all metrics live from existing tables (LiveSession, LiveBooking,
 * LiveSubscription, LiveAttendance, LiveWaitingList). No persisted aggregates,
 * no schema changes. Mirrors the single-owner rule: it never mutates domain
 * state and only reads through Prisma directly for aggregation.
 */
@Injectable()
export class LiveAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform-wide live KPIs over a date range. */
  async getOverview(dto: AnalyticsDateRange): Promise<unknown> {
    const { from, to } = this.toRange(dto);
    const now = new Date();
    const sessionWhere: Record<string, unknown> = {
      deletedAt: null,
      date: { gte: from, lte: to },
    };

    const [sessions, bookings, activeSubscriptions, waitlistEntries, attendanceRows] =
      await Promise.all([
        this.prisma.liveSession.findMany({
          where: sessionWhere,
          select: { id: true, status: true, maxStudents: true },
        }),
        this.prisma.liveBooking.findMany({
          where: { cancelledAt: null, status: LiveBookingStatusEnum.CONFIRMED },
          select: { sessionId: true, studentId: true },
        }),
        this.prisma.liveSubscription.count({
          where: {
            status: LiveSubscriptionStatusEnum.ACTIVE,
            deletedAt: null,
            currentPeriodEnd: { gte: now },
          },
        }),
        this.prisma.liveWaitingList.count({
          where: { status: LiveWaitingListStatusEnum.WAITING },
        }),
        this.prisma.liveAttendance.findMany({
          where: { session: sessionWhere },
          select: { sessionId: true, studentId: true, status: true },
        }),
      ]);

    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const totalSeats = sessions.reduce(
      (sum, s) => sum + (s.maxStudents ?? 0),
      0,
    );
    const attendedKeys = new Set(
      attendanceRows
        .filter((a) => ATTENDED_STATUSES.has(a.status))
        .map((a) => `${a.sessionId}:${a.studentId}`),
    );

    const statusCounts: Record<string, number> = {};
    for (const session of sessions) {
      statusCounts[session.status] = (statusCounts[session.status] ?? 0) + 1;
    }

    const bookingsForSessions = bookings.filter((b) => sessionById.has(b.sessionId));
    const attendedCount = bookingsForSessions.filter((b) =>
      attendedKeys.has(`${b.sessionId}:${b.studentId}`),
    ).length;
    const bookingCount = bookingsForSessions.length;
    const totalStudents = new Set(bookingsForSessions.map((b) => b.studentId)).size;

    const upcoming = await this.prisma.liveSession.count({
      where: {
        deletedAt: null,
        status: LiveSessionStatusEnum.PUBLISHED,
        startTime: { gte: now },
      },
    });

    return {
      totalSessions: sessions.length,
      publishedSessions: statusCounts[LiveSessionStatusEnum.PUBLISHED] ?? 0,
      liveNowSessions: statusCounts[LiveSessionStatusEnum.LIVE] ?? 0,
      completedSessions: statusCounts[LiveSessionStatusEnum.COMPLETED] ?? 0,
      cancelledSessions: statusCounts[LiveSessionStatusEnum.CANCELLED] ?? 0,
      upcomingSessions: upcoming,
      totalBookings: bookingCount,
      totalStudents,
      attendanceRate: this.percent(attendedCount, bookingCount),
      capacityUtilization: this.percent(bookingCount, totalSeats),
      activeSubscriptions,
      waitlistEntries,
    };
  }

  /** Per-teacher live KPIs. */
  async getTeacherAnalytics(
    teacherId: string,
    dto: AnalyticsDateRange,
  ): Promise<unknown> {
    const { from, to } = this.toRange(dto);
    const sessionWhere: Record<string, unknown> = {
      teacherId,
      deletedAt: null,
      date: { gte: from, lte: to },
    };

    const [sessions, bookings, attendanceRows, upcomingCount] = await Promise.all([
      this.prisma.liveSession.findMany({
        where: sessionWhere,
        select: { id: true, status: true, maxStudents: true },
      }),
      this.prisma.liveBooking.findMany({
        where: {
          cancelledAt: null,
          status: LiveBookingStatusEnum.CONFIRMED,
          session: {
            teacherId,
            deletedAt: null,
            date: { gte: from, lte: to },
          },
        },
        select: { sessionId: true, studentId: true },
      }),
      this.prisma.liveAttendance.findMany({
        where: { session: sessionWhere },
        select: { sessionId: true, studentId: true, status: true },
      }),
      this.prisma.liveSession.count({
        where: {
          teacherId,
          deletedAt: null,
          status: LiveSessionStatusEnum.PUBLISHED,
          startTime: { gte: new Date() },
        },
      }),
    ]);

    const attendedKeys = new Set(
      attendanceRows
        .filter((a) => ATTENDED_STATUSES.has(a.status))
        .map((a) => `${a.sessionId}:${a.studentId}`),
    );
    const totalSeats = sessions.reduce((sum, s) => sum + (s.maxStudents ?? 0), 0);
    const attendedCount = bookings.filter((b) => attendedKeys.has(`${b.sessionId}:${b.studentId}`)).length;
    const uniqueStudents = new Set(bookings.map((b) => b.studentId)).size;
    const completed = sessions.filter(
      (s) => (s.status as LiveSessionStatusEnum) === LiveSessionStatusEnum.COMPLETED,
    ).length;

    return {
      teacherId,
      totalSessions: sessions.length,
      completedSessions: completed,
      upcomingSessions: upcomingCount,
      totalBookings: bookings.length,
      uniqueStudents,
      attendanceRate: this.percent(attendedCount, bookings.length),
      capacityUtilization: this.percent(bookings.length, totalSeats),
    };
  }

  /** Per-student live activity over a date range. */
  async getStudentAnalytics(
    studentId: string,
    dto: AnalyticsDateRange,
  ): Promise<unknown> {
    const { from, to } = this.toRange(dto);
    const now = new Date();

    const [bookings, waitlistCount, activeSubscriptions] = await Promise.all([
      this.prisma.liveBooking.findMany({
        where: {
          studentId,
          cancelledAt: null,
          status: LiveBookingStatusEnum.CONFIRMED,
          session: { deletedAt: null, date: { gte: from, lte: to } },
        },
        select: { sessionId: true },
      }),
      this.prisma.liveWaitingList.count({
        where: { studentId, status: LiveWaitingListStatusEnum.WAITING },
      }),
      this.prisma.liveSubscription.count({
        where: {
          userId: studentId,
          status: LiveSubscriptionStatusEnum.ACTIVE,
          deletedAt: null,
          currentPeriodEnd: { gte: now },
        },
      }),
    ]);

    const sessionIds = bookings.map((b) => b.sessionId);
    const attendanceRows = sessionIds.length
      ? await this.prisma.liveAttendance.findMany({
          where: { studentId, sessionId: { in: sessionIds } },
          select: { status: true },
        })
      : [];
    const attendedCount = attendanceRows.filter((a) => ATTENDED_STATUSES.has(a.status)).length;
    const completedCount = attendanceRows.filter(
      (a) => (a.status as LiveAttendanceStatusEnum) === LiveAttendanceStatusEnum.COMPLETED,
    ).length;

    return {
      studentId,
      totalBookings: bookings.length,
      attendedSessions: attendedCount,
      completedSessions: completedCount,
      attendanceRate: this.percent(attendedCount, bookings.length),
      activeSubscriptions,
      waitlistEntries: waitlistCount,
    };
  }

  /** Per-session analytics (bookings, attendance, capacity). */
  async getSessionAnalytics(dto: AnalyticsDateRange): Promise<unknown[]> {
    const { from, to } = this.toRange(dto);
    const sessionWhere: Record<string, unknown> = {
      deletedAt: null,
      date: { gte: from, lte: to },
    };

    const [sessions, bookings, attendanceRows] = await Promise.all([
      this.prisma.liveSession.findMany({
        where: sessionWhere,
        select: {
          id: true,
          title: true,
          status: true,
          date: true,
          startTime: true,
          maxStudents: true,
          teacherId: true,
          teacher: { select: { id: true, fullName: true } },
        },
        orderBy: { startTime: "desc" },
      }),
      this.prisma.liveBooking.findMany({
        where: {
          cancelledAt: null,
          status: LiveBookingStatusEnum.CONFIRMED,
          session: sessionWhere,
        },
        select: { sessionId: true, studentId: true },
      }),
      this.prisma.liveAttendance.findMany({
        where: { session: sessionWhere },
        select: { sessionId: true, studentId: true, status: true },
      }),
    ]);

    const bookingsBySession = new Map<string, { studentId: string }[]>();
    for (const booking of bookings) {
      const list = bookingsBySession.get(booking.sessionId) ?? [];
      list.push({ studentId: booking.studentId });
      bookingsBySession.set(booking.sessionId, list);
    }
    const attendedKeys = new Set(
      attendanceRows
        .filter((a) => ATTENDED_STATUSES.has(a.status))
        .map((a) => `${a.sessionId}:${a.studentId}`),
    );

    return sessions.map((session) => {
      const sessionBookings = bookingsBySession.get(session.id) ?? [];
      const attended = sessionBookings.filter((b) =>
        attendedKeys.has(`${session.id}:${b.studentId}`),
      ).length;
      return {
        sessionId: session.id,
        title: session.title,
        status: session.status,
        date: session.date,
        startTime: session.startTime,
        teacher: session.teacher,
        bookingCount: sessionBookings.length,
        attendanceRate: this.percent(attended, sessionBookings.length),
        capacityUtilization: this.percent(
          sessionBookings.length,
          session.maxStudents ?? 0,
        ),
        terminal: TERMINAL_SESSION_STATUSES.has(session.status),
      };
    });
  }

  private toRange(dto: AnalyticsDateRange): { from: Date; to: Date } {
    const from = new Date(dto.dateFrom);
    const to = new Date(dto.dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("Invalid date range");
    }
    return { from, to };
  }

  private percent(part: number, whole: number): number {
    if (whole <= 0) return 0;
    return Math.round((part / whole) * 1000) / 10;
  }
}

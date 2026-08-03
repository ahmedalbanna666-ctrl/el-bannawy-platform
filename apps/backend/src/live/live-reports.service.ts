import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  LiveSessionKindEnum,
  LiveSessionTypeEnum,
  LiveSubscriptionTypeEnum,
} from "@el-bannawy/shared";

interface ProductReport {
  product: LiveSessionKindEnum;
  sessionCount: number;
  bookingCount: number;
  attendanceRate: number;
  capacityUtilization: number;
}

const ATTENDED_STATUSES: ReadonlySet<string> = new Set([
  "JOINED",
  "LATE",
  "COMPLETED",
]);

/**
 * LiveReportsService — read-only per-product live analytics.
 *
 * Derives metrics live from existing tables (LiveSession, LiveBooking,
 * LiveSubscription, LiveAttendance). No persisted aggregates. Product
 * classification reuses the deterministic SessionKindResolver rules applied to
 * each confirmed booking.
 */
@Injectable()
export class LiveReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductReports(dto: {
    dateFrom: string;
    dateTo: string;
    teacherId?: string;
  }): Promise<ProductReport[]> {
    const from = new Date(dto.dateFrom);
    const to = new Date(dto.dateTo);

    const sessionWhere: Record<string, unknown> = {
      date: { gte: from, lte: to },
      deletedAt: null,
    };
    if (dto.teacherId) sessionWhere.teacherId = dto.teacherId;

    const bookings = await this.prisma.liveBooking.findMany({
      where: {
        cancelledAt: null,
        status: "CONFIRMED",
        session: sessionWhere,
      },
      select: {
        sessionId: true,
        studentId: true,
        session: {
          select: {
            id: true,
            type: true,
            teacherId: true,
            maxStudents: true,
          },
        },
        subscription: { select: { type: true } },
      },
    });

    const sessionIds = [...new Set(bookings.map((b) => b.sessionId))];
    const attendances = sessionIds.length
      ? await this.prisma.liveAttendance.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, studentId: true, status: true },
        })
      : [];
    const attendedKeys = new Set(
      attendances
        .filter((a) => ATTENDED_STATUSES.has(a.status))
        .map((a) => `${a.sessionId}:${a.studentId}`),
    );

    const productGroups = new Map<LiveSessionKindEnum, {
      sessions: Set<string>;
      bookings: number;
      attended: number;
      totalSeats: number;
    }>();

    const sessionSeats = new Map<string, number>();
    for (const booking of bookings) {
      const sessionId = booking.sessionId;
      if (!sessionSeats.has(sessionId)) {
        sessionSeats.set(sessionId, booking.session.maxStudents ?? 1);
      }
    }

    for (const booking of bookings) {
      const product = this.classify(
        booking.session.type as LiveSessionTypeEnum,
        (booking.subscription?.type as LiveSubscriptionTypeEnum | undefined) ?? null,
      );
      const group = productGroups.get(product) ?? {
        sessions: new Set<string>(),
        bookings: 0,
        attended: 0,
        totalSeats: 0,
      };
      group.sessions.add(booking.sessionId);
      group.bookings += 1;
      if (attendedKeys.has(`${booking.sessionId}:${booking.studentId}`)) {
        group.attended += 1;
      }
      productGroups.set(product, group);
    }

    for (const group of productGroups.values()) {
      for (const sessionId of group.sessions) {
        group.totalSeats += sessionSeats.get(sessionId) ?? 1;
      }
    }

    const products: LiveSessionKindEnum[] = [
      LiveSessionKindEnum.PRIVATE_MONTHLY,
      LiveSessionKindEnum.GROUP,
      LiveSessionKindEnum.ONE_TIME,
      LiveSessionKindEnum.FREE,
    ];

    return products.map((product) => {
      const group = productGroups.get(product);
      if (!group) {
        return {
          product,
          sessionCount: 0,
          bookingCount: 0,
          attendanceRate: 0,
          capacityUtilization: 0,
        };
      }
      const bookingCount = group.bookings;
      const attendanceRate = bookingCount > 0 ? (group.attended / bookingCount) * 100 : 0;
      const capacityUtilization = group.totalSeats > 0 ? (bookingCount / group.totalSeats) * 100 : 0;
      return {
        product,
        sessionCount: group.sessions.size,
        bookingCount,
        attendanceRate: this.round(attendanceRate),
        capacityUtilization: this.round(capacityUtilization),
      };
    });
  }

  /**
   * Deterministic product classification from a booking (same precedence as
   * SessionKindResolver): GROUP session -> GROUP; PRIVATE + PRIVATE_MONTHLY ->
   * PRIVATE_MONTHLY; PRIVATE + ONE_TIME_PRIVATE -> ONE_TIME; otherwise FREE.
   */
  private classify(
    sessionType: LiveSessionTypeEnum,
    subscriptionType: LiveSubscriptionTypeEnum | null,
  ): LiveSessionKindEnum {
    if (sessionType === LiveSessionTypeEnum.GROUP) {
      return LiveSessionKindEnum.GROUP;
    }
    if (subscriptionType === LiveSubscriptionTypeEnum.PRIVATE_MONTHLY) {
      return LiveSessionKindEnum.PRIVATE_MONTHLY;
    }
    if (subscriptionType === LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE) {
      return LiveSessionKindEnum.ONE_TIME;
    }
    return LiveSessionKindEnum.FREE;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAvailabilityService } from "./live-availability.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import { BookingEngineService } from "./booking/booking-engine.service";
import { SessionKindResolver } from "./booking/session-kind.resolver";
import {
  LiveSessionKindEnum,
  LiveSessionTypeEnum,
  LiveSubscriptionTypeEnum,
} from "@el-bannawy/shared";

interface RecurringOccurrence {
  date: string;
  status: "BOOKED" | "SKIPPED";
  reason?: string;
  booking?: unknown;
}

/**
 * LiveRecurringBookingService — Private Monthly / Group recurring series.
 *
 * A product-level convenience that books a student into every session derived
 * from a single recurring availability slot within a date range. Reuses the
 * Scheduling Engine (materializeSessionFromSlot), the unified Booking Engine
 * (per-occurrence V1–V9 validation) and the Subscription Engine
 * (isEligible/isExhausted). No seat, subscription-counter or validation logic
 * is duplicated here.
 */
@Injectable()
export class LiveRecurringBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: LiveAvailabilityService,
    private readonly subscriptions: LiveSubscriptionService,
    private readonly engine: BookingEngineService,
    private readonly kindResolver: SessionKindResolver,
  ) {}

  async bookSeries(
    userId: string,
    slotId: string,
    dto: { dateFrom: string; dateTo: string; subscriptionId?: string },
  ): Promise<unknown> {
    const [availId] = slotId.split(":");
    const avail = await this.prisma.teacherAvailability.findFirst({
      where: { id: availId, deletedAt: null },
    });
    if (!avail) throw new NotFoundException("Slot not found");

    const from = new Date(dto.dateFrom);
    const to = new Date(dto.dateTo);
    if (to < from) throw new BadRequestException("dateTo must be on or after dateFrom");

    const dates = this.eligibleDates(avail, from, to);
    if (dates.length === 0) {
      throw new BadRequestException("No recurring dates match this slot within the range");
    }

    const activeTypes = await this.subscriptions.getActiveTypesForTeacher(
      userId,
      avail.teacherId,
    );

    const occurrences: RecurringOccurrence[] = [];
    for (const dateStr of dates) {
      occurrences.push(await this.bookOccurrence(userId, availId, dateStr, activeTypes, dto.subscriptionId));
    }

    return {
      slotId: availId,
      teacherId: avail.teacherId,
      range: { dateFrom: dto.dateFrom, dateTo: dto.dateTo },
      bookedCount: occurrences.filter((o) => o.status === "BOOKED").length,
      skippedCount: occurrences.filter((o) => o.status === "SKIPPED").length,
      occurrences,
    };
  }

  private eligibleDates(
    avail: {
      dayOfWeek: number;
      effectiveFrom: Date | null;
      effectiveTo: Date | null;
    },
    from: Date,
    to: Date,
  ): string[] {
    const cur = new Date(from);
    const dates: string[] = [];
    while (cur <= to) {
      if (cur.getDay() === avail.dayOfWeek) {
        if (avail.effectiveFrom && cur < avail.effectiveFrom) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }
        if (avail.effectiveTo && cur > avail.effectiveTo) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }
        dates.push(cur.toISOString().split("T")[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  private async bookOccurrence(
    userId: string,
    availId: string,
    dateStr: string,
    activeTypes: LiveSubscriptionTypeEnum[],
    subscriptionId?: string,
  ): Promise<RecurringOccurrence> {
    try {
      const session = await this.availability.materializeSessionFromSlot(availId, dateStr);
      const kind = this.kindResolver.resolve(
        session.type as LiveSessionTypeEnum,
        activeTypes,
      );
      const eligible = await this.subscriptions.isEligible(userId, session.teacherId, kind);
      if (!eligible) {
        const exhausted = await this.subscriptions.isExhausted(userId, session.teacherId, kind);
        return {
          date: dateStr,
          status: "SKIPPED",
          reason: exhausted
            ? "subscription exhausted"
            : kind === LiveSessionKindEnum.FREE
              ? "session not bookable as a paid product"
              : "no active subscription for this kind",
        };
      }
      const booking = await this.engine.book(userId, { sessionId: session.id, subscriptionId });
      return { date: dateStr, status: "BOOKED", booking };
    } catch (error) {
      return {
        date: dateStr,
        status: "SKIPPED",
        reason: error instanceof Error ? error.message : "booking failed",
      };
    }
  }
}

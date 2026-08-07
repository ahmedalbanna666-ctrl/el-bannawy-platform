import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import { LiveRecurringBookingService } from "./live-recurring-booking.service";
import { LiveProductPricingService } from "./live-product-pricing.service";
import type { LiveProductCode } from "@el-bannawy/shared";

interface LiveCheckoutMetadata {
  scheduleId?: string;
  dayIds?: string[];
  subscriptionType?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: "PRIVATE" | "GROUP";
}

function isGroupCode(code: LiveProductCode): boolean {
  return code.startsWith("GROUP_");
}

function codeToSubscriptionType(code: LiveProductCode): string {
  switch (code) {
    case "PRIVATE_PLAN_A":
      return "PRIVATE_PLAN_A";
    case "PRIVATE_PLAN_B":
      return "PRIVATE_PLAN_B";
    case "GROUP_PLAN_A":
      return "GROUP_PLAN_A";
    case "GROUP_PLAN_B":
      return "GROUP_PLAN_B";
    case "ONE_TIME":
      return "ONE_TIME_PRIVATE";
    default:
      throw new BadRequestException(`Product ${code} has no subscription type`);
  }
}

/**
 * LiveActivationService — grants live products after payment succeeds.
 *
 * This is the single place that turns a successful LIVE_* payment into
 * domain state: it creates the subscription and generates the month's
 * bookable sessions (recurring series). It must be idempotent per payment so
 * webhook/verify/review retries never double-grant.
 */
@Injectable()
export class LiveActivationService {
  private readonly logger = new Logger(LiveActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: LiveSubscriptionService,
    private readonly recurringBookings: LiveRecurringBookingService,
    private readonly pricing: LiveProductPricingService,
  ) {}

  /** Activate a live product for the given payment. Idempotent: no-ops if already activated. */
  async activate(
    userId: string,
    productType: string,
    paymentId: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.gatewayResponse?.includes("activated")) {
      return;
    }
    const code = LiveProductPricingService.codeFromProductType(productType);
    if (code === "FREE") return;

    if (code === "ONE_TIME") {
      await this.activateOneTime(userId, code, payment);
    } else {
      await this.activateSubscription(userId, code, payment);
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayResponse: "activated" },
    });
  }

  private async activateOneTime(
    userId: string,
    code: LiveProductCode,
    payment: { id: string; metadata: unknown; amount: number },
  ): Promise<void> {
    const metadata = (payment.metadata ?? {}) as LiveCheckoutMetadata;
    const dayIds = metadata.dayIds;
    if (!dayIds || dayIds.length === 0) {
      throw new BadRequestException("One-time booking requires a day slot");
    }

    const slot = await this.prisma.teacherAvailability.findFirst({
      where: { id: dayIds[0], deletedAt: null },
      select: { teacherId: true, maxStudents: true, type: true },
    });
    if (!slot) throw new NotFoundException("Slot not found");

    const price = await this.pricing.getPrice(code);
    const sub = await this.subscriptions.createSubscription(userId, {
      teacherId: slot.teacherId,
      type: codeToSubscriptionType(code),
      price,
    });

    const dateFrom = metadata.dateFrom ?? new Date().toISOString().split("T")[0];
    await this.recurringBookings.bookSeries(userId, `${dayIds[0]}:${dateFrom}`, {
      dateFrom,
      dateTo: dateFrom,
      subscriptionId: (sub as { id: string }).id,
      maxCount: 1,
    });
  }

  private async activateSubscription(
    userId: string,
    code: LiveProductCode,
    payment: { id: string; metadata: unknown; amount: number },
  ): Promise<void> {
    const metadata = (payment.metadata ?? {}) as LiveCheckoutMetadata;
    const scheduleId = metadata.scheduleId;
    if (!scheduleId) {
      throw new BadRequestException("Live subscription requires a schedule");
    }

    const schedule = await this.prisma.studySchedule.findFirst({
      where: { id: scheduleId, deletedAt: null },
      include: { days: { where: { deletedAt: null }, orderBy: { dayOfWeek: "asc" } } },
    });
    if (!schedule) throw new NotFoundException("Schedule not found");

    const isGroup = isGroupCode(code);
    if (isGroup && schedule.type !== "GROUP") {
      throw new BadRequestException("Group plan requires a group schedule");
    }
    if (!isGroup && schedule.type !== "PRIVATE") {
      throw new BadRequestException("Private plan requires a private schedule");
    }

    const sessionCount = this.pricing.getSessionCount(code);
    const price = await this.pricing.getPrice(code);
    const sub = await this.subscriptions.createSubscription(userId, {
      teacherId: schedule.teacherId,
      type: codeToSubscriptionType(code),
      scheduleId,
      price,
    });
    const subscriptionId = (sub as { id: string }).id;

    const from = metadata.dateFrom ?? new Date().toISOString().split("T")[0];
    const to = metadata.dateTo ?? this.defaultPeriodEnd();

    const maxStudents = schedule.maxStudents;
    if (isGroup) {
      await this.verifyGroupCapacity(schedule.id, maxStudents);
    }

    const dayRows = schedule.days;
    const perDayCap = Math.max(1, Math.round(sessionCount / dayRows.length));
    for (const day of dayRows) {
      await this.recurringBookings.bookSeries(userId, `${day.id}:${from}`, {
        dateFrom: from,
        dateTo: to,
        subscriptionId,
        maxCount: perDayCap,
      });
    }
  }

  private async verifyGroupCapacity(scheduleId: string, maxStudents: number): Promise<void> {
    const dayRows = await this.prisma.teacherAvailability.findMany({
      where: { scheduleId, deletedAt: null },
      select: { id: true },
    });
    if (dayRows.length === 0) return;
    const availIds = dayRows.map((d) => d.id);
    const bookings = await this.prisma.liveBooking.count({
      where: {
        cancelledAt: null,
        session: { availabilitySlotId: { in: availIds } },
      },
    });
    if (bookings >= maxStudents) {
      throw new BadRequestException("Group is full");
    }
  }

  private defaultPeriodEnd(): string {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return end.toISOString().split("T")[0];
  }
}

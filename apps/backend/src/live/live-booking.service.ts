import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { LiveAvailabilityService } from "./live-availability.service";
import { BookingEngineService } from "./booking/booking-engine.service";
import { SESSION_INCLUDE } from "./live.constants";
import {
  LIVE_DOMAIN_EVENT_BUS,
  LIVE_BOOKING_EVENTS,
  type LiveDomainEventBus,
} from "./events";
import {
  LiveBookingStatusEnum,
  LiveBookingRescheduleStatusEnum,
} from "@el-bannawy/shared";

/**
 * LiveBookingService — controller-facing facade.
 *
 * Delegates booking, cancellation and participant-removal to the unified
 * BookingEngineService. Keeps the reschedule endpoints (M3, no engine split).
 * Slot -> session materialization is delegated to the Scheduling Engine
 * (LiveAvailabilityService.materializeSessionFromSlot). No seat allocation,
 * scheduling or subscription-counter logic lives here anymore.
 */
@Injectable()
export class LiveBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
    private readonly availability: LiveAvailabilityService,
    private readonly engine: BookingEngineService,
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
  ) {}

  async getMyBookings(userId: string): Promise<unknown[]> {
    return this.prisma.liveBooking.findMany({
      where: { studentId: userId, cancelledAt: null },
      take: 100,
      include: { session: { include: SESSION_INCLUDE } },
      orderBy: { createdAt: "desc" },
    });
  }

  async bookSession(
    userId: string,
    dto: { sessionId: string; subscriptionId?: string },
  ): Promise<unknown> {
    return this.engine.book(userId, dto);
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    role: string,
  ): Promise<{ id: string }> {
    return this.engine.cancelBooking(bookingId, userId, role);
  }

  async bookBySlot(
    userId: string,
    slotId: string,
    dto: { date: string; subscriptionId?: string },
  ): Promise<unknown> {
    const [availId, dateStr] = slotId.split(":");
    const session = await this.availability.materializeSessionFromSlot(availId, dateStr);
    return this.engine.book(userId, {
      sessionId: session.id,
      subscriptionId: dto.subscriptionId,
    });
  }

  async removeParticipant(
    sessionId: string,
    studentId: string,
    actorId: string,
    role: string,
  ): Promise<{ sessionId: string; studentId: string }> {
    return this.engine.removeParticipant(sessionId, studentId, actorId, role);
  }

  // ── Reschedule (PMS §7.4) — kept in the facade ─────────────────────────

  async requestReschedule(
    bookingId: string,
    userId: string,
    dto: { reason: string },
  ): Promise<unknown> {
    const booking = await this.prisma.liveBooking.findFirst({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.studentId !== userId) {
      throw new ForbiddenException("Not your booking");
    }
    if (booking.cancelledAt) {
      throw new BadRequestException("Cannot reschedule a cancelled booking");
    }
    const updated = await this.prisma.liveBooking.update({
      where: { id: bookingId },
      data: {
        rescheduleStatus: LiveBookingRescheduleStatusEnum.REQUESTED,
        rescheduleRequestedAt: new Date(),
        rescheduleReason: dto.reason,
      },
    });

    const session = await this.prisma.liveSession.findFirst({
      where: { id: booking.sessionId },
      select: { id: true, title: true, teacherId: true },
    });
    if (session) {
      await this.events.publish({
        type: LIVE_BOOKING_EVENTS.RESCHEDULE_REQUESTED,
        aggregateId: bookingId,
        occurredAt: new Date(),
        payload: {
          bookingId,
          sessionId: booking.sessionId,
          sessionTitle: session.title,
          teacherId: session.teacherId,
          studentId: userId,
          reason: dto.reason,
        },
      });
    }

    return updated;
  }

  async decideReschedule(
    bookingId: string,
    actorId: string,
    role: string,
    dto: { decision: LiveBookingRescheduleStatusEnum },
  ): Promise<unknown> {
    const booking = await this.prisma.liveBooking.findFirst({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");
    const session = await this.prisma.liveSession.findFirst({
      where: { id: booking.sessionId, deletedAt: null },
      select: { id: true, teacherId: true, title: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);
    if (booking.rescheduleStatus !== LiveBookingRescheduleStatusEnum.REQUESTED) {
      throw new BadRequestException("No pending reschedule request for this booking");
    }
    if (
      dto.decision !== LiveBookingRescheduleStatusEnum.APPROVED &&
      dto.decision !== LiveBookingRescheduleStatusEnum.REJECTED
    ) {
      throw new BadRequestException("Decision must be APPROVED or REJECTED");
    }

    const updateData: Record<string, unknown> = {
      rescheduleStatus: dto.decision,
      rescheduleResolvedAt: new Date(),
      rescheduleResolvedById: actorId,
    };

    if (dto.decision === LiveBookingRescheduleStatusEnum.APPROVED) {
      updateData.status = LiveBookingStatusEnum.RESCHEDULED;
    }

    const updated = await this.prisma.liveBooking.update({
      where: { id: bookingId },
      data: updateData,
    });

    await this.events.publish({
      type: LIVE_BOOKING_EVENTS.RESCHEDULE_RESOLVED,
      aggregateId: bookingId,
      occurredAt: new Date(),
      payload: {
        bookingId,
        sessionId: booking.sessionId,
        sessionTitle: session.title,
        teacherId: session.teacherId,
        studentId: booking.studentId,
        decision: dto.decision,
      },
    });

    return updated;
  }
}

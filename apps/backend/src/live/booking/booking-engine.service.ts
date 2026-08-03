import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LiveAccessService } from "../live-access.service";
import { LiveWaitingListService } from "../live-waitlist.service";
import { LiveSubscriptionService } from "../live-subscription.service";
import { SessionKindResolver } from "./session-kind.resolver";
import { BookingValidationService } from "./booking-validation.service";
import { ReservationService } from "./reservation.service";
import { RefundPolicyService } from "./refund-policy.service";
import type { BookingContext, BookingSessionSnapshot, BookingStudentSnapshot } from "./booking.types";
import type { Prisma } from "@prisma/client";
import { LiveSessionTypeEnum } from "@el-bannawy/shared";
import {
  LIVE_DOMAIN_EVENT_BUS,
  LIVE_BOOKING_EVENTS,
  type LiveDomainEventBus,
} from "../events";

/**
 * BookingEngineService — unified booking engine.
 *
 * Supports private-monthly, group, one-time and free sessions through one
 * pipeline:
 *   resolveSessionKind -> validate (V1-V9) -> reserve (ReservationService)
 *   -> consume (LiveSubscriptionService)
 *
 * Architectural constraints:
 *  - Never manipulates subscription counters directly (delegates to
 *    LiveSubscriptionService).
 *  - Never allocates seats directly (delegates to ReservationService).
 *  - Reads policy only through ports (RefundPolicyService).
 */
@Injectable()
export class BookingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
    @Inject(forwardRef(() => LiveWaitingListService))
    private readonly waitlist: LiveWaitingListService,
    private readonly subscriptions: LiveSubscriptionService,
    private readonly kindResolver: SessionKindResolver,
    private readonly validation: BookingValidationService,
    private readonly reservation: ReservationService,
    private readonly refundPolicy: RefundPolicyService,
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
  ) {}

  async book(
    userId: string,
    dto: { sessionId: string; subscriptionId?: string },
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const session = await this.loadSession(tx, dto.sessionId);
      const student = await this.loadStudent(tx, userId);
      const activeSubscriptionTypes = await this.subscriptions.getActiveTypesForTeacherTx(
        tx,
        student.id,
        session.teacherId,
      );
      const kind = this.kindResolver.resolve(
        session.type as LiveSessionTypeEnum,
        activeSubscriptionTypes,
      );

      const context: BookingContext = {
        session,
        student,
        now: new Date(),
        activeSubscriptionTypes,
        kind,
      };

      const validationResult = await this.validation.validateBooking(tx, context);
      if (!validationResult.ok) {
        throw new BadRequestException(validationResult.reason);
      }

      const reservation = await this.reservation.reserve(tx, {
        sessionId: dto.sessionId,
        studentId: userId,
        subscriptionId: dto.subscriptionId ?? null,
      });

      if (reservation.subscriptionId) {
        await this.subscriptions.consume(tx, reservation.subscriptionId, {
          sessionId: dto.sessionId,
        });
      }

      const booking = await this.prisma.liveBooking.findUnique({
        where: { id: reservation.id },
        include: { session: true },
      });
      if (!booking) throw new NotFoundException("Booking not found");

      await this.events.publish({
        type: LIVE_BOOKING_EVENTS.CREATED,
        aggregateId: booking.id,
        occurredAt: new Date(),
        payload: {
          bookingId: booking.id,
          sessionId: booking.sessionId,
          sessionTitle: booking.session.title,
          teacherId: booking.session.teacherId,
          studentId: userId,
          sessionStartTime: booking.session.startTime,
          bookingKind: kind,
        },
      });

      return { ...booking, bookingKind: kind };
    });
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    role: string,
  ): Promise<{ id: string }> {
    const booking = await this.prisma.liveBooking.findFirst({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (role === "STUDENT" && booking.studentId !== userId) {
      throw new BadRequestException("Not your booking");
    }

    const session = await this.prisma.liveSession.findFirst({
      where: { id: booking.sessionId },
      select: { id: true, teacherId: true, startTime: true, title: true },
    });
    if (!session) throw new NotFoundException("Session not found");

    if (role === "TEACHER" && session.teacherId !== userId) {
      throw new ForbiddenException("Not your session");
    }
    if (role === "SECRETARY") {
      throw new ForbiddenException("Secretary cannot cancel bookings");
    }

    const refundEligible = this.refundPolicy.isRefundEligible(session.startTime, new Date());

    await this.prisma.$transaction(async (tx) => {
      if (refundEligible && booking.subscriptionId && booking.cancelledAt === null) {
        await this.subscriptions.creditBack(tx, booking.subscriptionId, {
          sessionId: booking.sessionId,
        });
      }
      await this.reservation.release(tx, bookingId, booking.sessionId, "Cancelled by user");
    });
    await this.waitlist.promoteNext(booking.sessionId, session.teacherId);

    await this.events.publish({
      type: LIVE_BOOKING_EVENTS.CANCELLED,
      aggregateId: bookingId,
      occurredAt: new Date(),
      payload: {
        bookingId,
        sessionId: booking.sessionId,
        sessionTitle: session.title,
        teacherId: session.teacherId,
        studentId: booking.studentId,
        cancelledBy: userId,
      },
    });

    return { id: bookingId };
  }

  async removeParticipant(
    sessionId: string,
    studentId: string,
    actorId: string,
    role: string,
  ): Promise<{ sessionId: string; studentId: string }> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true, startTime: true, title: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);

    const booking = await this.prisma.liveBooking.findFirst({
      where: { sessionId, studentId },
    });
    if (booking) {
      const refundEligible = this.refundPolicy.isRefundEligible(session.startTime, new Date());
      await this.prisma.$transaction(async (tx) => {
        if (refundEligible && booking.subscriptionId && booking.cancelledAt === null) {
          await this.subscriptions.creditBack(tx, booking.subscriptionId, {
            sessionId,
          });
        }
        await this.reservation.release(tx, booking.id, sessionId, "Removed by teacher");
      });
      await this.waitlist.promoteNext(sessionId, session.teacherId);

      await this.events.publish({
        type: LIVE_BOOKING_EVENTS.CANCELLED,
        aggregateId: booking.id,
        occurredAt: new Date(),
        payload: {
          bookingId: booking.id,
          sessionId,
          sessionTitle: session.title,
          teacherId: session.teacherId,
          studentId: booking.studentId,
          cancelledBy: actorId,
        },
      });
    }
    return { sessionId, studentId };
  }

  private async loadSession(tx: Prisma.TransactionClient, sessionId: string): Promise<BookingSessionSnapshot> {
    const session = await tx.liveSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        teacherId: true,
        gradeId: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        availableSeats: true,
        availabilitySlotId: true,
      },
    });
    if (!session) throw new NotFoundException("Session not found");
    return session;
  }

  private async loadStudent(tx: Prisma.TransactionClient, userId: string): Promise<BookingStudentSnapshot> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, gradeId: true },
    });
    if (!user) throw new NotFoundException("Student not found");
    return user;
  }
}

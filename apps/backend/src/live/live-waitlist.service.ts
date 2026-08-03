import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { BookingEngineService } from "./booking/booking-engine.service";
import { SESSION_INCLUDE } from "./live.constants";
import { LiveWaitingListStatusEnum } from "@el-bannawy/shared";
import {
  LIVE_DOMAIN_EVENT_BUS,
  LIVE_WAITLIST_EVENTS,
  type LiveDomainEventBus,
} from "./events";

/** Upper bound on promotion attempts per freed seat (skips ineligible students). */
const PROMOTION_ATTEMPT_LIMIT = 5;

/**
 * LiveWaitingListService — PMS §7.3.
 *
 * Students join the waiting list when a session is full. When a seat is
 * released (booking cancelled or participant removed) the first WAITING
 * entry is auto-promoted. Promotion ALWAYS goes through BookingEngineService
 * (full V1–V9 validation + seat reservation + subscription consumption), so
 * a promoted student can never bypass the Booking Engine.
 */
@Injectable()
export class LiveWaitingListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LiveAccessService,
    @Inject(forwardRef(() => BookingEngineService))
    private readonly bookingEngine: BookingEngineService,
    @Inject(LIVE_DOMAIN_EVENT_BUS) private readonly events: LiveDomainEventBus,
  ) {}

  async join(
    userId: string,
    sessionId: string,
  ): Promise<unknown> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, availableSeats: true },
    });
    if (!session) throw new NotFoundException("Session not found");

    const booking = await this.prisma.liveBooking.findFirst({
      where: { sessionId, studentId: userId, cancelledAt: null },
      select: { id: true },
    });
    if (booking) {
      throw new BadRequestException("Already booked for this session");
    }

    const existing = await this.prisma.liveWaitingList.findFirst({
      where: { sessionId, studentId: userId, status: LiveWaitingListStatusEnum.WAITING },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Already on the waiting list");
    }

    const position =
      (await this.prisma.liveWaitingList.count({
        where: { sessionId, status: LiveWaitingListStatusEnum.WAITING },
      })) + 1;

    const created = await this.prisma.liveWaitingList.create({
      data: {
        sessionId,
        studentId: userId,
        status: LiveWaitingListStatusEnum.WAITING,
        position,
      },
      include: { session: { include: SESSION_INCLUDE } },
    });

    await this.events.publish({
      type: LIVE_WAITLIST_EVENTS.JOINED,
      aggregateId: created.id,
      occurredAt: new Date(),
      payload: {
        waitlistId: created.id,
        sessionId,
        sessionTitle: created.session.title,
        teacherId: created.session.teacherId,
        studentId: userId,
        position,
      },
    });

    return created;
  }

  async leave(
    userId: string,
    sessionId: string,
  ): Promise<{ id: string }> {
    const entry = await this.prisma.liveWaitingList.findFirst({
      where: { sessionId, studentId: userId, status: LiveWaitingListStatusEnum.WAITING },
    });
    if (!entry) throw new NotFoundException("Waiting list entry not found");

    await this.prisma.liveWaitingList.update({
      where: { id: entry.id },
      data: {
        status: LiveWaitingListStatusEnum.CANCELLED,
        cancelledAt: new Date(),
      },
    });
    return { id: entry.id };
  }

  async getMyEntries(userId: string): Promise<unknown[]> {
    return this.prisma.liveWaitingList.findMany({
      where: { studentId: userId },
      take: 100,
      include: { session: { include: SESSION_INCLUDE } },
      orderBy: { joinedAt: "desc" },
    });
  }

  async getSessionEntries(
    sessionId: string,
    actorId: string,
    role: string,
  ): Promise<unknown[]> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    this.access.assertSessionOwner(session, actorId, role);

    return this.prisma.liveWaitingList.findMany({
      where: { sessionId, status: LiveWaitingListStatusEnum.WAITING },
      include: { student: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      orderBy: [{ position: "asc" }, { joinedAt: "asc" }],
    });
  }

  /**
   * Promote the next eligible WAITING entry for a session by routing it
   * through the Booking Engine. The engine re-validates capacity, booking
   * eligibility, subscription entitlement and teacher ownership; students who
   * no longer qualify are skipped (up to PROMOTION_ATTEMPT_LIMIT per call).
   */
  async promoteNext(sessionId: string, teacherId: string): Promise<boolean> {
    const waiters = await this.prisma.liveWaitingList.findMany({
      where: { sessionId, status: LiveWaitingListStatusEnum.WAITING },
      orderBy: [{ position: "asc" }, { joinedAt: "asc" }],
      take: PROMOTION_ATTEMPT_LIMIT,
      select: { id: true, studentId: true },
    });
    if (waiters.length === 0) return false;

    for (const waiter of waiters) {
      let booking: { id: string } | null;
      try {
        booking = (await this.bookingEngine.book(waiter.studentId, { sessionId })) as { id: string };
      } catch {
        // Student is no longer eligible — try the next waiting entry.
        continue;
      }

      await this.prisma.liveWaitingList.update({
        where: { id: waiter.id },
        data: { status: LiveWaitingListStatusEnum.PROMOTED, promotedAt: new Date() },
      });

      const session = await this.prisma.liveSession.findUnique({
        where: { id: sessionId },
        select: { title: true, teacherId: true },
      });

      await this.events.publish({
        type: LIVE_WAITLIST_EVENTS.PROMOTED,
        aggregateId: waiter.id,
        occurredAt: new Date(),
        payload: {
          waitlistId: waiter.id,
          bookingId: booking.id,
          sessionId,
          sessionTitle: session?.title ?? "جلسة مباشرة",
          teacherId: session?.teacherId ?? teacherId,
          studentId: waiter.studentId,
        },
      });

      return true;
    }

    return false;
  }
}

import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { LiveBookingStatusEnum } from "@el-bannawy/shared";

/**
 * ReservationService — the single owner of seat allocation.
 *
 * No other service may update `liveSession.availableSeats` or reservation
 * (LiveBooking) state. All seat reserve/release and booking lifecycle writes
 * go through this service, always inside the caller's transaction.
 */
@Injectable()
export class ReservationService {
  /**
   * Atomically reserve one seat. Throws when the session is full.
   * Returns the resulting (possibly re-confirmed) booking.
   */
  async reserve(
    tx: Prisma.TransactionClient,
    input: {
      sessionId: string;
      studentId: string;
      subscriptionId?: string | null;
    },
  ): Promise<{ id: string; subscriptionId: string | null }> {
    const updateResult = await tx.liveSession.updateMany({
      where: { id: input.sessionId, availableSeats: { gt: 0 } },
      data: { availableSeats: { decrement: 1 } },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException("Session is full");
    }

    return tx.liveBooking.upsert({
      where: { sessionId_studentId: { sessionId: input.sessionId, studentId: input.studentId } },
      create: {
        sessionId: input.sessionId,
        studentId: input.studentId,
        subscriptionId: input.subscriptionId ?? null,
        status: LiveBookingStatusEnum.CONFIRMED,
      },
      update: {
        status: LiveBookingStatusEnum.CONFIRMED,
        cancelledAt: null,
        cancelReason: null,
        subscriptionId: input.subscriptionId ?? null,
        rescheduleStatus: null,
        rescheduleRequestedAt: null,
        rescheduleReason: null,
      },
      select: { id: true, subscriptionId: true },
    });
  }

  /** Release one seat without changing the booking row (waitlist-only consume). */
  async consumeFreedSeat(tx: Prisma.TransactionClient, sessionId: string): Promise<void> {
    await tx.liveSession.updateMany({
      where: { id: sessionId },
      data: { availableSeats: { decrement: 1 } },
    });
  }

  /** Mark a booking cancelled and return the freed seat. */
  async release(
    tx: Prisma.TransactionClient,
    bookingId: string,
    sessionId: string,
    cancelReason: string,
  ): Promise<void> {
    await tx.liveBooking.update({
      where: { id: bookingId },
      data: {
        status: LiveBookingStatusEnum.CANCELLED,
        cancelledAt: new Date(),
        cancelReason,
      },
    });
    await tx.liveSession.updateMany({
      where: { id: sessionId },
      data: { availableSeats: { increment: 1 } },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { LiveWaitingListStatusEnum, LiveSubscriptionTypeEnum, LiveSessionStatusEnum, LiveSessionKindEnum } from "@el-bannawy/shared";
import type { Prisma } from "@prisma/client";
import { VALIDATION_OK, fail, type BookingContext, type BookingStudentSnapshot, type ValidationResult } from "./booking.types";const BOOKABLE_STATUSES: string[] = ["PUBLISHED", "SCHEDULED", "OPEN"];
const TERMINAL_STATUSES: readonly LiveSessionStatusEnum[] = [
  LiveSessionStatusEnum.CANCELLED,
  LiveSessionStatusEnum.COMPLETED,
  LiveSessionStatusEnum.ARCHIVED,
  LiveSessionStatusEnum.DRAFT,
];

/**
 * BookingValidationService — stateless validation matrix for the booking engine.
 *
 * Every check returns a typed result and never writes. DB-backed checks accept
 * a Prisma transaction client so they run inside the same transaction as the
 * seat reservation (no TOCTOU).
 *
 * Matrix: V1 capacity, V2 duplicate, V3 overlap, V4 subscription status,
 * V5 waiting list, V6 booking window, V7 eligibility, V8 cancel/refund
 * (RefundPolicyService), V9 teacher availability.
 */
@Injectable()
export class BookingValidationService {

  // ── V1: Capacity ────────────────────────────────────────────────────────
  validateCapacity(context: BookingContext): ValidationResult {
    if (context.session.availableSeats === null) {
      return fail("Session has no seat capacity configured");
    }
    if (context.session.availableSeats <= 0) {
      return fail("Session is full");
    }
    return VALIDATION_OK;
  }

  // ── V2: Duplicate booking ───────────────────────────────────────────────
  async validateDuplicate(tx: Prisma.TransactionClient, context: BookingContext): Promise<ValidationResult> {
    const existing = await tx.liveBooking.findFirst({
      where: { sessionId: context.session.id, studentId: context.student.id },
      select: { id: true, cancelledAt: true },
    });
    if (existing?.cancelledAt === null) {
      return fail("You are already booked for this session");
    }
    return VALIDATION_OK;
  }

  // ── V3: Overlapping booking ─────────────────────────────────────────────
  async validateOverlap(tx: Prisma.TransactionClient, context: BookingContext): Promise<ValidationResult> {
    const overlap = await tx.liveBooking.findFirst({
      where: {
        studentId: context.student.id,
        cancelledAt: null,
        session: {
          teacherId: context.session.teacherId,
          id: { not: context.session.id },
          deletedAt: null,
          status: { notIn: [...TERMINAL_STATUSES] },
          startTime: { lt: context.session.endTime },
          endTime: { gt: context.session.startTime },
        },
      },
      select: { id: true },
    });
    if (overlap) {
      return fail("Conflicts with another booking in the same time window");
    }
    return VALIDATION_OK;
  }

  // ── V4: Subscription status ─────────────────────────────────────────────
  validateSubscription(context: BookingContext): ValidationResult {
    if (context.kind === LiveSessionKindEnum.FREE) {
      return VALIDATION_OK;
    }
    if (context.activeSubscriptionTypes.length === 0) {
      return fail("No active subscription for this session type");
    }
    if (
      context.kind === LiveSessionKindEnum.PRIVATE_MONTHLY &&
      !context.activeSubscriptionTypes.includes(LiveSubscriptionTypeEnum.PRIVATE_MONTHLY)
    ) {
      return fail("No active private-monthly subscription");
    }
    if (
      context.kind === LiveSessionKindEnum.GROUP &&
      !context.activeSubscriptionTypes.includes(LiveSubscriptionTypeEnum.GROUP_MONTHLY)
    ) {
      return fail("No active group subscription");
    }
    if (
      context.kind === LiveSessionKindEnum.ONE_TIME &&
      !context.activeSubscriptionTypes.includes(LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE)
    ) {
      return fail("No one-time session credit available");
    }
    return VALIDATION_OK;
  }

  // ── V5: Waiting list ────────────────────────────────────────────────────
  async validateWaitingListJoin(tx: Prisma.TransactionClient, context: BookingContext): Promise<ValidationResult> {
    const [booking, existing] = await Promise.all([
      tx.liveBooking.findFirst({
        where: { sessionId: context.session.id, studentId: context.student.id, cancelledAt: null },
        select: { id: true },
      }),
      tx.liveWaitingList.findFirst({
        where: { sessionId: context.session.id, studentId: context.student.id, status: LiveWaitingListStatusEnum.WAITING },
        select: { id: true },
      }),
    ]);
    if (booking) return fail("Already booked for this session");
    if (existing) return fail("Already on the waiting list");
    if (context.session.availableSeats !== null && context.session.availableSeats > 0) {
      return fail("Seats are available; no need to join the waiting list");
    }
    return VALIDATION_OK;
  }

  // ── V6: Booking window ──────────────────────────────────────────────────
  validateBookingWindow(context: BookingContext): ValidationResult {
    const status = context.session.status;
    if (!BOOKABLE_STATUSES.includes(status)) {
      return fail("Session is not bookable in its current state");
    }
    if (context.now >= context.session.endTime) {
      return fail("Session has already ended");
    }
    return VALIDATION_OK;
  }

  // ── V7: Eligibility ─────────────────────────────────────────────────────
  validateEligibility(context: BookingContext, student?: BookingStudentSnapshot): ValidationResult {
    const s = student ?? context.student;
    if (context.session.gradeId && s.gradeId && context.session.gradeId !== s.gradeId) {
      return fail("Not eligible for this session grade");
    }
    return VALIDATION_OK;
  }

  // ── V9: Teacher availability ────────────────────────────────────────────
  /**
   * Booking must fail if the teacher or the availability slot is unavailable,
   * even when seats remain. Checks active date blocks and a soft-deleted
   * availability slot.
   */
  async validateTeacherAvailability(tx: Prisma.TransactionClient, context: BookingContext): Promise<ValidationResult> {
    const dateStr = context.session.date.toISOString().split("T")[0];
    const dateBlock = await tx.teacherDateBlock.findFirst({
      where: { teacherId: context.session.teacherId, deletedAt: null },
      select: { id: true, blockedDate: true },
    });
    const slot = context.session.availabilitySlotId
      ? await tx.teacherAvailability.findFirst({
          where: { id: context.session.availabilitySlotId, deletedAt: null },
          select: { id: true },
        })
      : null;
    if (dateBlock?.blockedDate.toISOString().split("T")[0] === dateStr) {
      return fail("Teacher is unavailable on this date");
    }
    if (context.session.availabilitySlotId && !slot) {
      return fail("Availability slot is no longer available");
    }
    return VALIDATION_OK;
  }

  // ── Aggregate: booking preflight ────────────────────────────────────────
  async validateBooking(tx: Prisma.TransactionClient, context: BookingContext): Promise<ValidationResult> {
    const capacity = this.validateCapacity(context);
    if (!capacity.ok) return capacity;
    const duplicate = await this.validateDuplicate(tx, context);
    if (!duplicate.ok) return duplicate;
    const overlap = await this.validateOverlap(tx, context);
    if (!overlap.ok) return overlap;
    const subscription = this.validateSubscription(context);
    if (!subscription.ok) return subscription;
    const window = this.validateBookingWindow(context);
    if (!window.ok) return window;
    const eligibility = this.validateEligibility(context);
    if (!eligibility.ok) return eligibility;
    const teacherAvailability = await this.validateTeacherAvailability(tx, context);
    if (!teacherAvailability.ok) return teacherAvailability;
    return VALIDATION_OK;
  }
}

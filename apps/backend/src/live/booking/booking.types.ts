import type { LiveSessionKindEnum, LiveSessionStatusEnum, LiveSessionTypeEnum, LiveSubscriptionTypeEnum } from "@el-bannawy/shared";

/**
 * BookingContext — immutable snapshot of everything the booking pipeline needs
 * to validate a booking/cancel without extra reads.
 */
export interface BookingSessionSnapshot {
  readonly id: string;
  readonly teacherId: string;
  readonly gradeId: string | null;
  readonly date: Date;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly status: LiveSessionStatusEnum | string;
  readonly type: LiveSessionTypeEnum | string;
  readonly availableSeats: number | null;
  readonly availabilitySlotId: string | null;
}

export interface BookingStudentSnapshot {
  readonly id: string;
  readonly role: string;
  readonly gradeId: string | null;
}

export interface BookingContext {
  readonly session: BookingSessionSnapshot;
  readonly student: BookingStudentSnapshot;
  readonly now: Date;
  /** Active (non-expired) subscription types the student holds for the teacher. */
  readonly activeSubscriptionTypes: readonly LiveSubscriptionTypeEnum[];
  /** Resolved booking kind (precomputed by SessionKindResolver). */
  readonly kind: LiveSessionKindEnum;
}

export type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export const VALIDATION_OK: ValidationResult = { ok: true };

export function fail(reason: string): ValidationResult {
  return { ok: false, reason };
}

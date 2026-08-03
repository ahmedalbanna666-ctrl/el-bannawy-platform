/**
 * LivePolicyEngine — port for live-class policy decisions.
 *
 * Domain services (LiveBookingService) depend on this interface, never on a
 * concrete policy source. The bootstrap implementation ships temporary
 * defaults; a persisted policy store can replace it later without touching
 * business logic.
 */

/** DI token for the LivePolicyEngine implementation. */
export const LIVE_POLICY_ENGINE = Symbol("LIVE_POLICY_ENGINE");

/** When a subscription session is consumed against `sessionsUsed`. */
export type LiveSessionConsumptionTiming = "CONSUME_ON_BOOKING" | "CONSUME_ON_ATTENDANCE";

/** Refund/credit level granted for a cancelled booking. */
export type LiveRefundCreditLevel = "FULL_CREDIT" | "NO_CREDIT";

export interface LiveCancellationRefundPolicy {
  /** Cutoff window in hours before the session starts. */
  readonly cutoffHours: number;
  /** Credit level when cancelled before the cutoff window. */
  readonly beforeCutoff: LiveRefundCreditLevel;
  /** Credit level when cancelled inside the cutoff window (before start). */
  readonly afterCutoff: LiveRefundCreditLevel;
  /** Credit level when cancelled after the session started. */
  readonly afterStart: LiveRefundCreditLevel;
}

/** Attendance policy — how a session's attendance record is finalized. */
export interface LiveAttendancePolicy {
  /** Minimum attendance duration (minutes) for the status to be COMPLETED. */
  readonly minCompletedMinutes: number;
}

export interface LivePolicyEngine {
  getSessionConsumptionTiming(): LiveSessionConsumptionTiming;
  getCancellationRefundPolicy(): LiveCancellationRefundPolicy;
  getAttendancePolicy(): LiveAttendancePolicy;
}

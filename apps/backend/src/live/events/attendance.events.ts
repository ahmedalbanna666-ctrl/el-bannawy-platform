import type { LiveDomainEvent } from "./domain-event.interface";

/** Discriminated events emitted by the attendance domain. */

export const LIVE_ATTENDANCE_EVENTS = {
  RECORDED: "attendance.recorded",
  FINALIZED: "attendance.finalized",
} as const;

export interface AttendanceRecordedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_ATTENDANCE_EVENTS.RECORDED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly attendanceId: string;
    readonly sessionId: string;
    readonly studentId: string;
    readonly status: string;
    readonly markedBy: string;
  };
}

export interface AttendanceFinalizedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_ATTENDANCE_EVENTS.FINALIZED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly attendanceId: string;
    readonly sessionId: string;
    readonly studentId: string;
    readonly status: string;
    readonly durationMinutes: number;
  };
}

export type LiveAttendanceDomainEvent = AttendanceRecordedEvent | AttendanceFinalizedEvent;

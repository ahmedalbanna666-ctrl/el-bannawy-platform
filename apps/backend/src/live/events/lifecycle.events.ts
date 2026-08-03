import type { LiveDomainEvent } from "./domain-event.interface";

/** Discriminated events emitted by the booking / session / waitlist domains. */

export const LIVE_BOOKING_EVENTS = {
  CREATED: "booking.created",
  CANCELLED: "booking.cancelled",
  RESCHEDULE_REQUESTED: "booking.rescheduleRequested",
  RESCHEDULE_RESOLVED: "booking.rescheduleResolved",
} as const;

export const LIVE_SESSION_EVENTS = {
  STARTED: "session.started",
  ENDED: "session.ended",
  CANCELLED: "session.cancelled",
} as const;

export const LIVE_WAITLIST_EVENTS = {
  JOINED: "waitlist.joined",
  PROMOTED: "waitlist.promoted",
} as const;

export interface BookingCreatedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_BOOKING_EVENTS.CREATED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly bookingId: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
    readonly studentId: string;
    readonly sessionStartTime: Date;
    readonly bookingKind: string;
  };
}

export interface BookingCancelledEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_BOOKING_EVENTS.CANCELLED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly bookingId: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
    readonly studentId: string;
    readonly cancelledBy: string;
  };
}

export interface RescheduleRequestedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_BOOKING_EVENTS.RESCHEDULE_REQUESTED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly bookingId: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
    readonly studentId: string;
    readonly reason: string;
  };
}

export interface RescheduleResolvedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_BOOKING_EVENTS.RESCHEDULE_RESOLVED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly bookingId: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
    readonly studentId: string;
    readonly decision: string;
  };
}

export interface SessionStartedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SESSION_EVENTS.STARTED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
  };
}

export interface SessionEndedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SESSION_EVENTS.ENDED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
  };
}

export interface SessionCancelledEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SESSION_EVENTS.CANCELLED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
  };
}

export interface WaitlistJoinedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_WAITLIST_EVENTS.JOINED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly waitlistId: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
    readonly studentId: string;
    readonly position: number;
  };
}

export interface WaitlistPromotedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_WAITLIST_EVENTS.PROMOTED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly waitlistId: string;
    readonly bookingId: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly teacherId: string;
    readonly studentId: string;
  };
}

export type LiveBookingDomainEvent =
  | BookingCreatedEvent
  | BookingCancelledEvent
  | RescheduleRequestedEvent
  | RescheduleResolvedEvent;

export type LiveSessionDomainEvent =
  | SessionStartedEvent
  | SessionEndedEvent
  | SessionCancelledEvent;

export type LiveWaitlistDomainEvent = WaitlistJoinedEvent | WaitlistPromotedEvent;

export type LiveLifecycleDomainEvent =
  | LiveBookingDomainEvent
  | LiveSessionDomainEvent
  | LiveWaitlistDomainEvent;

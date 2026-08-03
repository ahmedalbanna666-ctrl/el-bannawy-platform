import type { LiveDomainEvent } from "./domain-event.interface";

/** Discriminated events emitted by the subscription domain. */

export const LIVE_SUBSCRIPTION_EVENTS = {
  CREATED: "subscription.created",
  CONSUMED: "subscription.consumed",
  CREDITED_BACK: "subscription.creditedBack",
  EXHAUSTED: "subscription.exhausted",
  RENEWED: "subscription.renewed",
  EXPIRED: "subscription.expired",
  STATUS_CHANGED: "subscription.statusChanged",
} as const;

export interface SubscriptionCreatedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.CREATED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
    readonly teacherId: string;
    readonly type: string;
    readonly sessionsTotal: number;
    readonly periodEnd: Date;
  };
}

export interface SubscriptionConsumedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.CONSUMED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
    readonly sessionId?: string;
    readonly used: number;
    readonly total: number;
    readonly remaining: number;
  };
}

export interface SubscriptionCreditedBackEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.CREDITED_BACK;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
    readonly sessionId?: string;
    readonly used: number;
    readonly total: number;
    readonly remaining: number;
  };
}

export interface SubscriptionExhaustedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.EXHAUSTED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
    readonly total: number;
  };
}

export interface SubscriptionRenewedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.RENEWED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
    readonly type: string;
    readonly periodStart: Date;
    readonly periodEnd: Date;
  };
}

export interface SubscriptionExpiredEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.EXPIRED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
  };
}

export interface SubscriptionStatusChangedEvent extends LiveDomainEvent {
  readonly type: typeof LIVE_SUBSCRIPTION_EVENTS.STATUS_CHANGED;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: {
    readonly subscriptionId: string;
    readonly userId: string;
    readonly from: string;
    readonly to: string;
  };
}

export type LiveSubscriptionDomainEvent =
  | SubscriptionCreatedEvent
  | SubscriptionConsumedEvent
  | SubscriptionCreditedBackEvent
  | SubscriptionExhaustedEvent
  | SubscriptionRenewedEvent
  | SubscriptionExpiredEvent
  | SubscriptionStatusChangedEvent;

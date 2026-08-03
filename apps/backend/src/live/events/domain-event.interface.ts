/**
 * LiveDomainEventBus — port for in-process domain events.
 *
 * The live domain emits domain events when its aggregate state changes
 * (subscription consumed/credited/exhausted/renewed, attendance recorded, etc).
 * Domain services publish events through this interface; side effects
 * (notifications, analytics, scheduling) subscribe as listeners. Publishing
 * never breaks the transaction that produced the event: listeners run after
 * the event is emitted and errors are contained by the bus.
 */

/** Base contract every live domain event must satisfy. */
export interface LiveDomainEvent {
  readonly type: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type LiveDomainEventHandler = (event: LiveDomainEvent) => void | Promise<void>;

export interface LiveDomainEventSubscription {
  unsubscribe(): void;
}

/** DI token for the LiveDomainEventBus implementation. */
export const LIVE_DOMAIN_EVENT_BUS = Symbol("LIVE_DOMAIN_EVENT_BUS");

export interface LiveDomainEventBus {
  publish(event: LiveDomainEvent): Promise<void>;
  subscribe(
    type: string,
    handler: LiveDomainEventHandler,
  ): LiveDomainEventSubscription;
}

import { Injectable, Logger } from "@nestjs/common";
import type {
  LiveDomainEvent,
  LiveDomainEventBus,
  LiveDomainEventHandler,
  LiveDomainEventSubscription,
} from "./domain-event.interface";

/**
 * InProcessDomainEventBus — synchronous, in-process implementation of the
 * LiveDomainEventBus port.
 *
 * Handlers are invoked after the event is produced. Each handler runs
 * sequentially; an error in one handler is logged and never propagates to the
 * publisher, so domain-side effects cannot break the originating transaction.
 */
@Injectable()
export class InProcessDomainEventBus implements LiveDomainEventBus {
  private readonly logger = new Logger(InProcessDomainEventBus.name);
  private readonly handlers = new Map<string, Set<LiveDomainEventHandler>>();

  async publish(event: LiveDomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) return;
    for (const handler of [...handlers]) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Domain event handler failed for "${event.type}": ${error instanceof Error ? error.message : String(error)}`,
          "InProcessDomainEventBus",
        );
      }
    }
  }

  subscribe(type: string, handler: LiveDomainEventHandler): LiveDomainEventSubscription {
    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(type, handlers);
    }
    handlers.add(handler);
    return {
      unsubscribe: (): void => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(type);
        }
      },
    };
  }
}

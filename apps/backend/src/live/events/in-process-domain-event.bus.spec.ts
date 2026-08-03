import { InProcessDomainEventBus } from "./in-process-domain-event.bus";
import type { LiveDomainEvent } from "./domain-event.interface";

function makeEvent(type: string): LiveDomainEvent {
  return { type, aggregateId: "sub1", occurredAt: new Date(), payload: {} };
}

describe("InProcessDomainEventBus", () => {
  let bus: InProcessDomainEventBus;

  beforeEach(() => {
    bus = new InProcessDomainEventBus();
  });

  it("invokes handlers for the published event type", async () => {
    const handler = jest.fn();
    bus.subscribe("subscription.consumed", handler);
    await bus.publish(makeEvent("subscription.consumed"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not invoke handlers for other event types", async () => {
    const handler = jest.fn();
    bus.subscribe("subscription.consumed", handler);
    await bus.publish(makeEvent("subscription.exhausted"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribes a handler", async () => {
    const handler = jest.fn();
    const sub = bus.subscribe("subscription.consumed", handler);
    sub.unsubscribe();
    await bus.publish(makeEvent("subscription.consumed"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("contains handler errors without throwing to the publisher", async () => {
    const failing = jest.fn().mockRejectedValue(new Error("boom"));
    const ok = jest.fn();
    bus.subscribe("subscription.consumed", failing);
    bus.subscribe("subscription.consumed", ok);
    await expect(bus.publish(makeEvent("subscription.consumed"))).resolves.toBeUndefined();
    expect(ok).toHaveBeenCalledTimes(1);
  });
});

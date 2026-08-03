import { Test, type TestingModule } from "@nestjs/testing";
import { SubscriptionPeriodEndProcessor } from "./subscription-period-end.processor";
import { LiveSubscriptionService } from "./live-subscription.service";
import { SUBSCRIPTION_PERIOD_END_JOB } from "./live-subscription-scheduler.service";

describe("SubscriptionPeriodEndProcessor", () => {
  let processor: SubscriptionPeriodEndProcessor;
  let subscriptions: { processPeriodEnd: jest.Mock };

  beforeEach(async () => {
    subscriptions = {
      processPeriodEnd: jest.fn().mockResolvedValue({ renewed: 2, expired: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPeriodEndProcessor,
        { provide: LiveSubscriptionService, useValue: subscriptions },
      ],
    }).compile();

    processor = module.get<SubscriptionPeriodEndProcessor>(SubscriptionPeriodEndProcessor);
  });

  it("runs the period-end sweep for its own job name", async () => {
    const result = await processor.process({ name: SUBSCRIPTION_PERIOD_END_JOB } as never);
    expect(subscriptions.processPeriodEnd).toHaveBeenCalled();
    expect(result).toEqual({ renewed: 2, expired: 1 });
  });

  it("skips unrelated jobs", async () => {
    const result = await processor.process({ name: "other-job" } as never);
    expect(subscriptions.processPeriodEnd).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: true });
  });
});

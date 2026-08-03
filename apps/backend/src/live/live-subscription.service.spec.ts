import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { LiveSubscriptionService } from "./live-subscription.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  LIVE_DOMAIN_EVENT_BUS,
  LIVE_SUBSCRIPTION_EVENTS,
  type LiveDomainEventBus,
} from "./events";
import {
  LiveSubscriptionStatusEnum,
  LiveSubscriptionTypeEnum,
  LiveSessionKindEnum,
} from "@el-bannawy/shared";
import type { Prisma } from "@prisma/client";

function makeTxClient(prisma: {
  liveSubscription: {
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
}): Prisma.TransactionClient {
  return { liveSubscription: prisma.liveSubscription } as unknown as Prisma.TransactionClient;
}

describe("LiveSubscriptionService (subscription engine)", () => {
  let service: LiveSubscriptionService;
  let prisma: {
    liveSubscription: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let events: { publish: jest.Mock };

  const now = new Date();

  beforeEach(async () => {
    prisma = {
      liveSubscription: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: "t1" }) },
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSubscriptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: LIVE_DOMAIN_EVENT_BUS, useValue: events },
      ],
    }).compile();
    service = module.get<LiveSubscriptionService>(LiveSubscriptionService);
  });

  describe("consume (single owner)", () => {
    it("increments and emits CONSUMED with remaining counters", async () => {
      prisma.liveSubscription.updateMany.mockResolvedValue({ count: 1 });
      prisma.liveSubscription.findUnique.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        sessionsTotal: 4,
        sessionsUsed: 1,
      });

      const result = await service.consume(makeTxClient(prisma), "sub1", { sessionId: "s1" });

      expect(result).toBe(true);
      expect(prisma.liveSubscription.updateMany).toHaveBeenCalledWith({
        where: { id: "sub1", status: LiveSubscriptionStatusEnum.ACTIVE },
        data: { sessionsUsed: { increment: 1 } },
      });
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LIVE_SUBSCRIPTION_EVENTS.CONSUMED,
          aggregateId: "sub1",
          payload: expect.objectContaining({
            subscriptionId: "sub1",
            userId: "u1",
            sessionId: "s1",
            used: 1,
            total: 4,
            remaining: 3,
          }),
        }),
      );
    });

    it("emits EXHAUSTED when the counter reaches the total", async () => {
      prisma.liveSubscription.updateMany.mockResolvedValue({ count: 1 });
      prisma.liveSubscription.findUnique.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        sessionsTotal: 1,
        sessionsUsed: 1,
      });

      await service.consume(makeTxClient(prisma), "sub1");

      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: LIVE_SUBSCRIPTION_EVENTS.EXHAUSTED }),
      );
    });

    it("is a no-op for a non-active subscription and emits nothing", async () => {
      prisma.liveSubscription.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.consume(makeTxClient(prisma), "sub1");

      expect(result).toBe(false);
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe("creditBack (single owner)", () => {
    it("decrements and emits CREDITED_BACK, never below zero", async () => {
      prisma.liveSubscription.findUnique.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        sessionsTotal: 4,
        sessionsUsed: 2,
      });

      await service.creditBack(makeTxClient(prisma), "sub1", { sessionId: "s1" });

      expect(prisma.liveSubscription.update).toHaveBeenCalledWith({
        where: { id: "sub1" },
        data: { sessionsUsed: { decrement: 1 } },
      });
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LIVE_SUBSCRIPTION_EVENTS.CREDITED_BACK,
          payload: expect.objectContaining({ used: 1, remaining: 3 }),
        }),
      );
    });

    it("is a no-op when already at zero", async () => {
      prisma.liveSubscription.findUnique.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        sessionsTotal: 4,
        sessionsUsed: 0,
      });

      await service.creditBack(makeTxClient(prisma), "sub1");

      expect(prisma.liveSubscription.update).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe("remaining & eligibility", () => {
    it("getRemaining clamps at zero", async () => {
      prisma.liveSubscription.findUnique.mockResolvedValue({
        sessionsTotal: 2,
        sessionsUsed: 5,
      });
      const r = await service.getRemaining("sub1");
      expect(r).toEqual({ total: 2, used: 5, remaining: 0 });
    });

    it("isEligible is always true for FREE", async () => {
      expect(await service.isEligible("u1", "t1", LiveSessionKindEnum.FREE)).toBe(true);
    });

    it("isEligible is false when the kind has zero remaining", async () => {
      prisma.liveSubscription.findMany.mockResolvedValue([
        { sessionsTotal: 4, sessionsUsed: 4 },
      ]);
      expect(
        await service.isEligible("u1", "t1", LiveSessionKindEnum.PRIVATE_MONTHLY),
      ).toBe(false);
    });

    it("isExhausted is true only when there is an active subscription with zero remaining", async () => {
      prisma.liveSubscription.findMany.mockResolvedValue([
        { sessionsTotal: 4, sessionsUsed: 4 },
      ]);
      expect(
        await service.isExhausted("u1", "t1", LiveSessionKindEnum.PRIVATE_MONTHLY),
      ).toBe(true);
      expect(await service.isExhausted("u1", "t1", LiveSessionKindEnum.FREE)).toBe(false);
    });
  });

  describe("renewal lifecycle", () => {
    it("renews a monthly subscription and resets the counter", async () => {
      prisma.liveSubscription.findFirst.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        type: LiveSubscriptionTypeEnum.PRIVATE_MONTHLY,
        status: LiveSubscriptionStatusEnum.ACTIVE,
      });
      prisma.liveSubscription.update.mockResolvedValue({ id: "sub1" });

      await service.renew("sub1");

      const updateCall = prisma.liveSubscription.update.mock.calls[0][0];
      expect(updateCall.data.sessionsUsed).toBe(0);
      expect(updateCall.data.status).toBe(LiveSubscriptionStatusEnum.ACTIVE);
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: LIVE_SUBSCRIPTION_EVENTS.RENEWED }),
      );
    });

    it("rejects renewal of a non-monthly subscription", async () => {
      prisma.liveSubscription.findFirst.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        type: LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE,
        status: LiveSubscriptionStatusEnum.ACTIVE,
      });
      await expect(service.renew("sub1")).rejects.toThrow(BadRequestException);
    });

    it("expire emits EXPIRED", async () => {
      prisma.liveSubscription.findFirst.mockResolvedValue({
        id: "sub1",
        userId: "u1",
        status: LiveSubscriptionStatusEnum.ACTIVE,
      });
      prisma.liveSubscription.update.mockResolvedValue({ id: "sub1" });

      await service.expire("sub1");

      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: LIVE_SUBSCRIPTION_EVENTS.EXPIRED }),
      );
    });

    it("processPeriodEnd renews autoRenew monthly subs and expires the rest", async () => {
      prisma.liveSubscription.findMany.mockResolvedValue([
        { id: "a", autoRenew: true, type: LiveSubscriptionTypeEnum.PRIVATE_MONTHLY },
        { id: "b", autoRenew: false, type: LiveSubscriptionTypeEnum.PRIVATE_MONTHLY },
        { id: "c", autoRenew: true, type: LiveSubscriptionTypeEnum.ONE_TIME_PRIVATE },
      ]);
      prisma.liveSubscription.findFirst.mockResolvedValue({ id: "a", userId: "u1", type: LiveSubscriptionTypeEnum.PRIVATE_MONTHLY, status: LiveSubscriptionStatusEnum.ACTIVE });
      prisma.liveSubscription.update.mockResolvedValue({ id: "x" });

      const result = await service.processPeriodEnd(now);

      expect(result).toEqual({ renewed: 1, expired: 2 });
    });
  });
});

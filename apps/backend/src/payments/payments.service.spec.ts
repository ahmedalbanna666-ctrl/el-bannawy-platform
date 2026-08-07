import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigurationService } from "../config/configuration.service";
import { LiveRefundStatusEnum } from "@el-bannawy/shared";
import { LiveProductPricingService } from "../live/live-product-pricing.service";
import { LiveActivationService } from "../live/live-activation.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ReferralService } from "../referral/referral.service";

describe("PaymentsService refund ledger (M5)", () => {
  let service: PaymentsService;
  let prisma: {
    payment: { findUnique: jest.Mock; update: jest.Mock };
    liveRefund: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  };
  let deactivateSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = {
      payment: { findUnique: jest.fn(), update: jest.fn() },
      liveRefund: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    };
    (prisma as unknown as { $transaction: unknown }).$transaction = jest.fn(
      async (cb: (tx: typeof prisma) => unknown) => cb(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigurationService, useValue: { payment: { webhookSecret: "secret" } } },
        { provide: LiveProductPricingService, useValue: { getPrice: jest.fn().mockResolvedValue(200) } },
        { provide: LiveActivationService, useValue: { activate: jest.fn().mockResolvedValue(undefined) } },
        { provide: NotificationsService, useValue: { sendNotification: jest.fn().mockResolvedValue(undefined) } },
        { provide: ReferralService, useValue: { applyReferral: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    deactivateSpy = jest
      .spyOn(service as unknown as { deactivateContent: (a: string, b: string, c: string, d?: number) => Promise<void> }, "deactivateContent")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    deactivateSpy.mockRestore();
  });

  describe("refundPayment", () => {
    it("should throw NotFoundException for missing payment", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.refundPayment("p1")).rejects.toThrow(NotFoundException);
    });

    it("should reject a non-successful payment", async () => {
      prisma.payment.findUnique.mockResolvedValue({ id: "p1", status: "PENDING" });
      await expect(service.refundPayment("p1")).rejects.toThrow(BadRequestException);
    });

    it("should reject duplicate refund", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "p1",
        status: "SUCCESSFUL",
        userId: "u1",
        amount: 100,
        currency: "EGP",
      });
      prisma.liveRefund.findUnique.mockResolvedValue({ id: "r1" });
      await expect(service.refundPayment("p1")).rejects.toThrow(BadRequestException);
    });

    it("should create a LiveRefund record and flip payment status", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: "p1",
        status: "SUCCESSFUL",
        userId: "u1",
        amount: 100,
        currency: "EGP",
        productType: "LESSON",
        productId: "prod1",
      });
      prisma.liveRefund.findUnique.mockResolvedValue(null);
      prisma.payment.update.mockResolvedValue({
        id: "p1",
        userId: "u1",
        amount: 100,
        currency: "EGP",
        productType: "LESSON",
        productId: "prod1",
      } as never);
      prisma.liveRefund.create.mockResolvedValue({ id: "r1" } as never);

      const result = (await service.refundPayment("p1", "Session cancelled")) as {
        refunded: boolean;
        refundId: string;
      };

      expect(result.refunded).toBe(true);
      expect(result.refundId).toBe("r1");
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { status: "REFUNDED" },
      });
      expect(prisma.liveRefund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentId: "p1",
          userId: "u1",
          amount: 100,
          currency: "EGP",
          reason: "Session cancelled",
          status: LiveRefundStatusEnum.PROCESSED,
          processedAt: expect.any(Date),
        }),
      });
      expect(deactivateSpy).toHaveBeenCalledWith("u1", "LESSON", "prod1", 100);
    });
  });

  describe("getRefunds", () => {
    it("should read from the live_refunds ledger", async () => {
      prisma.liveRefund.findMany.mockResolvedValue([{ id: "r1" }]);
      const result = await service.getRefunds();
      expect(result).toEqual([{ id: "r1" }]);
      expect(prisma.liveRefund.findMany).toHaveBeenCalled();
    });
  });
});

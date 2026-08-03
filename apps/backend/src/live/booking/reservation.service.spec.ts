import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LiveBookingStatusEnum } from "@el-bannawy/shared";

describe("ReservationService (single owner of seats)", () => {
  let service: ReservationService;
  let tx: {
    liveSession: { updateMany: jest.Mock };
    liveBooking: { upsert: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    tx = {
      liveSession: { updateMany: jest.fn() },
      liveBooking: { upsert: jest.fn(), update: jest.fn() },
    };
    const prisma = { $transaction: jest.fn() } as never;
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ReservationService>(ReservationService);
  });

  describe("reserve", () => {
    it("throws when session is full", async () => {
      tx.liveSession.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.reserve(tx as never, { sessionId: "s1", studentId: "stu1", subscriptionId: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it("decrements seat and confirms booking", async () => {
      tx.liveSession.updateMany.mockResolvedValue({ count: 1 });
      tx.liveBooking.upsert.mockResolvedValue({ id: "b1", subscriptionId: null });

      const result = await service.reserve(tx as never, {
        sessionId: "s1",
        studentId: "stu1",
        subscriptionId: "sub1",
      });

      expect(tx.liveSession.updateMany).toHaveBeenCalledWith({
        where: { id: "s1", availableSeats: { gt: 0 } },
        data: { availableSeats: { decrement: 1 } },
      });
      expect(tx.liveBooking.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId_studentId: { sessionId: "s1", studentId: "stu1" } },
          create: expect.objectContaining({ status: LiveBookingStatusEnum.CONFIRMED, subscriptionId: "sub1" }),
        }),
      );
      expect(result).toEqual({ id: "b1", subscriptionId: null });
    });
  });

  describe("release", () => {
    it("cancels booking and returns the seat", async () => {
      tx.liveBooking.update.mockResolvedValue({ id: "b1" });
      tx.liveSession.updateMany.mockResolvedValue({ count: 1 });

      await service.release(tx as never, "b1", "s1", "Cancelled by user");

      expect(tx.liveBooking.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          status: LiveBookingStatusEnum.CANCELLED,
          cancelledAt: expect.any(Date),
          cancelReason: "Cancelled by user",
        }),
      });
      expect(tx.liveSession.updateMany).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { availableSeats: { increment: 1 } },
      });
    });
  });
});

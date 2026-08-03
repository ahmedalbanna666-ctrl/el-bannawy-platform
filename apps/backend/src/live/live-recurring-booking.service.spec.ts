import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LiveRecurringBookingService } from "./live-recurring-booking.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAvailabilityService } from "./live-availability.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import { BookingEngineService } from "./booking/booking-engine.service";
import { SessionKindResolver } from "./booking/session-kind.resolver";
import {
  LiveSessionKindEnum,
  LiveSessionTypeEnum,
  LiveSubscriptionTypeEnum,
} from "@el-bannawy/shared";

describe("LiveRecurringBookingService", () => {
  let service: LiveRecurringBookingService;
  let prisma: { teacherAvailability: { findFirst: jest.Mock } };
  let availability: { materializeSessionFromSlot: jest.Mock };
  let subscriptions: {
    getActiveTypesForTeacher: jest.Mock;
    isEligible: jest.Mock;
    isExhausted: jest.Mock;
  };
  let engine: { book: jest.Mock };
  let kindResolver: { resolve: jest.Mock };

  const availRow = {
    id: "avail1",
    teacherId: "t1",
    dayOfWeek: 1,
    startTime: new Date("2026-08-03T10:00:00.000Z"),
    endTime: new Date("2026-08-03T11:00:00.000Z"),
    type: "PRIVATE",
    effectiveFrom: null,
    effectiveTo: null,
  };

  beforeEach(async () => {
    prisma = { teacherAvailability: { findFirst: jest.fn() } };
    availability = {
      materializeSessionFromSlot: jest
        .fn()
        .mockResolvedValue({ id: "s1", teacherId: "t1", type: "PRIVATE" }),
    };
    subscriptions = {
      getActiveTypesForTeacher: jest
        .fn()
        .mockResolvedValue([LiveSubscriptionTypeEnum.PRIVATE_MONTHLY]),
      isEligible: jest.fn().mockResolvedValue(true),
      isExhausted: jest.fn().mockResolvedValue(false),
    };
    engine = { book: jest.fn().mockResolvedValue({ id: "b1", bookingKind: "PRIVATE_MONTHLY" }) };
    kindResolver = {
      resolve: jest
        .fn()
        .mockReturnValue(LiveSessionKindEnum.PRIVATE_MONTHLY),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveRecurringBookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveAvailabilityService, useValue: availability },
        { provide: LiveSubscriptionService, useValue: subscriptions },
        { provide: BookingEngineService, useValue: engine },
        { provide: SessionKindResolver, useValue: kindResolver },
      ],
    }).compile();

    service = module.get<LiveRecurringBookingService>(LiveRecurringBookingService);
  });

  describe("bookSeries", () => {
    it("throws NotFoundException when the slot is missing", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(null);
      await expect(
        service.bookSeries("student", "avail1:2026-08-03", {
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when dateTo precedes dateFrom", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(availRow);
      await expect(
        service.bookSeries("student", "avail1:2026-08-03", {
          dateFrom: "2026-08-31",
          dateTo: "2026-08-01",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when no date matches the slot day", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue({
        ...availRow,
        dayOfWeek: 5,
      });
      await expect(
        service.bookSeries("student", "avail1:2026-08-03", {
          dateFrom: "2026-08-03",
          dateTo: "2026-08-03",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("books every matching recurring occurrence through the engine", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(availRow);
      availability.materializeSessionFromSlot.mockImplementation(async (_a: string, dateStr: string) => ({
        id: `s-${dateStr}`,
        teacherId: "t1",
        type: "PRIVATE",
      }));

      const result = (await service.bookSeries("student", "avail1:2026-08-03", {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as {
        bookedCount: number;
        skippedCount: number;
        occurrences: { status: string; date: string }[];
      };

      expect(result.bookedCount).toBe(5);
      expect(result.skippedCount).toBe(0);
      expect(result.occurrences.every((o) => o.status === "BOOKED")).toBe(true);
      expect(engine.book).toHaveBeenCalledTimes(5);
    });

    it("skips remaining occurrences when the subscription is exhausted", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(availRow);
      subscriptions.isEligible.mockResolvedValue(false);
      subscriptions.isExhausted.mockResolvedValue(true);

      const result = (await service.bookSeries("student", "avail1:2026-08-03", {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as {
        bookedCount: number;
        skippedCount: number;
        occurrences: { status: string; reason?: string }[];
      };

      expect(result.bookedCount).toBe(0);
      expect(result.skippedCount).toBe(5);
      expect(result.occurrences[0]).toMatchObject({ status: "SKIPPED", reason: "subscription exhausted" });
    });

    it("skips a single occurrence when the engine rejects the booking", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue(availRow);
      engine.book
        .mockResolvedValueOnce({ id: "b1" })
        .mockRejectedValueOnce(new BadRequestException("Session is full"))
        .mockResolvedValueOnce({ id: "b2" });

      const result = (await service.bookSeries("student", "avail1:2026-08-03", {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as {
        bookedCount: number;
        skippedCount: number;
        occurrences: { status: string; reason?: string }[];
      };

      expect(result.bookedCount).toBe(4);
      expect(result.skippedCount).toBe(1);
      expect(result.occurrences[1]).toMatchObject({ status: "SKIPPED", reason: "Session is full" });
    });

    it("respects the availability effectiveFrom/effectiveTo boundaries", async () => {
      prisma.teacherAvailability.findFirst.mockResolvedValue({
        ...availRow,
        effectiveFrom: new Date("2026-08-10"),
        effectiveTo: new Date("2026-08-20"),
      });

      const result = (await service.bookSeries("student", "avail1:2026-08-03", {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as { occurrences: { date: string }[] };

      expect(result.occurrences.map((o) => o.date)).toEqual([
        "2026-08-10",
        "2026-08-17",
      ]);
    });
  });
});

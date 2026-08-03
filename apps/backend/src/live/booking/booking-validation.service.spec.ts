import { Test, type TestingModule } from "@nestjs/testing";
import { BookingValidationService } from "./booking-validation.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { BookingContext } from "./booking.types";
import { LiveSessionKindEnum, LiveSessionTypeEnum, LiveSubscriptionTypeEnum } from "@el-bannawy/shared";

function makeContext(overrides: Partial<BookingContext> = {}): BookingContext {
  return {
    session: {
      id: "s1",
      teacherId: "t1",
      gradeId: "g1",
      date: new Date("2026-08-10T00:00:00Z"),
      startTime: new Date("2026-08-10T10:00:00Z"),
      endTime: new Date("2026-08-10T11:00:00Z"),
      status: "PUBLISHED",
      type: LiveSessionTypeEnum.PRIVATE,
      availableSeats: 5,
      availabilitySlotId: "avail1",
    },
    student: { id: "stu1", role: "STUDENT", gradeId: "g1" },
    now: new Date("2026-08-01T00:00:00Z"),
    activeSubscriptionTypes: [LiveSubscriptionTypeEnum.PRIVATE_MONTHLY],
    kind: LiveSessionKindEnum.PRIVATE_MONTHLY,
    ...overrides,
  };
}

describe("BookingValidationService", () => {
  let service: BookingValidationService;
  let prisma: {
    liveBooking: { findFirst: jest.Mock };
    teacherDateBlock: { findFirst: jest.Mock };
    teacherAvailability: { findFirst: jest.Mock };
    liveWaitingList: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      liveBooking: { findFirst: jest.fn() },
      teacherDateBlock: { findFirst: jest.fn() },
      teacherAvailability: { findFirst: jest.fn() },
      liveWaitingList: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingValidationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<BookingValidationService>(BookingValidationService);
  });

  describe("V1 capacity", () => {
    it("fails when no seats", () => {
      const r = service.validateCapacity(makeContext({ session: { ...makeContext().session, availableSeats: 0 } }));
      expect(r.ok).toBe(false);
    });
    it("passes when seats available", () => {
      expect(service.validateCapacity(makeContext()).ok).toBe(true);
    });
  });

  describe("V2 duplicate", () => {
    it("fails when an active booking exists", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({ id: "b1", cancelledAt: null });
      const tx = { liveBooking: { findFirst: prisma.liveBooking.findFirst } } as never;
      const r = await service.validateDuplicate(tx, makeContext());
      expect(r.ok).toBe(false);
    });
    it("passes when no active booking", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      const tx = { liveBooking: { findFirst: prisma.liveBooking.findFirst } } as never;
      expect((await service.validateDuplicate(tx, makeContext())).ok).toBe(true);
    });
  });

  describe("V3 overlap", () => {
    it("fails on overlapping booking in same window", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({ id: "b2" });
      const tx = { liveBooking: { findFirst: prisma.liveBooking.findFirst } } as never;
      const r = await service.validateOverlap(tx, makeContext());
      expect(r.ok).toBe(false);
    });
    it("passes with no overlap", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      const tx = { liveBooking: { findFirst: prisma.liveBooking.findFirst } } as never;
      expect((await service.validateOverlap(tx, makeContext())).ok).toBe(true);
    });
  });

  describe("V4 subscription status", () => {
    it("passes for FREE kind without subscription", () => {
      const ctx = makeContext({ kind: LiveSessionKindEnum.FREE, activeSubscriptionTypes: [] });
      expect(service.validateSubscription(ctx).ok).toBe(true);
    });
    it("fails for paid kind without matching subscription", () => {
      const ctx = makeContext({ kind: LiveSessionKindEnum.PRIVATE_MONTHLY, activeSubscriptionTypes: [] });
      expect(service.validateSubscription(ctx).ok).toBe(false);
    });
    it("passes for PRIVATE_MONTHLY kind with matching sub", () => {
      expect(service.validateSubscription(makeContext()).ok).toBe(true);
    });
  });

  describe("V6 booking window", () => {
    it("fails for terminal status", () => {
      const ctx = makeContext({ session: { ...makeContext().session, status: "COMPLETED" } });
      expect(service.validateBookingWindow(ctx).ok).toBe(false);
    });
    it("fails when session already ended", () => {
      const ctx = makeContext({ now: new Date("2026-08-10T12:00:00Z") });
      expect(service.validateBookingWindow(ctx).ok).toBe(false);
    });
    it("passes for open bookable session", () => {
      expect(service.validateBookingWindow(makeContext()).ok).toBe(true);
    });
  });

  describe("V7 eligibility", () => {
    it("fails on grade mismatch", () => {
      const ctx = makeContext({ student: { id: "stu1", role: "STUDENT", gradeId: "g2" } });
      expect(service.validateEligibility(ctx).ok).toBe(false);
    });
    it("passes on grade match", () => {
      expect(service.validateEligibility(makeContext()).ok).toBe(true);
    });
  });

  describe("V9 teacher availability", () => {
    it("fails when a date block covers the session date", async () => {
      prisma.teacherDateBlock.findFirst.mockResolvedValue({
        id: "b1",
        blockedDate: new Date("2026-08-10T00:00:00Z"),
      });
      prisma.teacherAvailability.findFirst.mockResolvedValue({ id: "avail1" });
      const tx = {
        teacherDateBlock: { findFirst: prisma.teacherDateBlock.findFirst },
        teacherAvailability: { findFirst: prisma.teacherAvailability.findFirst },
      } as never;
      const r = await service.validateTeacherAvailability(tx, makeContext());
      expect(r.ok).toBe(false);
    });

    it("fails when the availability slot is soft-deleted", async () => {
      prisma.teacherDateBlock.findFirst.mockResolvedValue(null);
      prisma.teacherAvailability.findFirst.mockResolvedValue(null);
      const tx = {
        teacherDateBlock: { findFirst: prisma.teacherDateBlock.findFirst },
        teacherAvailability: { findFirst: prisma.teacherAvailability.findFirst },
      } as never;
      const r = await service.validateTeacherAvailability(tx, makeContext());
      expect(r.ok).toBe(false);
    });

    it("passes when teacher and slot are available", async () => {
      prisma.teacherDateBlock.findFirst.mockResolvedValue(null);
      prisma.teacherAvailability.findFirst.mockResolvedValue({ id: "avail1" });
      const tx = {
        teacherDateBlock: { findFirst: prisma.teacherDateBlock.findFirst },
        teacherAvailability: { findFirst: prisma.teacherAvailability.findFirst },
      } as never;
      const r = await service.validateTeacherAvailability(tx, makeContext());
      expect(r.ok).toBe(true);
    });
  });

  describe("validateBooking aggregate", () => {
    it("passes for a fully valid context", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      prisma.teacherDateBlock.findFirst.mockResolvedValue(null);
      prisma.teacherAvailability.findFirst.mockResolvedValue({ id: "avail1" });
      const tx = {
        liveBooking: { findFirst: prisma.liveBooking.findFirst },
        teacherDateBlock: { findFirst: prisma.teacherDateBlock.findFirst },
        teacherAvailability: { findFirst: prisma.teacherAvailability.findFirst },
      } as never;
      expect((await service.validateBooking(tx, makeContext())).ok).toBe(true);
    });
  });
});

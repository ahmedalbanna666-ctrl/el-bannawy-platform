import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { LiveBookingService } from "./live-booking.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { LiveAvailabilityService } from "./live-availability.service";
import { BookingEngineService } from "./booking/booking-engine.service";
import { LIVE_DOMAIN_EVENT_BUS } from "./events";
import {
  LiveBookingStatusEnum,
  LiveBookingRescheduleStatusEnum,
} from "@el-bannawy/shared";

describe("LiveBookingService (facade)", () => {
  let service: LiveBookingService;
  let prisma: {
    liveBooking: {
      findFirst: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    liveSession: { findFirst: jest.Mock; create: jest.Mock };
    teacherAvailability: { findFirst: jest.Mock };
  };
  let engine: {
    book: jest.Mock;
    cancelBooking: jest.Mock;
    removeParticipant: jest.Mock;
  };
  let access: { assertSessionOwner: jest.Mock };
  let availability: { materializeSessionFromSlot: jest.Mock };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      liveBooking: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      liveSession: { findFirst: jest.fn(), create: jest.fn() },
      teacherAvailability: { findFirst: jest.fn() },
    };
    engine = {
      book: jest.fn().mockResolvedValue({ id: "b1" }),
      cancelBooking: jest.fn().mockResolvedValue({ id: "b1" }),
      removeParticipant: jest.fn().mockResolvedValue({ sessionId: "s1", studentId: "stu1" }),
    };
    access = { assertSessionOwner: jest.fn() };
    availability = {
      materializeSessionFromSlot: jest
        .fn()
        .mockResolvedValue({ id: "s1", teacherId: "t1", type: "PRIVATE" }),
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveBookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveAccessService, useValue: access },
        { provide: LiveAvailabilityService, useValue: availability },
        { provide: BookingEngineService, useValue: engine },
        { provide: LIVE_DOMAIN_EVENT_BUS, useValue: events },
      ],
    }).compile();

    service = module.get<LiveBookingService>(LiveBookingService);
  });

  describe("bookSession", () => {
    it("should delegate to the booking engine", async () => {
      await service.bookSession("student", { sessionId: "s1", subscriptionId: "sub1" });
      expect(engine.book).toHaveBeenCalledWith("student", {
        sessionId: "s1",
        subscriptionId: "sub1",
      });
    });
  });

  describe("cancelBooking", () => {
    it("should delegate to the booking engine", async () => {
      await service.cancelBooking("b1", "student", "STUDENT");
      expect(engine.cancelBooking).toHaveBeenCalledWith("b1", "student", "STUDENT");
    });
  });

  describe("bookBySlot", () => {
    it("should throw NotFoundException when slot missing", async () => {
      availability.materializeSessionFromSlot.mockRejectedValue(new NotFoundException("Slot not found"));
      await expect(
        service.bookBySlot("student", "avail1:2026-08-01", { date: "2026-08-01" }),
      ).rejects.toThrow(NotFoundException);
      expect(availability.materializeSessionFromSlot).toHaveBeenCalledWith(
        "avail1",
        "2026-08-01",
      );
    });

    it("should reuse the materialized session for the slot date", async () => {
      availability.materializeSessionFromSlot.mockResolvedValue({
        id: "s1",
        teacherId: "t1",
        type: "PRIVATE",
      });

      await service.bookBySlot("student", "avail1:2026-08-01", { date: "2026-08-01" });

      expect(engine.book).toHaveBeenCalledWith("student", {
        sessionId: "s1",
        subscriptionId: undefined,
      });
    });
  });

  describe("requestReschedule", () => {
    it("should throw NotFoundException for missing booking", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      await expect(service.requestReschedule("b1", "student", { reason: "busy" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should reject a cancelled booking", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        studentId: "student",
        cancelledAt: new Date(),
      });
      await expect(service.requestReschedule("b1", "student", { reason: "busy" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should set REQUESTED status with reason", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        studentId: "student",
        cancelledAt: null,
      });
      prisma.liveBooking.update.mockResolvedValue({ id: "b1" });

      await service.requestReschedule("b1", "student", { reason: "conflict" });

      expect(prisma.liveBooking.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          rescheduleStatus: LiveBookingRescheduleStatusEnum.REQUESTED,
          rescheduleReason: "conflict",
          rescheduleRequestedAt: expect.any(Date),
        }),
      });
    });

    it("should throw ForbiddenException for another student's booking", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        studentId: "other",
        cancelledAt: null,
      });
      await expect(service.requestReschedule("b1", "student", { reason: "x" })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("decideReschedule", () => {
    it("should reject decision when no pending request", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        sessionId: "s1",
        rescheduleStatus: null,
      });
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", teacherId: "t1" });
      await expect(
        service.decideReschedule("b1", "t1", "TEACHER", {
          decision: LiveBookingRescheduleStatusEnum.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should mark booking RESCHEDULED on approval", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        sessionId: "s1",
        rescheduleStatus: LiveBookingRescheduleStatusEnum.REQUESTED,
      });
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", teacherId: "t1" });
      prisma.liveBooking.update.mockResolvedValue({ id: "b1" });

      await service.decideReschedule("b1", "t1", "TEACHER", {
        decision: LiveBookingRescheduleStatusEnum.APPROVED,
      });

      expect(prisma.liveBooking.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          rescheduleStatus: LiveBookingRescheduleStatusEnum.APPROVED,
          status: LiveBookingStatusEnum.RESCHEDULED,
          rescheduleResolvedAt: expect.any(Date),
          rescheduleResolvedById: "t1",
        }),
      });
    });
  });
});

import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BookingEngineService } from "./booking-engine.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LiveAccessService } from "../live-access.service";
import { LiveWaitingListService } from "../live-waitlist.service";
import { LiveSubscriptionService } from "../live-subscription.service";
import { SessionKindResolver } from "./session-kind.resolver";
import { BookingValidationService } from "./booking-validation.service";
import { ReservationService } from "./reservation.service";
import { RefundPolicyService } from "./refund-policy.service";
import { VALIDATION_OK } from "./booking.types";
import { LIVE_DOMAIN_EVENT_BUS } from "../events";
import { LiveSessionKindEnum, LiveSessionTypeEnum } from "@el-bannawy/shared";

describe("BookingEngineService", () => {
  let service: BookingEngineService;
  let prisma: {
    liveBooking: { findFirst: jest.Mock; findUnique: jest.Mock };
    liveSession: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let access: { assertSessionOwner: jest.Mock };
  let waitlist: { promoteNext: jest.Mock };
  let subscriptions: {
    getActiveTypesForTeacherTx: jest.Mock;
    consume: jest.Mock;
    creditBack: jest.Mock;
  };
  let reservation: { reserve: jest.Mock; release: jest.Mock };
  let refundPolicy: { isRefundEligible: jest.Mock };
  let validation: { validateBooking: jest.Mock };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      liveBooking: { findFirst: jest.fn(), findUnique: jest.fn() },
      liveSession: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    access = { assertSessionOwner: jest.fn() };
    waitlist = { promoteNext: jest.fn().mockResolvedValue(false) };
    subscriptions = {
      getActiveTypesForTeacherTx: jest.fn().mockResolvedValue([]),
      consume: jest.fn().mockResolvedValue(true),
      creditBack: jest.fn().mockResolvedValue(undefined),
    };
    reservation = {
      reserve: jest.fn().mockResolvedValue({ id: "b1", subscriptionId: "sub1" }),
      release: jest.fn().mockResolvedValue(undefined),
    };
    refundPolicy = { isRefundEligible: jest.fn().mockReturnValue(true) };
    validation = { validateBooking: jest.fn().mockResolvedValue(VALIDATION_OK) };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveAccessService, useValue: access },
        { provide: LiveWaitingListService, useValue: waitlist },
        { provide: LiveSubscriptionService, useValue: subscriptions },
        { provide: SessionKindResolver, useValue: new SessionKindResolver() },
        { provide: BookingValidationService, useValue: validation },
        { provide: ReservationService, useValue: reservation },
        { provide: RefundPolicyService, useValue: refundPolicy },
        { provide: LIVE_DOMAIN_EVENT_BUS, useValue: events },
      ],
    }).compile();
    service = module.get<BookingEngineService>(BookingEngineService);
  });

  describe("book", () => {
    it("runs validation then reserves and consumes via ports", async () => {
      const session = {
        id: "s1",
        teacherId: "t1",
        gradeId: "g1",
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        status: "PUBLISHED",
        type: LiveSessionTypeEnum.PRIVATE,
        availableSeats: 5,
        availabilitySlotId: "avail1",
      };
      const student = { id: "stu1", role: "STUDENT", gradeId: "g1" };
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
        const tx = {
          liveSession: { findUnique: jest.fn().mockResolvedValue(session) },
          user: { findUnique: jest.fn().mockResolvedValue(student) },
          liveBooking: {
            findUnique: jest.fn().mockResolvedValue({
              id: "b1",
              sessionId: "s1",
              session: { title: "Algebra", teacherId: "t1", startTime: new Date() },
            }),
          },
        };
        return cb(tx);
      });

      await service.book("stu1", { sessionId: "s1", subscriptionId: "sub1" });

      expect(validation.validateBooking).toHaveBeenCalled();
      expect(reservation.reserve).toHaveBeenCalled();
      expect(subscriptions.consume).toHaveBeenCalled();
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "booking.created",
          payload: expect.objectContaining({
            bookingId: "b1",
            sessionId: "s1",
            sessionTitle: "Algebra",
            studentId: "stu1",
            bookingKind: LiveSessionKindEnum.FREE,
          }),
        }),
      );
    });

    it("throws BadRequestException when validation fails", async () => {
      validation.validateBooking.mockResolvedValue({ ok: false, reason: "Session is full" });
      const session = {
        id: "s1",
        teacherId: "t1",
        gradeId: null,
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        status: "PUBLISHED",
        type: LiveSessionTypeEnum.PRIVATE,
        availableSeats: 0,
        availabilitySlotId: null,
      };
      const student = { id: "stu1", role: "STUDENT", gradeId: null };
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
        const tx = {
          liveSession: { findUnique: jest.fn().mockResolvedValue(session) },
          user: { findUnique: jest.fn().mockResolvedValue(student) },
        };
        return cb(tx);
      });
      await expect(service.book("stu1", { sessionId: "s1" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancelBooking", () => {
    it("credits back via subscription service when refund eligible", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        sessionId: "s1",
        studentId: "stu1",
        subscriptionId: "sub1",
        cancelledAt: null,
      });
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", teacherId: "t1", startTime: new Date(), title: "Algebra" });
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}));

      await service.cancelBooking("b1", "stu1", "STUDENT");

      expect(refundPolicy.isRefundEligible).toHaveBeenCalled();
      expect(subscriptions.creditBack).toHaveBeenCalled();
      expect(reservation.release).toHaveBeenCalled();
      expect(waitlist.promoteNext).toHaveBeenCalled();
    });

    it("does not credit back when not refund eligible", async () => {
      refundPolicy.isRefundEligible.mockReturnValue(false);
      prisma.liveBooking.findFirst.mockResolvedValue({
        id: "b1",
        sessionId: "s1",
        studentId: "stu1",
        subscriptionId: "sub1",
        cancelledAt: null,
      });
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", teacherId: "t1", startTime: new Date(), title: "Algebra" });
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}));

      await service.cancelBooking("b1", "stu1", "STUDENT");

      expect(subscriptions.creditBack).not.toHaveBeenCalled();
      expect(reservation.release).toHaveBeenCalled();
    });

    it("throws NotFoundException for missing booking", async () => {
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      await expect(service.cancelBooking("b1", "stu1", "STUDENT")).rejects.toThrow(NotFoundException);
    });
  });
});

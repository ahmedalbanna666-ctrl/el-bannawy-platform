import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LiveWaitingListService } from "./live-waitlist.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { BookingEngineService } from "./booking/booking-engine.service";
import { LIVE_DOMAIN_EVENT_BUS } from "./events";
import { LiveWaitingListStatusEnum } from "@el-bannawy/shared";

describe("LiveWaitingListService", () => {
  let service: LiveWaitingListService;
  let prisma: {
    liveSession: { findFirst: jest.Mock; findUnique: jest.Mock };
    liveBooking: { findFirst: jest.Mock };
    liveWaitingList: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
  let bookingEngine: { book: jest.Mock };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      liveSession: { findFirst: jest.fn(), findUnique: jest.fn() },
      liveBooking: { findFirst: jest.fn() },
      liveWaitingList: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    bookingEngine = { book: jest.fn().mockResolvedValue({ id: "b1" }) };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveWaitingListService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LiveAccessService,
          useValue: { assertSessionOwner: jest.fn() },
        },
        { provide: BookingEngineService, useValue: bookingEngine },
        { provide: LIVE_DOMAIN_EVENT_BUS, useValue: events },
      ],
    }).compile();

    service = module.get<LiveWaitingListService>(LiveWaitingListService);
  });

  describe("join", () => {
    it("should throw if session not found", async () => {
      prisma.liveSession.findFirst.mockResolvedValue(null);
      await expect(service.join("student", "s1")).rejects.toThrow(NotFoundException);
    });

    it("should throw if already booked", async () => {
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", availableSeats: 0 });
      prisma.liveBooking.findFirst.mockResolvedValue({ id: "b1" });
      await expect(service.join("student", "s1")).rejects.toThrow(BadRequestException);
    });

    it("should throw if already waiting", async () => {
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", availableSeats: 0 });
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      prisma.liveWaitingList.findFirst.mockResolvedValue({ id: "w1" });
      await expect(service.join("student", "s1")).rejects.toThrow(BadRequestException);
    });

    it("should create entry with next position", async () => {
      prisma.liveSession.findFirst.mockResolvedValue({ id: "s1", availableSeats: 0 });
      prisma.liveBooking.findFirst.mockResolvedValue(null);
      prisma.liveWaitingList.findFirst.mockResolvedValue(null);
      prisma.liveWaitingList.count.mockResolvedValue(2);
      prisma.liveWaitingList.create.mockResolvedValue({
        id: "w1",
        session: { title: "Algebra", teacherId: "t1" },
      });

      await service.join("student", "s1");

      expect(prisma.liveWaitingList.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: "s1",
            studentId: "student",
            status: LiveWaitingListStatusEnum.WAITING,
            position: 3,
          }),
        }),
      );
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "waitlist.joined",
          payload: expect.objectContaining({
            waitlistId: "w1",
            sessionId: "s1",
            sessionTitle: "Algebra",
            studentId: "student",
            position: 3,
          }),
        }),
      );
    });
  });

  describe("promoteNext", () => {
    it("should return false when no waiter", async () => {
      prisma.liveWaitingList.findMany.mockResolvedValue([]);
      const promoted = await service.promoteNext("s1", "teacher");
      expect(promoted).toBe(false);
      expect(bookingEngine.book).not.toHaveBeenCalled();
    });

    it("should promote the first waiting student through the Booking Engine", async () => {
      prisma.liveWaitingList.findMany.mockResolvedValue([{ id: "w1", studentId: "stu1" }]);
      prisma.liveWaitingList.update.mockResolvedValue({});
      prisma.liveSession.findUnique.mockResolvedValue({ title: "Algebra", teacherId: "t1" });
      bookingEngine.book.mockResolvedValue({ id: "b1" });

      const promoted = await service.promoteNext("s1", "t1");

      expect(promoted).toBe(true);
      expect(bookingEngine.book).toHaveBeenCalledWith("stu1", { sessionId: "s1" });
      expect(prisma.liveWaitingList.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LiveWaitingListStatusEnum.PROMOTED,
            promotedAt: expect.any(Date),
          }),
        }),
      );
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "waitlist.promoted",
          payload: expect.objectContaining({
            waitlistId: "w1",
            bookingId: "b1",
            sessionId: "s1",
            studentId: "stu1",
          }),
        }),
      );
    });

    it("should skip ineligible students and promote the next eligible one", async () => {
      prisma.liveWaitingList.findMany.mockResolvedValue([
        { id: "w1", studentId: "stu1" },
        { id: "w2", studentId: "stu2" },
      ]);
      prisma.liveWaitingList.update.mockResolvedValue({});
      prisma.liveSession.findUnique.mockResolvedValue({ title: "Algebra", teacherId: "t1" });
      bookingEngine.book
        .mockRejectedValueOnce(new Error("Not eligible"))
        .mockResolvedValueOnce({ id: "b2" });

      const promoted = await service.promoteNext("s1", "t1");

      expect(promoted).toBe(true);
      expect(bookingEngine.book).toHaveBeenNthCalledWith(1, "stu1", { sessionId: "s1" });
      expect(bookingEngine.book).toHaveBeenNthCalledWith(2, "stu2", { sessionId: "s1" });
      expect(prisma.liveWaitingList.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LiveWaitingListStatusEnum.PROMOTED,
            promotedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});


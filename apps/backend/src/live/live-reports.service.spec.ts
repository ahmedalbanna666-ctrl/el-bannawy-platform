import { Test, type TestingModule } from "@nestjs/testing";
import { LiveReportsService } from "./live-reports.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveSessionKindEnum } from "@el-bannawy/shared";

describe("LiveReportsService", () => {
  let service: LiveReportsService;
  let prisma: {
    liveBooking: { findMany: jest.Mock };
    liveAttendance: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      liveBooking: { findMany: jest.fn().mockResolvedValue([]) },
      liveAttendance: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LiveReportsService>(LiveReportsService);
  });

  describe("getProductReports", () => {
    it("returns zeroed metrics for every product when no bookings exist", async () => {
      prisma.liveBooking.findMany.mockResolvedValue([]);

      const result = await service.getProductReports({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });

      expect(result).toHaveLength(4);
      expect(result.every((r) => r.bookingCount === 0)).toBe(true);
      expect(result.map((r) => r.product)).toEqual([
        LiveSessionKindEnum.PRIVATE_MONTHLY,
        LiveSessionKindEnum.GROUP,
        LiveSessionKindEnum.ONE_TIME,
        LiveSessionKindEnum.FREE,
      ]);
    });

    it("classifies a GROUP session booking as GROUP", async () => {
      prisma.liveBooking.findMany.mockResolvedValue([
        {
          sessionId: "s1",
          studentId: "stu1",
          session: { id: "s1", type: "GROUP", maxStudents: 10 },
          subscription: { type: "GROUP_MONTHLY" },
        },
      ]);

      const result = await service.getProductReports({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });

      const group = result.find((r) => r.product === LiveSessionKindEnum.GROUP);
      expect(group).toMatchObject({
        sessionCount: 1,
        bookingCount: 1,
        capacityUtilization: 10,
      });
    });

    it("classifies PRIVATE + PRIVATE_MONTHLY as PRIVATE_MONTHLY and no-subscription as FREE", async () => {
      prisma.liveBooking.findMany.mockResolvedValue([
        {
          sessionId: "s1",
          studentId: "stu1",
          session: { id: "s1", type: "PRIVATE", maxStudents: 1 },
          subscription: { type: "PRIVATE_MONTHLY" },
        },
        {
          sessionId: "s2",
          studentId: "stu2",
          session: { id: "s2", type: "PRIVATE", maxStudents: 1 },
          subscription: null,
        },
      ]);
      prisma.liveAttendance.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", status: "COMPLETED" },
      ]);

      const result = await service.getProductReports({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });

      const monthly = result.find((r) => r.product === LiveSessionKindEnum.PRIVATE_MONTHLY);
      const free = result.find((r) => r.product === LiveSessionKindEnum.FREE);
      expect(monthly).toMatchObject({ bookingCount: 1, attendanceRate: 100 });
      expect(free).toMatchObject({ bookingCount: 1, attendanceRate: 0 });
    });

    it("computes attendance rate from attended bookings", async () => {
      prisma.liveBooking.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", session: { type: "PRIVATE", maxStudents: 1 }, subscription: null },
        { sessionId: "s2", studentId: "stu2", session: { type: "PRIVATE", maxStudents: 1 }, subscription: null },
      ]);
      prisma.liveAttendance.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", status: "COMPLETED" },
        { sessionId: "s2", studentId: "stu2", status: "ABSENT" },
      ]);

      const result = await service.getProductReports({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });

      const free = result.find((r) => r.product === LiveSessionKindEnum.FREE);
      expect(free?.attendanceRate).toBe(50);
    });

    it("counts distinct sessions for sessionCount", async () => {
      prisma.liveBooking.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", session: { type: "PRIVATE", maxStudents: 2 }, subscription: null },
        { sessionId: "s1", studentId: "stu2", session: { type: "PRIVATE", maxStudents: 2 }, subscription: null },
      ]);

      const result = await service.getProductReports({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });

      const free = result.find((r) => r.product === LiveSessionKindEnum.FREE);
      expect(free).toMatchObject({ sessionCount: 1, bookingCount: 2, capacityUtilization: 100 });
    });
  });
});

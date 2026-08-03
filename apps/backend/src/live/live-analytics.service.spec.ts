import { Test, type TestingModule } from "@nestjs/testing";
import { LiveAnalyticsService } from "./live-analytics.service";
import { PrismaService } from "../prisma/prisma.service";

describe("LiveAnalyticsService", () => {
  let service: LiveAnalyticsService;
  let prisma: {
    liveSession: { findMany: jest.Mock; count: jest.Mock };
    liveBooking: { findMany: jest.Mock; count: jest.Mock };
    liveAttendance: { findMany: jest.Mock };
    liveSubscription: { count: jest.Mock };
    liveWaitingList: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      liveSession: { findMany: jest.fn(), count: jest.fn() },
      liveBooking: { findMany: jest.fn(), count: jest.fn() },
      liveAttendance: { findMany: jest.fn() },
      liveSubscription: { count: jest.fn() },
      liveWaitingList: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LiveAnalyticsService>(LiveAnalyticsService);
  });

  describe("getOverview", () => {
    it("computes KPIs from existing tables", async () => {
      prisma.liveSession.findMany.mockResolvedValue([
        { id: "s1", status: "PUBLISHED", maxStudents: 10 },
        { id: "s2", status: "COMPLETED", maxStudents: 5 },
        { id: "s3", status: "CANCELLED", maxStudents: null },
      ]);
      prisma.liveBooking.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1" },
        { sessionId: "s1", studentId: "stu2" },
        { sessionId: "s2", studentId: "stu1" },
      ]);
      prisma.liveAttendance.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", status: "COMPLETED" },
        { sessionId: "s1", studentId: "stu2", status: "ABSENT" },
        { sessionId: "s2", studentId: "stu1", status: "COMPLETED" },
      ]);
      prisma.liveSubscription.count.mockResolvedValue(5);
      prisma.liveWaitingList.count.mockResolvedValue(2);
      prisma.liveSession.count.mockResolvedValue(1);

      const result = (await service.getOverview({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as {
        totalSessions: number;
        totalBookings: number;
        totalStudents: number;
        attendanceRate: number;
        capacityUtilization: number;
        activeSubscriptions: number;
        waitlistEntries: number;
        upcomingSessions: number;
      };

      expect(result.totalSessions).toBe(3);
      expect(result.totalBookings).toBe(3);
      expect(result.totalStudents).toBe(2);
      expect(result.attendanceRate).toBe(66.7);
      expect(result.capacityUtilization).toBe(20);
      expect(result.activeSubscriptions).toBe(5);
      expect(result.waitlistEntries).toBe(2);
      expect(result.upcomingSessions).toBe(1);
    });

    it("returns zero rates when no bookings exist", async () => {
      prisma.liveSession.findMany.mockResolvedValue([]);
      prisma.liveBooking.findMany.mockResolvedValue([]);
      prisma.liveAttendance.findMany.mockResolvedValue([]);
      prisma.liveSubscription.count.mockResolvedValue(0);
      prisma.liveWaitingList.count.mockResolvedValue(0);
      prisma.liveSession.count.mockResolvedValue(0);

      const result = (await service.getOverview({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as { attendanceRate: number; capacityUtilization: number };

      expect(result.attendanceRate).toBe(0);
      expect(result.capacityUtilization).toBe(0);
    });
  });

  describe("getTeacherAnalytics", () => {
    it("aggregates teacher metrics", async () => {
      prisma.liveSession.findMany.mockResolvedValue([
        { id: "s1", status: "COMPLETED", maxStudents: 10 },
        { id: "s2", status: "DRAFT", maxStudents: 10 },
      ]);
      prisma.liveBooking.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1" },
        { sessionId: "s1", studentId: "stu2" },
      ]);
      prisma.liveAttendance.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", status: "COMPLETED" },
        { sessionId: "s1", studentId: "stu2", status: "LEFT_EARLY" },
      ]);
      prisma.liveSession.count.mockResolvedValue(1);

      const result = (await service.getTeacherAnalytics("t1", {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as {
        totalSessions: number;
        completedSessions: number;
        upcomingSessions: number;
        totalBookings: number;
        uniqueStudents: number;
        attendanceRate: number;
      };

      expect(result.totalSessions).toBe(2);
      expect(result.completedSessions).toBe(1);
      expect(result.upcomingSessions).toBe(1);
      expect(result.totalBookings).toBe(2);
      expect(result.uniqueStudents).toBe(2);
      expect(result.attendanceRate).toBe(50);
    });
  });

  describe("getStudentAnalytics", () => {
    it("aggregates student activity", async () => {
      prisma.liveBooking.findMany.mockResolvedValue([
        { sessionId: "s1" },
        { sessionId: "s2" },
        { sessionId: "s3" },
      ]);
      prisma.liveAttendance.findMany.mockResolvedValue([
        { status: "COMPLETED" },
        { status: "COMPLETED" },
        { status: "ABSENT" },
      ]);
      prisma.liveWaitingList.count.mockResolvedValue(1);
      prisma.liveSubscription.count.mockResolvedValue(1);

      const result = (await service.getStudentAnalytics("stu1", {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as {
        totalBookings: number;
        attendedSessions: number;
        completedSessions: number;
        attendanceRate: number;
        activeSubscriptions: number;
        waitlistEntries: number;
      };

      expect(result.totalBookings).toBe(3);
      expect(result.attendedSessions).toBe(2);
      expect(result.completedSessions).toBe(2);
      expect(result.attendanceRate).toBe(66.7);
      expect(result.activeSubscriptions).toBe(1);
      expect(result.waitlistEntries).toBe(1);
    });
  });

  describe("getSessionAnalytics", () => {
    it("maps per-session metrics", async () => {
      prisma.liveSession.findMany.mockResolvedValue([
        {
          id: "s1",
          title: "Algebra",
          status: "COMPLETED",
          date: new Date(),
          startTime: new Date(),
          maxStudents: 10,
          teacherId: "t1",
          teacher: { id: "t1", fullName: "Teacher" },
        },
      ]);
      prisma.liveBooking.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1" },
        { sessionId: "s1", studentId: "stu2" },
      ]);
      prisma.liveAttendance.findMany.mockResolvedValue([
        { sessionId: "s1", studentId: "stu1", status: "COMPLETED" },
        { sessionId: "s1", studentId: "stu2", status: "ABSENT" },
      ]);

      const result = (await service.getSessionAnalytics({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      })) as Array<{
        sessionId: string;
        title: string;
        bookingCount: number;
        attendanceRate: number;
        capacityUtilization: number;
        terminal: boolean;
      }>;

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          sessionId: "s1",
          title: "Algebra",
          bookingCount: 2,
          attendanceRate: 50,
          capacityUtilization: 20,
          terminal: true,
        }),
      );
    });
  });
});

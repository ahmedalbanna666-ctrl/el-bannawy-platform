import { Test, type TestingModule } from "@nestjs/testing";
import { LiveDashboardService } from "./live-dashboard.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MEETING_PROVIDER } from "./meeting-provider/meeting-provider.interface";
import { LIVE_POLICY_ENGINE } from "./policy";

describe("LiveDashboardService", () => {
  let service: LiveDashboardService;
  let prisma: {
    notificationConfig: { count: jest.Mock };
    notificationTemplate: { count: jest.Mock };
    liveSession: { count: jest.Mock; findMany: jest.Mock };
    liveBooking: { findMany: jest.Mock; count: jest.Mock };
    liveWaitingList: { count: jest.Mock };
    liveSubscription: { count: jest.Mock };
    user: { count: jest.Mock };
  };
  let notifications: { getAnalytics: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notificationConfig: { count: jest.fn() },
      notificationTemplate: { count: jest.fn() },
      liveSession: { count: jest.fn(), findMany: jest.fn() },
      liveBooking: { findMany: jest.fn(), count: jest.fn() },
      liveWaitingList: { count: jest.fn() },
      liveSubscription: { count: jest.fn() },
      user: { count: jest.fn() },
    };
    notifications = { getAnalytics: jest.fn().mockResolvedValue({ totalSent: 10, readRate: 50 }) };

    const provider = {
      id: "ZOOM_SDK",
      isConfigured: jest.fn().mockReturnValue(true),
      isRestConfigured: jest.fn().mockReturnValue(false),
      getSdkKey: jest.fn().mockReturnValue("sdk-key"),
    };
    const policy = {
      getSessionConsumptionTiming: jest.fn().mockReturnValue("CONSUME_ON_BOOKING"),
      getCancellationRefundPolicy: jest.fn().mockReturnValue({ cutoffHours: 24 }),
      getAttendancePolicy: jest.fn().mockReturnValue({ minCompletedMinutes: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveDashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: MEETING_PROVIDER, useValue: provider },
        { provide: LIVE_POLICY_ENGINE, useValue: policy },
      ],
    }).compile();

    service = module.get<LiveDashboardService>(LiveDashboardService);
  });

  describe("getAdminStatus", () => {
    it("returns provider, policy and notification status", async () => {
      prisma.notificationConfig.count.mockResolvedValue(8);
      prisma.notificationTemplate.count.mockResolvedValue(8);

      const result = (await service.getAdminStatus()) as {
        meetingProvider: { configured: boolean; restConfigured: boolean; sdkKeyConfigured: boolean };
        policies: { sessionConsumptionTiming: string };
        notifications: { configsCount: number; templatesCount: number };
      };

      expect(result.meetingProvider.configured).toBe(true);
      expect(result.meetingProvider.restConfigured).toBe(false);
      expect(result.meetingProvider.sdkKeyConfigured).toBe(true);
      expect(result.policies.sessionConsumptionTiming).toBe("CONSUME_ON_BOOKING");
      expect(result.notifications.configsCount).toBe(8);
      expect(result.notifications.templatesCount).toBe(8);
    });
  });

  describe("getTeacherKpis", () => {
    it("aggregates teacher dashboard KPIs", async () => {
      prisma.liveSession.count.mockResolvedValue(4);
      prisma.liveBooking.findMany.mockResolvedValue([
        { id: "b1", sessionId: "s1", studentId: "stu1" },
        { id: "b2", sessionId: "s1", studentId: "stu2" },
        { id: "b3", sessionId: "s2", studentId: "stu1" },
      ]);
      prisma.liveWaitingList.count.mockResolvedValue(3);
      prisma.liveBooking.count.mockResolvedValue(1);

      const result = (await service.getTeacherKpis("t1")) as {
        totalSessions: number;
        totalBookings: number;
        uniqueStudents: number;
        waitlistEntries: number;
        pendingRescheduleRequests: number;
      };

      expect(result.totalSessions).toBe(4);
      expect(result.totalBookings).toBe(3);
      expect(result.uniqueStudents).toBe(2);
      expect(result.waitlistEntries).toBe(3);
      expect(result.pendingRescheduleRequests).toBe(1);
    });
  });

  describe("getSecretaryOverview", () => {
    it("returns read-only operational counts", async () => {
      prisma.liveSession.count.mockResolvedValue(2);
      prisma.liveSubscription.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(50);
      prisma.liveWaitingList.count.mockResolvedValue(4);
      prisma.liveSession.findMany.mockResolvedValue([
        { id: "s1", teacher: { id: "t1", fullName: "Teacher" }, _count: { bookings: 3 } },
      ]);

      const result = (await service.getSecretaryOverview()) as {
        todayLiveClasses: number;
        upcomingLiveClasses: number;
        activeSubscriptions: number;
        totalStudents: number;
        waitlistEntries: number;
        recentSessions: unknown[];
      };

      expect(result.todayLiveClasses).toBe(2);
      expect(result.upcomingLiveClasses).toBe(2);
      expect(result.activeSubscriptions).toBe(10);
      expect(result.totalStudents).toBe(50);
      expect(result.waitlistEntries).toBe(4);
      expect(result.recentSessions).toHaveLength(1);
    });
  });
});

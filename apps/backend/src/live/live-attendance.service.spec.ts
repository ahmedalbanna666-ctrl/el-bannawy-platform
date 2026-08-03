import { Test, type TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { LiveAttendanceService } from "./live-attendance.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveAccessService } from "./live-access.service";
import { LiveSubscriptionService } from "./live-subscription.service";
import {
  MEETING_PROVIDER,
} from "./meeting-provider/meeting-provider.interface";
import { ConfigurationService } from "../config/configuration.service";
import { LIVE_POLICY_ENGINE, type LivePolicyEngine } from "./policy";
import { LIVE_DOMAIN_EVENT_BUS } from "./events";
import { LiveAttendanceStatusEnum } from "@el-bannawy/shared";

describe("LiveAttendanceService (attendance engine)", () => {
  let service: LiveAttendanceService;
  let prisma: {
    liveAttendance: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    liveSession: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
    liveBooking: { findFirst: jest.Mock };
  };
  let events: { publish: jest.Mock };
  let access: { assertSessionOwner: jest.Mock };
  let subscriptions: { hasAnyActiveSubscription: jest.Mock };
  let zoom: { generateJoinConfig: jest.Mock };
  let config: { app: { frontendUrl: string } };

  beforeEach(async () => {
    prisma = {
      liveAttendance: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      liveSession: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
      liveBooking: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    access = { assertSessionOwner: jest.fn() };
    subscriptions = { hasAnyActiveSubscription: jest.fn().mockResolvedValue(true) };
    zoom = { generateJoinConfig: jest.fn() };
    config = { app: { frontendUrl: "https://platform.test" } };

    const policy: LivePolicyEngine = {
      getSessionConsumptionTiming: () => "CONSUME_ON_BOOKING",
      getCancellationRefundPolicy: () => ({
        cutoffHours: 24,
        beforeCutoff: "FULL_CREDIT",
        afterCutoff: "NO_CREDIT",
        afterStart: "NO_CREDIT",
      }),
      getAttendancePolicy: () => ({ minCompletedMinutes: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveAttendanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveAccessService, useValue: access },
        { provide: LiveSubscriptionService, useValue: subscriptions },
        { provide: MEETING_PROVIDER, useValue: zoom },
        { provide: ConfigurationService, useValue: config },
        { provide: LIVE_POLICY_ENGINE, useValue: policy },
        { provide: LIVE_DOMAIN_EVENT_BUS, useValue: events },
      ],
    }).compile();
    service = module.get<LiveAttendanceService>(LiveAttendanceService);
  });

  describe("recordAttendance", () => {
    it("upserts and publishes attendance.recorded", async () => {
      prisma.liveSession.findFirst.mockResolvedValue({
        id: "s1",
        teacherId: "teacher-1",
      });
      prisma.liveAttendance.upsert.mockResolvedValue({
        id: "att-1",
        status: LiveAttendanceStatusEnum.JOINED,
      });

      const result = await service.recordAttendance({
        sessionId: "s1",
        studentId: "u1",
        status: LiveAttendanceStatusEnum.JOINED,
        markedById: "teacher-1",
        role: "TEACHER",
      });

      expect(result).toEqual({ id: "att-1", status: "JOINED" });
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "attendance.recorded",
          aggregateId: "att-1",
          payload: expect.objectContaining({
            sessionId: "s1",
            studentId: "u1",
            markedBy: "teacher-1",
          }),
        }),
      );
    });
  });

  describe("requestLeave (policy-driven finalization)", () => {
    it("marks COMPLETED when duration meets the policy threshold", async () => {
      const joinedAt = new Date(Date.now() - 45 * 60 * 1000);
      prisma.liveAttendance.findUnique.mockResolvedValue({
        id: "att-1",
        joinedAt,
      });
      prisma.liveAttendance.update.mockResolvedValue({
        id: "att-1",
        status: LiveAttendanceStatusEnum.COMPLETED,
        durationMinutes: 45,
      });

      const result = (await service.requestLeave("s1", "u1")) as { status: string; durationMinutes: number };

      expect(result.status).toBe(LiveAttendanceStatusEnum.COMPLETED);
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "attendance.finalized",
          payload: expect.objectContaining({
            status: LiveAttendanceStatusEnum.COMPLETED,
            durationMinutes: 45,
          }),
        }),
      );
    });

    it("marks LEFT_EARLY when duration is below the policy threshold", async () => {
      const joinedAt = new Date(Date.now() - 5 * 60 * 1000);
      prisma.liveAttendance.findUnique.mockResolvedValue({
        id: "att-1",
        joinedAt,
      });
      prisma.liveAttendance.update.mockResolvedValue({
        id: "att-1",
        status: LiveAttendanceStatusEnum.LEFT_EARLY,
        durationMinutes: 5,
      });

      const result = (await service.requestLeave("s1", "u1")) as { status: string };

      expect(result.status).toBe(LiveAttendanceStatusEnum.LEFT_EARLY);
    });

    it("throws when no attendance record exists", async () => {
      prisma.liveAttendance.findUnique.mockResolvedValue(null);
      await expect(service.requestLeave("s1", "u1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getSessionAttendance", () => {
    it("throws when the session is missing", async () => {
      prisma.liveSession.findFirst.mockResolvedValue(null);
      await expect(service.getSessionAttendance("s1", "u1", "TEACHER")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

import { Test, type TestingModule } from "@nestjs/testing";
import { LiveNotificationService } from "./live-notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  LIVE_DOMAIN_EVENT_BUS,
  LIVE_BOOKING_EVENTS,
  LIVE_SESSION_EVENTS,
  LIVE_WAITLIST_EVENTS,
  LIVE_SUBSCRIPTION_EVENTS,
  type LiveDomainEventHandler,
} from "./events";

describe("LiveNotificationService", () => {
  let service: LiveNotificationService;
  let notifications: { sendNotification: jest.Mock };
  let prisma: {
    user: { findUnique: jest.Mock };
    liveBooking: { findMany: jest.Mock };
  };
  let handlers = new Map<string, LiveDomainEventHandler>();

  beforeEach(async () => {
    handlers = new Map<string, LiveDomainEventHandler>();
    notifications = { sendNotification: jest.fn().mockResolvedValue({ sent: 1 }) };
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ fullName: "Student Name" }) },
      liveBooking: { findMany: jest.fn().mockResolvedValue([{ studentId: "stu1" }]) },
    };

    const bus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn((type: string, handler: LiveDomainEventHandler) => {
        handlers.set(type, handler);
        return { unsubscribe: jest.fn() };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveNotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: LIVE_DOMAIN_EVENT_BUS, useValue: bus },
      ],
    }).compile();

    service = module.get<LiveNotificationService>(LiveNotificationService);
    await service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it("subscribes to lifecycle events", () => {
    expect(handlers.size).toBeGreaterThanOrEqual(10);
    for (const type of [
      LIVE_BOOKING_EVENTS.CREATED,
      LIVE_BOOKING_EVENTS.CANCELLED,
      LIVE_BOOKING_EVENTS.RESCHEDULE_REQUESTED,
      LIVE_BOOKING_EVENTS.RESCHEDULE_RESOLVED,
      LIVE_SESSION_EVENTS.STARTED,
      LIVE_SESSION_EVENTS.ENDED,
      LIVE_SESSION_EVENTS.CANCELLED,
      LIVE_WAITLIST_EVENTS.JOINED,
      LIVE_WAITLIST_EVENTS.PROMOTED,
      LIVE_SUBSCRIPTION_EVENTS.CREATED,
    ]) {
      expect(handlers.has(type)).toBe(true);
    }
  });

  describe("booking.created", () => {
    it("notifies teacher and student", async () => {
      await handlers.get(LIVE_BOOKING_EVENTS.CREATED)!({
        type: LIVE_BOOKING_EVENTS.CREATED,
        aggregateId: "b1",
        occurredAt: new Date(),
        payload: {
          bookingId: "b1",
          sessionId: "s1",
          sessionTitle: "Algebra",
          teacherId: "t1",
          studentId: "stu1",
          sessionStartTime: new Date(),
          bookingKind: "PRIVATE_MONTHLY",
        },
      });

      expect(notifications.sendNotification).toHaveBeenCalledTimes(2);
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ targetId: "t1" }),
      );
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        "stu1",
        expect.objectContaining({ targetId: "stu1", type: "live_booking_confirmation" }),
      );
    });
  });

  describe("session.started", () => {
    it("notifies every booked student", async () => {
      await handlers.get(LIVE_SESSION_EVENTS.STARTED)!({
        type: LIVE_SESSION_EVENTS.STARTED,
        aggregateId: "s1",
        occurredAt: new Date(),
        payload: { sessionId: "s1", sessionTitle: "Algebra", teacherId: "t1" },
      });

      expect(prisma.liveBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: "s1", cancelledAt: null } }),
      );
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          type: "live_session_started",
          targetId: "stu1",
          priority: "HIGH",
        }),
      );
    });
  });

  describe("waitlist.promoted", () => {
    it("notifies the promoted student and the teacher", async () => {
      await handlers.get(LIVE_WAITLIST_EVENTS.PROMOTED)!({
        type: LIVE_WAITLIST_EVENTS.PROMOTED,
        aggregateId: "w1",
        occurredAt: new Date(),
        payload: {
          waitlistId: "w1",
          bookingId: "b1",
          sessionId: "s1",
          sessionTitle: "Algebra",
          teacherId: "t1",
          studentId: "stu1",
        },
      });

      expect(notifications.sendNotification).toHaveBeenCalledTimes(2);
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        "stu1",
        expect.objectContaining({ type: "live_waitlist_update", priority: "HIGH" }),
      );
      expect(notifications.sendNotification).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ type: "live_waitlist_update" }),
      );
    });
  });
});

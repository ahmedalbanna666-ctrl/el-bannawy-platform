import { Test, type TestingModule } from "@nestjs/testing";
import { NotificationsService, DISPATCH_SCHEDULED_JOB } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { WhatsAppService } from "./whatsapp.service";
import { FcmService } from "./fcm.service";
import { BullJobQueue, SCHEDULED_NOTIFICATIONS_QUEUE } from "../scheduler";
import { NotificationChannel, NotificationPriority, NotificationTargetType } from "./dto/notification.dto";

describe("NotificationsService scheduling (M4)", () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    user: { findMany: jest.Mock; findUnique: jest.Mock };
  };
  let jobQueue: { schedule: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: { createMany: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      user: { findMany: jest.fn(), findUnique: jest.fn() },
    };
    (prisma as unknown as { $transaction: unknown }).$transaction = jest.fn(
      async (cb: (tx: typeof prisma) => unknown) => cb(prisma),
    );
    jobQueue = { schedule: jest.fn().mockResolvedValue("job1") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WhatsAppService, useValue: { sendTestMessage: jest.fn().mockResolvedValue({}) } },
        { provide: FcmService, useValue: { sendPush: jest.fn().mockResolvedValue({ success: true }) } },
        { provide: BullJobQueue, useValue: jobQueue },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe("scheduleNotification", () => {
    it("should persist scheduledAt column (no [مجدول] prefix) and enqueue delayed job", async () => {
      prisma.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });
      const scheduledAt = new Date(Date.now() + 60_000).toISOString();

      const result = (await service.scheduleNotification("sender", {
        type: "live_session_reminder",
        title: "Reminder",
        message: "Don't forget",
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.HIGH,
        targetType: NotificationTargetType.ALL_STUDENTS,
        scheduledAt,
      })) as { scheduled: boolean };

      expect(result.scheduled).toBe(true);
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            scheduledAt: expect.any(Date),
            title: "Reminder",
            channel: NotificationChannel.IN_APP,
          }),
        ]),
      });
      // No [مجدول] title prefix anywhere.
      const data = prisma.notification.createMany.mock.calls[0][0].data as Array<{ title: string }>;
      expect(data.every((n) => !n.title.includes("[مجدول]"))).toBe(true);

      expect(jobQueue.schedule).toHaveBeenCalledWith(
        SCHEDULED_NOTIFICATIONS_QUEUE,
        DISPATCH_SCHEDULED_JOB,
        expect.objectContaining({ scheduledAt, type: "live_session_reminder" }),
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe("dispatchScheduled", () => {
    it("should mark due notifications as sent (sentAt) and dispatch channel", async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: "n1", userId: "u1", title: "T", message: "M", type: "x", channel: NotificationChannel.IN_APP },
      ]);
      prisma.notification.update.mockResolvedValue({ id: "n1" });

      const result = await service.dispatchScheduled(new Date(), "x", NotificationChannel.IN_APP);

      expect(result.dispatched).toBe(1);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { sentAt: expect.any(Date) },
      });
    });

    it("should not dispatch rows already sent", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      const result = await service.dispatchScheduled(new Date());
      expect(result.dispatched).toBe(0);
    });
  });
});

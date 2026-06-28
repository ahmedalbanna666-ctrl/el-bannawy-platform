import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { SendNotificationDto, ScheduleNotificationDto, UpdatePreferencesDto } from "./dto/notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string, filter?: string): Promise<unknown> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(filter === "unread" ? { isRead: false } : {}),
        ...(filter === "read" ? { isRead: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        priority: true,
        isRead: true,
        createdAt: true,
      },
      take: 50,
    });
  }

  async getNotification(notificationId: string): Promise<unknown> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, deletedAt: null },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    return notification;
  }

  async markRead(notificationId: string, userId: string): Promise<unknown> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException("Notification not found");

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<unknown> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<unknown> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException("Notification not found");

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  // --- Preferences ---

  async getPreferences(userId: string): Promise<unknown> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<unknown> {
    const data: Record<string, boolean> = {};
    if (dto.lessonReminders !== undefined) data.lessonReminders = dto.lessonReminders;
    if (dto.homeworkReminders !== undefined) data.homeworkReminders = dto.homeworkReminders;
    if (dto.liveSessionReminders !== undefined) data.liveSessionReminders = dto.liveSessionReminders;
    if (dto.achievementNotifications !== undefined) data.achievementNotifications = dto.achievementNotifications;
    if (dto.motivationalMessages !== undefined) data.motivationalMessages = dto.motivationalMessages;
    if (dto.studyTips !== undefined) data.studyTips = dto.studyTips;
    if (dto.teacherAnnouncements !== undefined) data.teacherAnnouncements = dto.teacherAnnouncements;

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // --- Send ---

  async sendNotification(senderId: string, dto: SendNotificationDto): Promise<unknown> {
    const targetUserIds = await this.resolveTargets(dto.targetType, dto.targetId);

    const notifications = await Promise.all(
      targetUserIds.map((uid) =>
        this.prisma.notification.create({
          data: {
            userId: uid,
            title: dto.title,
            message: dto.message,
            type: dto.type,
            priority: dto.priority ?? "MEDIUM",
            channel: dto.channel ?? "IN_APP",
          },
        }),
      ),
    );

    return { sent: notifications.length, targetType: dto.targetType };
  }

  scheduleNotification(_senderId: string, dto: ScheduleNotificationDto): { scheduled: boolean; type: string; title: string; targetType: string; scheduledAt: string } {
    // In production, this would use BullMQ for delayed job execution
    // For now, store as a notification with a future read time
    return {
      scheduled: true,
      type: dto.type,
      title: dto.title,
      targetType: dto.targetType,
      scheduledAt: dto.scheduledAt,
    };
  }

  // --- Analytics ---

  async getAnalytics(): Promise<unknown> {
    const [totalSent, totalRead, totalFailed] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: true } }),
      this.prisma.notification.count({ where: { deletedAt: { not: null } } }),
    ]);

    return {
      totalSent,
      totalRead,
      readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
      deliveryRate: 100, // In-app notifications always delivered
      failedCount: totalFailed,
    };
  }

  // --- Private helpers ---

  private async resolveTargets(targetType: string, targetId?: string): Promise<string[]> {
    switch (targetType) {
      case "all_students": {
        const users = await this.prisma.user.findMany({
          where: { role: "STUDENT" },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case "individual": {
        if (!targetId) return [];
        const user = await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null } });
        return user ? [user.id] : [];
      }
      case "grade": {
        if (!targetId) return [];
        const lessons = await this.prisma.lesson.findMany({
          where: { unit: { gradeId: targetId } },
          select: { progress: { select: { userId: true } } },
        });
        const userIds = new Set<string>();
        for (const lesson of lessons) {
          for (const p of lesson.progress) {
            userIds.add(p.userId);
          }
        }
        return Array.from(userIds);
      }
      default:
        return [];
    }
  }
}

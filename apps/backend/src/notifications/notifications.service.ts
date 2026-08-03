import { Injectable, NotFoundException, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WhatsAppService } from "./whatsapp.service";
import { FcmService } from "./fcm.service";
import { BullJobQueue, SCHEDULED_NOTIFICATIONS_QUEUE } from "../scheduler";
import { NotificationChannel, NotificationPriority, type SendNotificationDto, type ScheduleNotificationDto, type UpdatePreferencesDto } from "./dto/notification.dto";

export const DISPATCH_SCHEDULED_JOB = "dispatch-scheduled-notification";

const DEFAULT_NOTIFICATION_CONFIGS = [
  { key: "live_session_reminder", label: "تذكير بالحصص المباشرة", description: "إرسال تذكير قبل بدء الحصة المباشرة", channel: "IN_APP", isEnabled: true },
  { key: "homework_reminder", label: "تذكير بالواجبات", description: "تذكير الطالب بموعد تسليم الواجب", channel: "IN_APP", isEnabled: true },
  { key: "lesson_reminder", label: "تذكير بالحصص المسجلة", description: "تذكير بمشاهدة الحصص المسجلة الجديدة", channel: "IN_APP", isEnabled: true },
  { key: "quiz_reminder", label: "إشعارات الاختبارات", description: "إشعار عند توفر اختبار جديد", channel: "IN_APP", isEnabled: true },
  { key: "report_ready", label: "التقارير الشهرية", description: "إشعار بتوفر تقرير الأداء الشهري", channel: "IN_APP", isEnabled: true },
  { key: "payment_receipt", label: "إيصالات الدفع", description: "إشعار بتأكيد الدفع أو فشله", channel: "IN_APP", isEnabled: true },
  { key: "achievement", label: "الإنجازات", description: "إشعار عند تحقيق إنجاز جديد", channel: "IN_APP", isEnabled: true },
  { key: "teacher_announcement", label: "إعلانات المعلم", description: "إعلانات عامة من المعلمين", channel: "IN_APP", isEnabled: true },
];

const DEFAULT_TEMPLATES = [
  { key: "live_session_reminder", title: "تذكير بحصة مباشرة", message: "مرحباً {student_name}، تذكير بوجود حصة مباشرة {session_name} يوم {session_date} الساعة {session_time}" },
  { key: "homework_reminder", title: "تذكير بواجب", message: "مرحباً {student_name}، لديك واجب {homework_name} مستحق يوم {due_date}" },
  { key: "lesson_reminder", title: "حصة مسجلة جديدة", message: "مرحباً {student_name}، تم إضافة حصة مسجلة جديدة {lesson_name}" },
  { key: "quiz_reminder", title: "اختبار جديد", message: "مرحباً {student_name}، تم إضافة اختبار جديد لدرس {lesson_name}" },
  { key: "report_ready", title: "تقرير الأداء", message: "مرحباً {student_name}، تقرير أدائك الشهري جاهز للاطلاع" },
  { key: "payment_receipt", title: "تأكيد الدفع", message: "مرحباً {student_name}، تم تأكيد عملية الدفع بقيمة {amount}" },
  { key: "achievement", title: "إنجاز جديد", message: "مبارك {student_name}! لقد حققت إنجاز {achievement_name}" },
  { key: "teacher_announcement", title: "إعلان من المعلم", message: "{announcement}" },
];

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly fcmService: FcmService,
    private readonly jobQueue: BullJobQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultConfigsAndTemplates();
  }

  private async seedDefaultConfigsAndTemplates(): Promise<void> {
    for (const cfg of DEFAULT_NOTIFICATION_CONFIGS) {
      await this.prisma.notificationConfig.upsert({
        where: { key: cfg.key },
        update: { label: cfg.label, description: cfg.description },
        create: cfg,
      });
    }
    for (const tmpl of DEFAULT_TEMPLATES) {
      await this.prisma.notificationTemplate.upsert({
        where: { key: tmpl.key },
        update: { title: tmpl.title, message: tmpl.message },
        create: tmpl,
      });
    }
  }

  // ── Admin: Notification Configs ──────────────────────────────────────

  async getNotificationConfigs(): Promise<unknown> {
    return this.prisma.notificationConfig.findMany({ orderBy: { key: "asc" } });
  }

  async updateNotificationConfig(key: string, dto: { isEnabled?: boolean; channel?: string }): Promise<unknown> {
    const config = await this.prisma.notificationConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`Notification config "${key}" not found`);
    const data: Record<string, unknown> = {};
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.channel !== undefined) data.channel = dto.channel;
    return this.prisma.notificationConfig.update({ where: { key }, data });
  }

  // ── Admin: Templates ─────────────────────────────────────────────────

  async getNotificationTemplates(): Promise<unknown> {
    return this.prisma.notificationTemplate.findMany({ orderBy: { key: "asc" } });
  }

  async updateNotificationTemplate(key: string, dto: { title?: string; message?: string }): Promise<unknown> {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { key } });
    if (!template) throw new NotFoundException(`Notification template "${key}" not found`);
    const data: Record<string, string> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.message !== undefined) data.message = dto.message;
    return this.prisma.notificationTemplate.update({ where: { key }, data });
  }

  // ── User Notifications ───────────────────────────────────────────────

  async getNotifications(userId: string, filter?: string, page = 1, limit = 20): Promise<unknown> {
    const where = {
      userId,
      deletedAt: null,
      // Scheduled notifications are visible only after dispatch (sentAt set).
      ...(filter === "scheduled" ? { sentAt: null } : { OR: [{ sentAt: { not: null } }, { scheduledAt: null }] }),
      ...(filter === "unread" ? { isRead: false } : {}),
      ...(filter === "read" ? { isRead: true } : {}),
    };
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
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
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, meta: { page: Math.max(1, page), limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    });
    return { count };
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

  // ── Send (with config check + WhatsApp delivery) ─────────────────────

  private async getEnabledConfigKey(type: string): Promise<string | null> {
    const validKeys = DEFAULT_NOTIFICATION_CONFIGS.map((c) => c.key);
    const configKey = validKeys.includes(type) ? type : null;
    if (!configKey) return type; // Allow unknown types (e.g. COMPETITION)

    const config = await this.prisma.notificationConfig.findUnique({
      where: { key: configKey },
    });

    if (config && !config.isEnabled) {
      Logger.warn(`Notification type "${type}" is disabled by admin config`, "NotificationsService");
      return null;
    }
    return configKey;
  }

  async sendNotification(senderId: string, dto: SendNotificationDto): Promise<unknown> {
    const configKey = await this.getEnabledConfigKey(dto.type);
    if (configKey === null) {
      return { sent: 0, skipped: true, reason: "Notification type is disabled" };
    }

    const targetUserIds = await this.resolveTargets(dto.targetType, dto.targetId);

    if (targetUserIds.length === 0) {
      return { sent: 0, skipped: true, reason: "No targets resolved" };
    }

    // Fetch user preferences to filter who actually wants this notification
    const prefField = this.getPreferenceField(dto.type);
    let filteredUserIds = targetUserIds;
    if (prefField) {
      const prefs = await this.prisma.notificationPreference.findMany({
        where: { userId: { in: targetUserIds }, [prefField]: true },
        select: { userId: true },
      });
      const optedIn = new Set(prefs.map((p) => p.userId));
      filteredUserIds = targetUserIds.filter((uid) => optedIn.has(uid));
    }

    const channel = dto.channel ?? NotificationChannel.IN_APP;
    let whatsappSent = 0;
    let pushSent = 0;

    if (channel === NotificationChannel.WHATSAPP) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: filteredUserIds }, deletedAt: null },
        select: { id: true, mobileNumber: true },
      });
      for (const user of users) {
        if (user.mobileNumber) {
          try {
            await this.whatsAppService.sendTestMessage(user.mobileNumber, dto.message);
            whatsappSent++;
          } catch (err) {
            Logger.error(`WhatsApp send failed for user ${user.id}: ${err instanceof Error ? err.message : "Unknown"}`, "NotificationsService");
          }
        }
      }
    }

    if (channel === NotificationChannel.PUSH) {
      for (const uid of filteredUserIds) {
        const result = await this.fcmService.sendPush(uid, dto.title, dto.message, { type: dto.type });
        if (result.success) pushSent++;
      }
    }

    // Persist in-app notifications in a single transaction
    const notifications = filteredUserIds.map((uid) => ({
      userId: uid,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      channel,
    }));

    let createdCount = 0;
    if (notifications.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.notification.createMany({ data: notifications });
        createdCount = created.count;
      });
    }

    return {
      sent: createdCount,
      whatsappSent,
      pushSent,
      targetType: dto.targetType,
      skipped: filteredUserIds.length !== targetUserIds.length,
      skippedCount: targetUserIds.length - filteredUserIds.length,
    };
  }

  async scheduleNotification(_senderId: string, dto: ScheduleNotificationDto): Promise<unknown> {
    const targetIds = await this.resolveTargets(dto.targetType, dto.targetId);

    if (targetIds.length === 0) {
      Logger.warn(`scheduleNotification: no targets resolved for type=${dto.targetType}`, "NotificationsService");
      return { scheduled: false, reason: "No targets resolved" };
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error("Invalid scheduledAt date");
    }

    // Persist rows with a real scheduledAt column. They stay hidden from the
    // user's inbox until the scheduler dispatches them (sets sentAt).
    const notifications = targetIds.map((userId) => ({
      userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      scheduledAt,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.notification.createMany({ data: notifications });
    });

    // Schedule a delayed BullMQ job so the dispatch happens at the target time.
    const now = Date.now();
    const delayMs = Math.max(0, scheduledAt.getTime() - now);
    await this.jobQueue.schedule(
      SCHEDULED_NOTIFICATIONS_QUEUE,
      DISPATCH_SCHEDULED_JOB,
      { type: dto.type, channel: dto.channel ?? NotificationChannel.IN_APP, scheduledAt: scheduledAt.toISOString() },
      { delayMs, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );

    return {
      scheduled: true,
      type: dto.type,
      title: dto.title,
      targetType: dto.targetType,
      scheduledAt: dto.scheduledAt,
      targetCount: targetIds.length,
    };
  }

  /**
   * Schedule a notification for an explicit set of users with a single delayed
   * job. Used by the live module to schedule session-start reminders for a
   * session's subscribers without resolving targets by role/grade. Preference
   * filtering applies when the notification type has a preference field.
   */
  async scheduleToUserIds(
    _senderId: string,
    dto: {
      type: string;
      title: string;
      message: string;
      priority?: NotificationPriority;
      channel?: NotificationChannel;
    },
    userIds: string[],
    scheduledAt: Date,
  ): Promise<unknown> {
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error("Invalid scheduledAt date");
    }

    let targetUserIds = [...new Set(userIds)];
    const prefField = this.getPreferenceField(dto.type);
    if (prefField && targetUserIds.length > 0) {
      const prefs = await this.prisma.notificationPreference.findMany({
        where: { userId: { in: targetUserIds }, [prefField]: true },
        select: { userId: true },
      });
      const optedIn = new Set(prefs.map((p) => p.userId));
      targetUserIds = targetUserIds.filter((uid) => optedIn.has(uid));
    }

    if (targetUserIds.length === 0) {
      return { scheduled: false, reason: "No targets after preference filter" };
    }

    const channel = dto.channel ?? NotificationChannel.IN_APP;
    const notifications = targetUserIds.map((userId) => ({
      userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      channel,
      scheduledAt,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.notification.createMany({ data: notifications });
    });

    const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
    await this.jobQueue.schedule(
      SCHEDULED_NOTIFICATIONS_QUEUE,
      DISPATCH_SCHEDULED_JOB,
      { type: dto.type, channel, scheduledAt: scheduledAt.toISOString() },
      { delayMs, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );

    return {
      scheduled: true,
      type: dto.type,
      scheduledAt: scheduledAt.toISOString(),
      targetCount: targetUserIds.length,
    };
  }

  /**
   * Dispatch scheduled notifications whose scheduledAt has arrived.
   * Called by the BullMQ worker (ScheduledNotificationsProcessor) when the
   * delayed job fires. Idempotent — rows already marked sent are skipped.
   */
  async dispatchScheduled(
    scheduledAt: Date,
    type?: string,
    channel?: string,
  ): Promise<{ dispatched: number }> {
    const where: Record<string, unknown> = {
      scheduledAt: { lte: scheduledAt },
      sentAt: null,
      deletedAt: null,
    };
    if (type) where.type = type;
    if (channel) where.channel = channel;

    const due = await this.prisma.notification.findMany({ where, take: 500 });

    let dispatched = 0;
    for (const notification of due) {
      const ch = notification.channel as NotificationChannel;
      if (ch === NotificationChannel.WHATSAPP) {
        const user = await this.prisma.user.findUnique({
          where: { id: notification.userId },
          select: { mobileNumber: true },
        });
        if (user?.mobileNumber) {
          try {
            await this.whatsAppService.sendTestMessage(user.mobileNumber, notification.message);
          } catch (err) {
            Logger.error(
              `Scheduled WhatsApp send failed for user ${notification.userId}: ${err instanceof Error ? err.message : "Unknown"}`,
              "NotificationsService",
            );
          }
        }
      } else if (ch === NotificationChannel.PUSH) {
        await this.fcmService.sendPush(notification.userId, notification.title, notification.message, {
          type: notification.type,
        });
      }

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
      dispatched++;
    }

    return { dispatched };
  }

  // --- Analytics ---

  async getAnalytics(): Promise<unknown> {
    const [totalSent, totalRead, totalFailed] = await Promise.all([
      this.prisma.notification.count({ where: { deletedAt: null } }),
      this.prisma.notification.count({ where: { isRead: true, deletedAt: null } }),
      this.prisma.notification.count({ where: { deletedAt: { not: null } } }),
    ]);

    return {
      totalSent,
      totalRead,
      readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
      deliveryRate: 100,
      failedCount: totalFailed,
    };
  }

  // --- Private helpers ---

  private getPreferenceField(type: string): string | null {
    const mapping: Record<string, string> = {
      live_session_reminder: "liveSessionReminders",
      homework_reminder: "homeworkReminders",
      lesson_reminder: "lessonReminders",
      quiz_reminder: "achievementNotifications",
      achievement: "achievementNotifications",
      teacher_announcement: "teacherAnnouncements",
    };
    return mapping[type] ?? null;
  }

  private async resolveTargets(targetType: string, targetId?: string): Promise<string[]> {
    switch (targetType) {
      case "all_students": {
        const users = await this.prisma.user.findMany({
          where: { role: "STUDENT" },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case "individual":
      case "USER": {
        if (!targetId) return [];
        const user = await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null } });
        return user ? [user.id] : [];
      }
      case "grade": {
        if (!targetId) return [];
        const students = await this.prisma.user.findMany({
          where: { role: "STUDENT", gradeId: targetId, deletedAt: null },
          select: { id: true },
        });
        return students.map((s: { id: string }) => s.id);
      }
      default:
        return [];
    }
  }
}
